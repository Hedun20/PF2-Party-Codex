import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { MongoClient, ObjectId } from "mongodb";
import { config } from "../src/config.js";
import { DEMO_ARTICLES, DEMO_THAUMATURGE } from "./demoCampaignData.mjs";
import { linkDemoArticles } from "./demoCampaignRelations.mjs";
import {
  managerCampaignIdsForUser,
  mergeCampaignCandidates
} from "./demoCampaignTargeting.mjs";

const confirmation = String(process.env.DEMO_SEED_CONFIRM || "");
const requestedCampaignId = String(process.env.DEMO_CAMPAIGN_ID || "").trim();
const ownerEmail = String(process.env.DEMO_OWNER_EMAIL || process.env.DEV_OWNER_EMAIL || "").trim().toLowerCase();
const campaignName = String(process.env.DEMO_CAMPAIGN_NAME || process.env.DEV_CAMPAIGN_NAME || "").trim();
const linkedDemoArticles = linkDemoArticles(DEMO_ARTICLES);

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
  throw new Error("Set DEMO_CAMPAIGN_ID or DEMO_OWNER_EMAIL. The seed will not list unrelated campaigns without an account selector.");
}

function now() {
  return new Date().toISOString();
}

function asObjectId(value, label) {
  if (!ObjectId.isValid(String(value || ""))) throw new Error(`${label} must be a valid Mongo ObjectId.`);
  return new ObjectId(String(value));
}

function mongoKeys(values = []) {
  const source = Array.isArray(values) ? values : [values];
  const result = [];
  const seen = new Set();

  for (const value of source) {
    if (value === undefined || value === null || value === "") continue;
    const stringValue = String(value);
    const stringKey = `string:${stringValue}`;
    if (!seen.has(stringKey)) {
      seen.add(stringKey);
      result.push(stringValue);
    }
    if (ObjectId.isValid(stringValue)) {
      const objectKey = `objectId:${stringValue}`;
      if (!seen.has(objectKey)) {
        seen.add(objectKey);
        result.push(new ObjectId(stringValue));
      }
    }
  }

  return result;
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

async function ownerEmailMap(db, campaigns) {
  const ownerIds = [...new Set(campaigns.map((campaign) => String(campaign.ownerUserId || "")).filter(Boolean))];
  if (!ownerIds.length) return new Map();
  const users = await db.collection("users").find({
    _id: { $in: mongoKeys(ownerIds) }
  }).project({ email: 1 }).toArray();
  return new Map(users.map((user) => [String(user._id), user.email || "unknown-owner"]));
}

async function selectCampaignInteractively(db, campaigns, selectedAccountEmail = "") {
  if (campaigns.length === 1) return campaigns[0];

  const emailByOwnerId = await ownerEmailMap(db, campaigns);
  const options = campaigns.map((campaign, index) => ({
    index: index + 1,
    campaign,
    ownerEmail: emailByOwnerId.get(String(campaign.ownerUserId || "")) || selectedAccountEmail || "unknown-owner"
  }));

  console.log(`\nMore than one GM campaign is available for ${selectedAccountEmail || "the selected account"}:\n`);
  for (const option of options) {
    console.log(`${option.index}. ${option.campaign.name || "Unnamed campaign"} · ${option.ownerEmail} · ${option.campaign._id}`);
  }

  if (!input.isTTY || !output.isTTY) {
    throw new Error("More than one matching campaign is available. Re-run with DEMO_CAMPAIGN_ID or DEMO_CAMPAIGN_NAME.");
  }

  const readline = createInterface({ input, output });
  try {
    while (true) {
      const answer = String(await readline.question(`\nCampaign number (1-${options.length}): `)).trim();
      const selected = Number(answer);
      if (Number.isInteger(selected) && selected >= 1 && selected <= options.length) {
        return options[selected - 1].campaign;
      }
      console.log("Enter one of the campaign numbers shown above.");
    }
  } finally {
    readline.close();
  }
}

async function campaignsForManagerAccount(db, user) {
  const userKeys = mongoKeys(user._id);
  const memberships = await db.collection("memberships").find({
    userId: { $in: userKeys },
    status: "active",
    role: { $in: ["owner", "gm"] }
  }).toArray();
  const membershipCampaignIds = managerCampaignIdsForUser(memberships, user._id);
  const membershipCampaignKeys = mongoKeys(membershipCampaignIds);

  const [ownedCampaigns, membershipCampaigns] = await Promise.all([
    db.collection("campaigns").find({ ownerUserId: { $in: userKeys } }).toArray(),
    membershipCampaignKeys.length
      ? db.collection("campaigns").find({ _id: { $in: membershipCampaignKeys } }).toArray()
      : []
  ]);

  return mergeCampaignCandidates(ownedCampaigns, membershipCampaigns);
}

async function resolveCampaign(db) {
  const campaigns = db.collection("campaigns");

  if (requestedCampaignId) {
    const campaign = await campaigns.findOne({ _id: asObjectId(requestedCampaignId, "DEMO_CAMPAIGN_ID") });
    if (!campaign) throw new Error("DEMO_CAMPAIGN_ID does not match a campaign in the configured database.");
    return campaign;
  }

  const user = await db.collection("users").findOne({ email: ownerEmail });
  if (!user) throw new Error(`No Party Codex user found for ${ownerEmail}. Check the account email shown in the app.`);

  let matches = await campaignsForManagerAccount(db, user);
  if (campaignName) matches = matches.filter((campaign) => campaign.name === campaignName);
  matches.sort((left, right) => String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || "")));

  if (!matches.length) {
    throw new Error(`No active owner/GM campaign was found for ${ownerEmail}${campaignName ? ` with name ${campaignName}` : ""}.`);
  }

  return selectCampaignInteractively(db, matches, ownerEmail);
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

  for (const article of linkedDemoArticles) {
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
    accountEmail: ownerEmail || "selected-by-campaign-id",
    campaignId: campaignId.toString(),
    campaignName: campaign.name,
    articles: { total: linkedDemoArticles.length, created: articleCreated, updated: articleUpdated },
    character: { name: DEMO_THAUMATURGE.identity.name, action: characterAction }
  });
} finally {
  await client.close();
}
