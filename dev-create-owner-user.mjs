import crypto from "crypto";
import { promisify } from "util";
import { MongoClient, ObjectId } from "mongodb";
import { config } from "../src/config.js";

const scrypt = promisify(crypto.scrypt);

const email = "timurabbasovhaha@gmail.com".trim().toLowerCase();
const password = "Appolon20";
const name = "Тимур";
const campaignName = "PF2 Party Codex";

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

  const db = client.db("pf2_party_codex");
  const users = db.collection("users");
  const campaigns = db.collection("campaigns");
  const memberships = db.collection("memberships");

  console.log("Connected to Mongo.");
  console.log("Database: pf2_party_codex");

  const existingUser = await users.findOne({ email });

  if (existingUser) {
    console.log("Existing user found. Removing old user and memberships:", existingUser._id.toString());

    await memberships.deleteMany({
      $or: [
        { userId: existingUser._id },
        { userId: existingUser._id.toString() }
      ]
    });

    await users.deleteOne({ _id: existingUser._id });
  }

  const stamp = now();
  const passwordData = await hashPassword(password);

  const user = {
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
  };

  const userResult = await users.insertOne(user);
  const userId = userResult.insertedId;

  let campaign = await campaigns.findOne({ name: campaignName });

  if (!campaign) {
    const campaignDoc = {
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
          updatedAt: stamp
        }
      }
    );

    campaign = await campaigns.findOne({ _id: campaign._id });
    console.log("Campaign found and owner updated:", campaign._id.toString());
  }

  await memberships.deleteMany({
    userId,
    campaignId: campaign._id
  });

  const membership = {
    userId,
    campaignId: campaign._id,
    role: "owner",
    status: "active",
    displayName: name,
    joinedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  };

  const membershipResult = await memberships.insertOne(membership);

  console.log("Owner user created:");
  console.log({
    userId: userId.toString(),
    email,
    campaignId: campaign._id.toString(),
    membershipId: membershipResult.insertedId.toString(),
    role: "owner"
  });

  console.log("Done. You can now login with this email/password.");
} finally {
  await client.close();
}