import crypto from "crypto";
import { promisify } from "util";
import { MongoClient } from "mongodb";
import { config } from "../src/config.js";

const scrypt = promisify(crypto.scrypt);

const email = String(process.env.DEV_OWNER_EMAIL || "").trim().toLowerCase();
const password = String(process.env.DEV_OWNER_PASSWORD || "");
const name = String(process.env.DEV_OWNER_NAME || "").trim() || email.split("@")[0] || "Local owner";
const campaignName = String(process.env.DEV_CAMPAIGN_NAME || "Party Codex Dev Campaign").trim();
const workspaceName = String(process.env.DEV_WORKSPACE_NAME || "Party Codex Dev Workspace").trim();
const confirmation = String(process.env.DEV_OWNER_SEED_CONFIRM || "");

if (process.env.NODE_ENV === "production") {
  throw new Error("The dev owner seed is disabled when NODE_ENV=production.");
}

if (confirmation !== "CREATE_OR_UPDATE_LOCAL_OWNER") {
  throw new Error("Set DEV_OWNER_SEED_CONFIRM=CREATE_OR_UPDATE_LOCAL_OWNER before running the dev owner seed.");
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("DEV_OWNER_EMAIL must contain a valid email address.");
}

if (password.length < 12) {
  throw new Error("DEV_OWNER_PASSWORD must contain at least 12 characters.");
}

if (!config.mongoUri) {
  throw new Error("MONGO_URI is missing. Check your .env.");
}

async function hashPassword(rawPassword, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = await scrypt(String(rawPassword), salt, 64);
  return {
    salt,
    hash: hash.toString("hex")
  };
}

function now() {
  return new Date().toISOString();
}

const client = new MongoClient(config.mongoUri);

try {
  await client.connect();

  const db = client.db(config.mongoDbName);
  const users = db.collection("users");
  const workspaces = db.collection("workspaces");
  const campaigns = db.collection("campaigns");
  const memberships = db.collection("memberships");

  console.log("Connected to Mongo.");
  console.log("Database:", config.mongoDbName);

  const existingUser = await users.findOne({ email });
  const stamp = now();
  const passwordData = await hashPassword(password);
  let userId;

  if (existingUser) {
    userId = existingUser._id;
    await users.updateOne(
      { _id: userId },
      {
        $set: {
          name,
          passwordHash: passwordData.hash,
          passwordSalt: passwordData.salt,
          emailVerified: true,
          emailVerifiedAt: stamp,
          emailVerifyTokenHash: "",
          emailVerifyTokenExpiresAt: "",
          status: "active",
          updatedAt: stamp
        }
      }
    );
    console.log("Existing dev owner updated without changing userId:", userId.toString());
  } else {
    const userResult = await users.insertOne({
      email,
      name,
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      emailVerified: true,
      emailVerifiedAt: stamp,
      emailVerifyTokenHash: "",
      emailVerifyTokenExpiresAt: "",
      status: "active",
      createdAt: stamp,
      updatedAt: stamp
    });
    userId = userResult.insertedId;
    console.log("Dev owner created:", userId.toString());
  }

  let workspace = await workspaces.findOne({ name: workspaceName });

  if (!workspace) {
    const workspaceDoc = {
      name: workspaceName,
      ownerUserId: userId,
      status: "active",
      plan: "local-dev",
      settings: { billingEnabled: false },
      createdAt: stamp,
      updatedAt: stamp
    };
    const workspaceResult = await workspaces.insertOne(workspaceDoc);
    workspace = { ...workspaceDoc, _id: workspaceResult.insertedId };
    console.log("Workspace created:", workspace._id.toString());
  } else {
    await workspaces.updateOne(
      { _id: workspace._id },
      { $set: { ownerUserId: userId, updatedAt: stamp } }
    );
    workspace = await workspaces.findOne({ _id: workspace._id });
    console.log("Workspace found and owner updated:", workspace._id.toString());
  }
  let campaign = await campaigns.findOne({ name: campaignName, workspaceId: workspace._id });

  if (!campaign) {
    const campaignDoc = {
      workspaceId: workspace._id,
      name: campaignName,
      description: "Default campaign workspace.",
      ownerUserId: userId,
      activeWorldId: "",
      defaultLanguage: "ru",
      settings: {
        allowPublicRegistration: false,
        requireEmailVerification: false,
        defaultPlayerVisibility: "hidden"
      },
      createdAt: stamp,
      updatedAt: stamp
    };

    const campaignResult = await campaigns.insertOne(campaignDoc);
    campaign = {
      ...campaignDoc,
      _id: campaignResult.insertedId
    };

    console.log("Campaign created:", campaign._id.toString());
  } else {
    await campaigns.updateOne(
      { _id: campaign._id },
      {
        $set: {
          ownerUserId: userId,
          workspaceId: workspace._id,
          updatedAt: stamp
        }
      }
    );

    campaign = await campaigns.findOne({ _id: campaign._id });
    console.log("Campaign found and owner updated:", campaign._id.toString());
  }

  const membershipResult = await memberships.updateOne(
    { userId, campaignId: campaign._id },
    {
      $set: {
        workspaceId: workspace._id,
        role: "owner",
        status: "active",
        displayName: name,
        updatedAt: stamp
      },
      $setOnInsert: {
        joinedAt: stamp,
        createdAt: stamp
      }
    },
    { upsert: true }
  );
  const membership = await memberships.findOne({ userId, campaignId: campaign._id });

  console.log("Owner user created:");
  console.log({
    userId: userId.toString(),
    email,
    workspaceId: workspace._id.toString(),
    campaignId: campaign._id.toString(),
    membershipId: String(membership?._id || membershipResult.upsertedId || ""),
    role: "owner"
  });

  console.log("Done. Login credentials were read from DEV_OWNER_EMAIL and DEV_OWNER_PASSWORD.");
} finally {
  await client.close();
}
