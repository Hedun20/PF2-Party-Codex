import crypto from "node:crypto";
import { getDb, mongoStatus } from "../db/mongo.js";
import { objectIdFrom } from "./identityRepository.js";

const CHALLENGE_TTL_MS = Number(process.env.DISCORD_IDENTITY_CHALLENGE_TTL_MS || 10 * 60 * 1000);
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PAIRING_LENGTH = 12;
const DISCORD_SNOWFLAKE = /^[1-9][0-9]{0,19}$/;
const SAFE_PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function challenges() {
  return getDb().collection("discordIdentityChallenges");
}

function links() {
  return getDb().collection("discordIdentityLinks");
}

function memberships() {
  return getDb().collection("memberships");
}

function requireMongo() {
  if (mongoStatus().connected) return;
  const error = new Error("MongoDB is required for Discord identity linking.");
  error.status = 503;
  error.code = "DISCORD_IDENTITY_STORAGE_UNAVAILABLE";
  throw error;
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return idString(value._id);
  return String(value);
}

function requiredObjectId(value, label) {
  const objectId = objectIdFrom(value);
  if (objectId) return objectId;
  const error = new Error(`${label} is invalid.`);
  error.status = 400;
  error.code = "DISCORD_IDENTITY_SCOPE_INVALID";
  throw error;
}

function sameId(left, right) {
  return Boolean(left && right) && idString(left) === idString(right);
}

function canonicalInstant(value, label) {
  const text = String(value || "").trim();
  const parsed = Date.parse(text);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(text)
    || !Number.isFinite(parsed)
    || new Date(parsed).toISOString() !== text) {
    const error = new Error(`${label} must be a canonical UTC timestamp.`);
    error.status = 400;
    error.code = "DISCORD_IDENTITY_PROOF_INVALID";
    throw error;
  }
  return text;
}

function normalizePairingCode(value = "") {
  const compact = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length !== PAIRING_LENGTH || [...compact].some((char) => !PAIRING_ALPHABET.includes(char))) {
    const error = new Error("Discord pairing code is invalid or expired.");
    error.status = 400;
    error.code = "DISCORD_IDENTITY_CODE_INVALID";
    throw error;
  }
  return compact;
}

function hashPairingCode(value) {
  return crypto.createHash("sha256").update(normalizePairingCode(value), "utf8").digest("hex");
}

function createPairingCode() {
  let compact = "";
  while (compact.length < PAIRING_LENGTH) {
    compact += PAIRING_ALPHABET[crypto.randomInt(0, PAIRING_ALPHABET.length)];
  }
  return `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8)}`;
}

function publicLink(link) {
  if (!link) return null;
  return {
    id: idString(link._id),
    workspaceId: idString(link.workspaceId),
    campaignId: idString(link.campaignId),
    membershipId: idString(link.membershipId),
    userId: idString(link.userId),
    provider: "discord",
    discordUserId: String(link.discordUserId || ""),
    status: link.status || "active",
    verifiedAt: link.verifiedAt || "",
    revokedAt: link.revokedAt || "",
    revokedReason: link.revokedReason || "",
    createdAt: link.createdAt || "",
    updatedAt: link.updatedAt || ""
  };
}

function publicChallenge(challenge, { pairingCode = "" } = {}) {
  if (!challenge) return null;
  const expiresAt = challenge.expiresAt instanceof Date ? challenge.expiresAt.toISOString() : String(challenge.expiresAt || "");
  const expired = challenge.status === "pending" && Date.parse(expiresAt) <= Date.now();
  return {
    id: idString(challenge._id),
    campaignId: idString(challenge.campaignId),
    membershipId: idString(challenge.membershipId),
    status: expired ? "expired" : (challenge.status || "pending"),
    expiresAt,
    createdAt: challenge.createdAt || "",
    updatedAt: challenge.updatedAt || "",
    ...(pairingCode ? { pairingCode } : {})
  };
}

