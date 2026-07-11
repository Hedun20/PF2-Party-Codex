import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(serverDir, "../..");

for (const envPath of [path.join(rootDir, ".env"), path.join(serverDir, ".env")]) {
  dotenv.config({ path: envPath, quiet: true });
}

const database = process.env.MONGO_DB_NAME || "pf2_party_codex";
const mongoUri = process.env.MONGO_URI || "";
const dataDir = process.env.DATA_DIR || path.join(rootDir, "data");
const usersFile = path.join(dataDir, "users.json");
const defaultCampaignName = "PF2 Party Codex";
const defaultWorkspaceName = "PF2 Party Codex Workspace";

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function sanitizeMongoError(error) {
  const message = String(error?.message || error || "Mongo auth migration failed.");
  return message
    .replace(/mongodb(?:\+srv)?:\/\/([^:@/]+):([^@/]+)@/gi, "mongodb://$1:<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>");
}

async function readJson(file, fallback) {
  try {
    return JSON.parse((await fs.readFile(file, "utf8")).replace(/^\\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

function mongoRoleForLegacy(user, index) {
  if (index === 0 || user.role === "owner") return "owner";
  if (user.role === "gm") return "gm";
  return "player";
}

async function main() {
  if (!mongoUri) throw new Error("MONGO_URI is not configured.");

  const report = {
    usersFound: 0,
    usersInserted: 0,
    usersSkipped: 0,
    campaignCreated: false,
    campaignFound: false,
    workspaceCreated: false,
    workspaceFound: false,
    membershipsCreated: 0,
    membershipsSkipped: 0,
    warnings: []
  };

  const legacyUsers = await readJson(usersFile, []);
  report.usersFound = Array.isArray(legacyUsers) ? legacyUsers.length : 0;
  if (!Array.isArray(legacyUsers)) throw new Error("Legacy users.json is not an array.");

  const client = new MongoClient(mongoUri, {
    appName: "pf2-party-codex-auth-migration",
    serverSelectionTimeoutMS: 10000
  });

  try {
    await client.connect();
    const db = client.db(database);
    const users = db.collection("users");
    const workspaces = db.collection("workspaces");
    const campaigns = db.collection("campaigns");
    const memberships = db.collection("memberships");

    await users.createIndex({ email: 1 }, { unique: true });
    await workspaces.createIndex({ ownerUserId: 1, status: 1 });
    await workspaces.createIndex({ name: 1 });
    await campaigns.createIndex({ workspaceId: 1, ownerUserId: 1 });
    await campaigns.createIndex({ ownerUserId: 1 });
    await memberships.createIndex({ userId: 1, campaignId: 1 }, { unique: true });
    await memberships.createIndex({ workspaceId: 1, campaignId: 1, userId: 1 });
    await memberships.createIndex({ campaignId: 1, role: 1 });
    await db.collection("auditLogs").createIndex({ campaignId: 1, createdAt: -1 });

    const stamp = new Date().toISOString();
    let firstOwnerUser = null;
    const migrated = [];

    for (let index = 0; index < legacyUsers.length; index += 1) {
      const legacy = legacyUsers[index];
      const email = normalizeEmail(legacy.email);
      if (!email) {
        report.warnings.push(`Skipped user at index ${index}: missing email.`);
        continue;
      }

      let user = await users.findOne({ email });
      if (user) {
        report.usersSkipped += 1;
      } else {
        const document = {
          email,
          passwordHash: legacy.passwordHash || "",
          passwordSalt: legacy.passwordSalt || "",
          name: legacy.name || email.split("@")[0],
          emailVerified: Boolean(legacy.emailVerified),
          emailVerifiedAt: legacy.emailVerifiedAt || "",
          emailVerifyTokenHash: legacy.emailVerifyTokenHash || "",
          emailVerifyTokenExpiresAt: legacy.emailVerifyTokenExpiresAt || "",
          status: legacy.status || "active",
          sessionVersion: Number(legacy.sessionVersion || 1),
          legacyUserId: legacy.id || "",
          createdAt: legacy.createdAt || stamp,
          updatedAt: legacy.updatedAt || stamp
        };
        const result = await users.insertOne(document);
        user = { ...document, _id: result.insertedId };
        report.usersInserted += 1;
      }

      if (!firstOwnerUser && (index === 0 || legacy.role === "gm" || legacy.role === "owner")) firstOwnerUser = user;
      migrated.push({ legacy, user, role: mongoRoleForLegacy(legacy, index) });
    }


    const owner = firstOwnerUser || migrated[0]?.user;
    let workspace = await workspaces.findOne({ name: defaultWorkspaceName });
    if (workspace) {
      report.workspaceFound = true;
      await workspaces.updateOne(
        { _id: workspace._id },
        { $set: { ownerUserId: workspace.ownerUserId || owner?._id || null, updatedAt: stamp } }
      );
      workspace = await workspaces.findOne({ _id: workspace._id });
    } else {
      const document = {
        name: defaultWorkspaceName,
        ownerUserId: owner?._id || null,
        status: "active",
        plan: "development",
        subscriptionStatus: "active",
        settings: { billingEnabled: false },
        createdAt: stamp,
        updatedAt: stamp
      };
      const result = await workspaces.insertOne(document);
      workspace = { ...document, _id: result.insertedId };
      report.workspaceCreated = true;
    }
    let campaign = await campaigns.findOne({ name: defaultCampaignName });
    if (campaign) {
      report.campaignFound = true;
    } else {
      const owner = firstOwnerUser || migrated[0]?.user;
      const document = {
        workspaceId: workspace._id,
        name: defaultCampaignName,
        description: "Default campaign workspace created during auth migration.",
        ownerUserId: owner?._id || null,
        activeWorldId: "",
        defaultLanguage: "ru",
        settings: {
          allowPublicRegistration: false,
          requireEmailVerification: true,
          defaultPlayerVisibility: "hidden"
        },
        createdAt: stamp,
        updatedAt: stamp
      };
      const result = await campaigns.insertOne(document);
      campaign = { ...document, _id: result.insertedId };
      report.campaignCreated = true;
    }

    if (!campaign.workspaceId) {
      await campaigns.updateOne({ _id: campaign._id }, { $set: { workspaceId: workspace._id, updatedAt: stamp } });
      campaign = await campaigns.findOne({ _id: campaign._id });
    }

    for (const item of migrated) {
      const userId = item.user._id instanceof ObjectId ? item.user._id : new ObjectId(String(item.user._id));
      const existing = await memberships.findOne({ userId, campaignId: campaign._id });
      if (existing) {
        if (!existing.workspaceId) {
          await memberships.updateOne({ _id: existing._id }, { $set: { workspaceId: workspace._id, updatedAt: stamp } });
        }
        report.membershipsSkipped += 1;
        continue;
      }
      await memberships.insertOne({
        userId,
        workspaceId: workspace._id,
        campaignId: campaign._id,
        role: item.role,
        status: "active",
        displayName: item.user.name || item.user.email,
        joinedAt: stamp,
        createdAt: stamp,
        updatedAt: stamp
      });
      report.membershipsCreated += 1;
    }
  } finally {
    await client.close();
  }

  console.log("Auth migration to Mongo completed");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(`Auth migration to Mongo failed: ${sanitizeMongoError(error)}`);
  process.exit(1);
});
