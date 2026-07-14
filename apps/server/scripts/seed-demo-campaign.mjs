import { MongoClient, ObjectId } from "mongodb";
import { config } from "../src/config.js";
import { DEMO_ARTICLES, DEMO_THAUMATURGE } from "./demoCampaignData.mjs";

const confirmation = String(process.env.DEMO_SEED_CONFIRM || "");
const requestedCampaignId = String(process.env.DEMO_CAMPAIGN_ID || "").trim();
const ownerEmail = String(process.env.DEMO_OWNER_EMAIL || process.env.DEV_OWNER_EMAIL || "").trim().toLowerCase();
const campaignName = String(process.env.DEMO_CAMPAIGN_NAME || process.env.DEV_CAMPAIGN_NAME || "").trim();

if (config.isProduction || process.env.NODE_ENV === "production") {
  throw new Error("The demo campaign seed is disabled in production.");
}

if (confirmation !== "SEED_PARTY_CODEX_DEMO") {
  throw new Error("Set DEMO_SEED_CONFIRM=SEED_PARTY_CODEX_DEMO before running the demo seed.");
}

if (!config.mongoUri) {
  throw new Error("MONGO_URI is missing. The demo seed writes only to MongoDB.");
}

if (!requestedCampaignId && !ownerEmail) {
  throw new Error("Set DEMO_CAMPAIGN_ID or DEMO_OWNER_EMAIL (DEV_OWNER_EMAIL is also accepted) so the seed cannot target an arbitrary campaign.");
}

function now() {
  return new Date().toISOString();
}

function asObjectId(value, label) {
  if (!ObjectId.isValid(String(value || ""))) throw new Error(`${label} must be a valid Mongo ObjectId.`);
  return new ObjectId(String(value));
}

function storageVisibility(value = "public") {
  if (["gm", "gmOnly", "hidden", "needsReview"].includes(value)) return value === "gm" ? "gmOnly" : value;
  if (value === "revealed") return "revealed";
  return "public";
}

function articleDocument(article, { campaignId, userId, stamp }) {
  const visibility = storageVisibility(article.visibility);
  const frontmatter = {
    title: article.title,
    name: article.title,
    type: article.type,
    category: article.category,
    summary: article.summary,
    visibility: visibility === "gmOnly" ? "gm" : visibility,
    tags: article.tags || [],
    related: article.frontmatter?.related || [],
    world: article.world || "",
    country: article.country || "",
    city: article.city || "",
    ...(article.frontmatter || {})
  };

  return {
    campaignId,
    worldId: null,
    type: article.type,
    category: article.category,
    title: article.title,
    slug: article.path.split("/").pop().replace(/\.md$/i, ""),
    path: article.path,
    summary: article.summary,
    publicContent: article.publicContent || "",
    gmContent: article.gmContent || "",
    status: "active",
    visibility,
    tags: article.tags || [],
    aliases: [],
    metadata: {
      frontmatter,
      related: frontmatter.related,
      world: article.world || "",
      country: article.country || "",
      city: article.city || "",
      parent: "",
      mapImage: frontmatter.mapImage || "",
      avatarImage: frontmatter.avatarImage || "",
      tokenImage: frontmatter.tokenImage || "",
      handoutImage: frontmatter.handoutImage || "",
      image: frontmatter.image || "",
      pins: [],
      mapObjects: []
    },
    source: {
      kind: "demoSeed",
      seedKey: article.seedKey,
      originalPath: article.path
    },
    updatedBy: userId,
    updatedAt: stamp
  };
}

async function resolveCampaign(db) {
  const campaigns = db.collection("campaigns");
  if (requestedCampaignId) {
    const campaign = await campaigns.findOne({ _id: asObjectId(requestedCampaignId, "DEMO_CAMPAIGN_ID") });
    if (!campaign) throw new Error("DEMO_CAMPAIGN_ID does not match a campaign in the configured database.");
    return campaign;
  }

  const user = await db.collection("users").findOne({ email: ownerEmail });
  if (!user) throw new Error(`No user found for DEMO_OWNER_EMAIL=${ownerEmail}. Run the dev owner seed first.`);
  const query = { ownerUserId: user._id };
  if (campaignName) query.name = campaignName;
  const matches = await campaigns.find(query).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  if (!matches.length) throw new Error(`No campaign owned by ${ownerEmail}${campaignName ? ` with name ${campaignName}` : ""}.`);
  if (matches.length > 1 && !campaignName) {
    throw new Error(`More than one campaign is owned by ${ownerEmail}. Set DEMO_CAMPAIGN_NAME or DEMO_CAMPAIGN_ID.`);
  }
  return matches[0];
}

const client = new MongoClient(config.mongoUri);

try {
  await client.connect();
  const db = client.db(config.mongoDbName);
  const campaign = await resolveCampaign(db);
  const campaignId = campaign._id;
  const ownerUserId = campaign.ownerUserId;
  if (!ownerUserId) throw new Error("The selected campaign has no ownerUserId; demo character ownership cannot be assigned safely.");

  const stamp = now();
  const entries = db.collection("entries");
  let articleCreated = 0;
  let articleUpdated = 0;

  for (const article of DEMO_ARTICLES) {
    const document = articleDocument(article, { campaignId, userId: ownerUserId, stamp });
    const existing = await entries.findOne({
      campaignId,
      $or: [
        { "source.seedKey": article.seedKey },
        { path: article.path }
      ]
    });

    if (existing) {
      await entries.updateOne({ _id: existing._id, campaignId }, { $set: document });
      articleUpdated += 1;
    } else {
      await entries.insertOne({ ...document, createdBy: ownerUserId, createdAt: stamp });
      articleCreated += 1;
    }
  }

  const characters = db.collection("characters");
  const characterDocument = {
    campaignId,
    ownerUserId,
    source: { ...DEMO_THAUMATURGE.source, importedAt: stamp },
    identity: DEMO_THAUMATURGE.identity,
    visuals: DEMO_THAUMATURGE.visuals,
    stats: DEMO_THAUMATURGE.stats,
    combat: DEMO_THAUMATURGE.combat,
    magic: DEMO_THAUMATURGE.magic,
    progression: DEMO_THAUMATURGE.progression,
    inventory: DEMO_THAUMATURGE.inventory,
    text: DEMO_THAUMATURGE.text,
    links: DEMO_THAUMATURGE.links,
    visibility: DEMO_THAUMATURGE.visibility,
    rawImport: DEMO_THAUMATURGE.rawImport,
    updatedAt: stamp
  };
  const existingCharacter = await characters.findOne({ campaignId, "source.seedKey": DEMO_THAUMATURGE.seedKey });
  let characterAction;
  if (existingCharacter) {
    await characters.updateOne({ _id: existingCharacter._id, campaignId }, { $set: characterDocument });
    characterAction = "updated";
  } else {
    await characters.insertOne({ ...characterDocument, createdAt: stamp });
    characterAction = "created";
  }

  console.log("Party Codex demo seed completed.");
  console.log({
    database: config.mongoDbName,
    campaignId: campaignId.toString(),
    campaignName: campaign.name,
    articles: { total: DEMO_ARTICLES.length, created: articleCreated, updated: articleUpdated },
    character: { name: DEMO_THAUMATURGE.identity.name, action: characterAction }
  });
} finally {
  await client.close();
}