function validateVerifiedProof(proof = {}) {
  const expectedKeys = [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "connectionId",
    "discordUserId",
    "applicationId",
    "guildId",
    "channelId",
    "interactionId",
    "pairingCode",
    "issuedAt",
    "verifiedAt"
  ].sort();
  if (!proof || typeof proof !== "object" || Array.isArray(proof)
    || Object.keys(proof).sort().join("|") !== expectedKeys.join("|")) {
    const error = new Error("Verified Discord identity proof has an invalid shape.");
    error.status = 400;
    error.code = "DISCORD_IDENTITY_PROOF_INVALID";
    throw error;
  }
  if (proof.schemaVersion !== "hed33-verified-discord-identity-v1") {
    const error = new Error("Verified Discord identity proof version is unsupported.");
    error.status = 400;
    error.code = "DISCORD_IDENTITY_PROOF_INVALID";
    throw error;
  }
  for (const [field, value] of Object.entries({
    discordUserId: proof.discordUserId,
    applicationId: proof.applicationId,
    guildId: proof.guildId,
    channelId: proof.channelId,
    interactionId: proof.interactionId
  })) {
    if (!DISCORD_SNOWFLAKE.test(String(value || ""))) {
      const error = new Error(`Verified Discord ${field} is invalid.`);
      error.status = 400;
      error.code = "DISCORD_IDENTITY_PROOF_INVALID";
      throw error;
    }
  }
  if (!SAFE_PROVIDER_ID.test(String(proof.connectionId || ""))) {
    const error = new Error("Verified Discord connection id is invalid.");
    error.status = 400;
    error.code = "DISCORD_IDENTITY_PROOF_INVALID";
    throw error;
  }
  const issuedAt = canonicalInstant(proof.issuedAt, "Discord proof issue time");
  const verifiedAt = canonicalInstant(proof.verifiedAt, "Discord proof verification time");
  const issued = Date.parse(issuedAt);
  const verified = Date.parse(verifiedAt);
  if (verified < issued || verified - issued > 5 * 60 * 1000 || Math.abs(Date.now() - verified) > 10 * 60 * 1000) {
    const error = new Error("Verified Discord identity proof is stale.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_PROOF_STALE";
    throw error;
  }
  return {
    ...proof,
    workspaceId: idString(proof.workspaceId),
    campaignId: idString(proof.campaignId),
    connectionId: String(proof.connectionId),
    discordUserId: String(proof.discordUserId),
    pairingCode: normalizePairingCode(proof.pairingCode),
    issuedAt,
    verifiedAt
  };
}

export async function ensureDiscordIdentityIndexes() {
  if (!mongoStatus().connected) return [];
  await challenges().createIndex({ codeHash: 1 }, { unique: true });
  await challenges().createIndex({ campaignId: 1, membershipId: 1, status: 1, createdAt: -1 });
  await challenges().createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 });
  await links().createIndex({ campaignId: 1, membershipId: 1, status: 1 });
  await links().createIndex({ campaignId: 1, discordUserId: 1, status: 1 });
  await links().createIndex({ userId: 1, status: 1 });
  return [
    "discordIdentityChallenges.codeHash",
    "discordIdentityChallenges.campaignId_membershipId_status_createdAt",
    "discordIdentityChallenges.purgeAt",
    "discordIdentityLinks.campaignId_membershipId_status",
    "discordIdentityLinks.campaignId_discordUserId_status",
    "discordIdentityLinks.userId_status"
  ];
}

export async function discordIdentityStatus({ workspaceId, campaignId, membershipId, userId } = {}) {
  requireMongo();
  const scope = {
    workspaceId: requiredObjectId(workspaceId, "Workspace id"),
    campaignId: requiredObjectId(campaignId, "Campaign id"),
    membershipId: requiredObjectId(membershipId, "Membership id"),
    userId: requiredObjectId(userId, "User id")
  };
  const [membership, link, challenge] = await Promise.all([
    memberships().findOne({
      _id: scope.membershipId,
      workspaceId: scope.workspaceId,
      campaignId: scope.campaignId,
      userId: scope.userId,
      status: "active"
    }),
    links().findOne({ campaignId: scope.campaignId, membershipId: scope.membershipId, status: "active" }),
    challenges().findOne(
      { campaignId: scope.campaignId, membershipId: scope.membershipId, status: "pending" },
      { sort: { createdAt: -1 } }
    )
  ]);
  if (!membership) {
    const error = new Error("An active campaign membership is required for Discord identity linking.");
    error.status = 403;
    error.code = "DISCORD_IDENTITY_MEMBERSHIP_REQUIRED";
    throw error;
  }
  return {
    link: publicLink(link),
    challenge: publicChallenge(challenge)
  };
}

