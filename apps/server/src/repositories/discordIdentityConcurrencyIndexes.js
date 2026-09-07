import { getDb, mongoStatus } from "../db/mongo.js";

function links() {
  return getDb().collection("discordIdentityLinks");
}

export async function ensureDiscordIdentityConcurrencyIndexes() {
  if (!mongoStatus().connected) return [];

  await links().createIndex(
    { campaignId: 1, membershipId: 1 },
    {
      name: "discord_identity_active_membership_unique",
      unique: true,
      partialFilterExpression: { status: "active" }
    }
  );

  await links().createIndex(
    { campaignId: 1, discordUserId: 1 },
    {
      name: "discord_identity_active_user_unique",
      unique: true,
      partialFilterExpression: { status: "active" }
    }
  );

  return [
    "discord_identity_active_membership_unique",
    "discord_identity_active_user_unique"
  ];
}