export async function createDiscordIdentityChallenge({ workspaceId, campaignId, membershipId, userId } = {}) {
  requireMongo();
  const scope = {
    workspaceId: requiredObjectId(workspaceId, "Workspace id"),
    campaignId: requiredObjectId(campaignId, "Campaign id"),
    membershipId: requiredObjectId(membershipId, "Membership id"),
    userId: requiredObjectId(userId, "User id")
  };
  const membership = await memberships().findOne({
    _id: scope.membershipId,
    workspaceId: scope.workspaceId,
    campaignId: scope.campaignId,
    userId: scope.userId,
    status: "active"
  });
  if (!membership) {
    const error = new Error("An active campaign membership is required for Discord identity linking.");
    error.status = 403;
    error.code = "DISCORD_IDENTITY_MEMBERSHIP_REQUIRED";
    throw error;
  }
  const existingLink = await links().findOne({ campaignId: scope.campaignId, membershipId: scope.membershipId, status: "active" });
  if (existingLink) {
    const error = new Error("This campaign membership is already linked to Discord. Unlink it before pairing another account.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_ALREADY_LINKED";
    throw error;
  }

  const stamp = new Date().toISOString();
  await challenges().updateMany(
    { campaignId: scope.campaignId, membershipId: scope.membershipId, status: "pending" },
    { $set: { status: "revoked", revokedAt: stamp, updatedAt: stamp } }
  );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const pairingCode = createPairingCode();
    const codeHash = hashPairingCode(pairingCode);
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    const challenge = {
      ...scope,
      codeHash,
      status: "pending",
      expiresAt,
      purgeAt: new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000),
      createdAt: stamp,
      updatedAt: stamp
    };
    try {
      const result = await challenges().insertOne(challenge);
      return publicChallenge({ ...challenge, _id: result.insertedId }, { pairingCode });
    } catch (error) {
      if (error?.code !== 11000 || attempt === 3) throw error;
    }
  }
  throw new Error("Unable to allocate a unique Discord pairing challenge.");
}

export async function completeDiscordIdentityChallenge({ proof: input } = {}) {
  requireMongo();
  const proof = validateVerifiedProof(input);
  const codeHash = hashPairingCode(proof.pairingCode);
  const challenge = await challenges().findOne({ codeHash });
  if (!challenge) {
    const error = new Error("Discord pairing code is invalid or expired.");
    error.status = 404;
    error.code = "DISCORD_IDENTITY_CODE_NOT_FOUND";
    throw error;
  }
  if (challenge.status === "consumed") {
    const existing = await links().findOne({
      campaignId: challenge.campaignId,
      membershipId: challenge.membershipId,
      discordUserId: proof.discordUserId,
      status: "active"
    });
    if (existing) return { link: publicLink(existing), idempotent: true };
    const error = new Error("Discord pairing challenge has already been consumed.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_CODE_USED";
    throw error;
  }
  if (challenge.status !== "pending" || challenge.expiresAt.getTime() <= Date.now()) {
    const error = new Error("Discord pairing challenge has expired or was revoked.");
    error.status = 410;
    error.code = "DISCORD_IDENTITY_CODE_EXPIRED";
    throw error;
  }
  if (!sameId(challenge.workspaceId, proof.workspaceId) || !sameId(challenge.campaignId, proof.campaignId)) {
    const error = new Error("Discord proof does not match the pairing challenge campaign.");
    error.status = 403;
    error.code = "DISCORD_IDENTITY_SCOPE_MISMATCH";
    throw error;
  }

  const membership = await memberships().findOne({
    _id: challenge.membershipId,
    workspaceId: challenge.workspaceId,
    campaignId: challenge.campaignId,
    userId: challenge.userId,
    status: "active"
  });
  if (!membership) {
    const error = new Error("Campaign membership is no longer active. Start a new Discord pairing after access is restored.");
    error.status = 403;
    error.code = "DISCORD_IDENTITY_MEMBERSHIP_INACTIVE";
    throw error;
  }

  const conflictingDiscord = await links().findOne({
    campaignId: challenge.campaignId,
    discordUserId: proof.discordUserId,
    status: "active"
  });
  if (conflictingDiscord && !sameId(conflictingDiscord.membershipId, challenge.membershipId)) {
    const error = new Error("This Discord account is already linked to another member in this campaign.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_CONFLICT";
    throw error;
  }
  const existingMembershipLink = await links().findOne({
    campaignId: challenge.campaignId,
    membershipId: challenge.membershipId,
    status: "active"
  });
  if (existingMembershipLink) {
    if (existingMembershipLink.discordUserId === proof.discordUserId) {
      await challenges().updateOne(
        { _id: challenge._id, status: "pending" },
        { $set: { status: "consumed", consumedAt: proof.verifiedAt, updatedAt: proof.verifiedAt } }
      );
      return { link: publicLink(existingMembershipLink), idempotent: true };
    }
    const error = new Error("This campaign membership is already linked to a different Discord account.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_ALREADY_LINKED";
    throw error;
  }

  const claim = await challenges().updateOne(
    { _id: challenge._id, status: "pending", expiresAt: { $gt: new Date() } },
    {
      $set: {
        status: "consuming",
        consumingAt: proof.verifiedAt,
        consumingInteractionId: proof.interactionId,
        updatedAt: proof.verifiedAt
      }
    }
  );
  if (!claim.modifiedCount) {
    const latest = await challenges().findOne({ _id: challenge._id });
    if (latest?.status === "consumed") {
      const existing = await links().findOne({
        campaignId: challenge.campaignId,
        membershipId: challenge.membershipId,
        discordUserId: proof.discordUserId,
        status: "active"
      });
      if (existing) return { link: publicLink(existing), idempotent: true };
    }
    const error = new Error("Discord pairing is already being completed. Retry status in a moment.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_PAIRING_BUSY";
    throw error;
  }

  const stamp = proof.verifiedAt;
  const link = {
    workspaceId: challenge.workspaceId,
    campaignId: challenge.campaignId,
    membershipId: challenge.membershipId,
    userId: challenge.userId,
    provider: "discord",
    discordUserId: proof.discordUserId,
    connectionId: proof.connectionId,
    applicationId: proof.applicationId,
    guildId: proof.guildId,
    channelId: proof.channelId,
    verificationInteractionId: proof.interactionId,
    status: "active",
    verifiedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp
  };

  try {
    const result = await links().insertOne(link);
    await challenges().updateOne(
      { _id: challenge._id, status: "consuming", consumingInteractionId: proof.interactionId },
      {
        $set: { status: "consumed", consumedAt: stamp, updatedAt: stamp },
        $unset: { consumingAt: "", consumingInteractionId: "" }
      }
    );
    return { link: publicLink({ ...link, _id: result.insertedId }), idempotent: false };
  } catch (error) {
    await challenges().updateOne(
      { _id: challenge._id, status: "consuming", consumingInteractionId: proof.interactionId },
      {
        $set: { status: "pending", updatedAt: new Date().toISOString() },
        $unset: { consumingAt: "", consumingInteractionId: "" }
      }
    );
    if (error?.code === 11000) {
      const conflict = new Error("Discord identity changed while pairing. Refresh status and retry with a new code.");
      conflict.status = 409;
      conflict.code = "DISCORD_IDENTITY_CONFLICT";
      throw conflict;
    }
    throw error;
  }
}

export async function revokeDiscordIdentityLink({ campaignId, membershipId, userId = "", reason = "userUnlinked" } = {}) {
  requireMongo();
  const campaignObjectId = requiredObjectId(campaignId, "Campaign id");
  const membershipObjectId = requiredObjectId(membershipId, "Membership id");
  const query = { campaignId: campaignObjectId, membershipId: membershipObjectId, status: "active" };
  if (userId) query.userId = requiredObjectId(userId, "User id");
  const existing = await links().findOne(query);
  if (!existing) return { link: null, idempotent: true };
  const stamp = new Date().toISOString();
  const update = await links().updateOne(
    { _id: existing._id, status: "active" },
    { $set: { status: "revoked", revokedAt: stamp, revokedReason: reason, updatedAt: stamp } }
  );
  if (!update.modifiedCount) {
    const latest = await links().findOne({ _id: existing._id });
    if (latest?.status === "revoked") return { link: publicLink(latest), idempotent: true };
    const error = new Error("Discord identity link changed before it could be revoked. Refresh and retry.");
    error.status = 409;
    error.code = "DISCORD_IDENTITY_CHANGED";
    throw error;
  }
  await challenges().updateMany(
    { campaignId: campaignObjectId, membershipId: membershipObjectId, status: "pending" },
    { $set: { status: "revoked", revokedAt: stamp, updatedAt: stamp } }
  );
  return { link: publicLink({ ...existing, status: "revoked", revokedAt: stamp, revokedReason: reason, updatedAt: stamp }), idempotent: false };
}

export async function revokeDiscordIdentityForMembership({ campaignId, membership, reason = "membershipRemoved", stamp = new Date().toISOString() } = {}) {
  requireMongo();
  if (!campaignId || !membership?._id) return { modifiedCount: 0 };
  const campaignObjectId = objectIdFrom(campaignId) || campaignId;
  const membershipId = membership._id;
  const [linkResult] = await Promise.all([
    links().updateMany(
      { campaignId: campaignObjectId, membershipId, status: "active" },
      { $set: { status: "revoked", revokedAt: stamp, revokedReason: reason, updatedAt: stamp } }
    ),
    challenges().updateMany(
      { campaignId: campaignObjectId, membershipId, status: { $in: ["pending", "consuming"] } },
      { $set: { status: "revoked", revokedAt: stamp, updatedAt: stamp }, $unset: { consumingAt: "", consumingInteractionId: "" } }
    )
  ]);
  return linkResult;
}
