export const plannedIndexes = [
  { collection: "users", keys: { email: 1 }, options: { unique: true } },
  { collection: "profiles", keys: { userId: 1 }, options: { unique: true } },
  { collection: "campaigns", keys: { ownerUserId: 1, name: 1 } },
  { collection: "memberships", keys: { campaignId: 1, userId: 1 }, options: { unique: true } },
  { collection: "memberships", keys: { userId: 1, status: 1 } },
  { collection: "entries", keys: { campaignId: 1, slug: 1 }, options: { unique: true } },
  { collection: "entries", keys: { campaignId: 1, type: 1, visibility: 1 } },
  { collection: "entryRelations", keys: { campaignId: 1, sourceEntryId: 1, type: 1 } },
  { collection: "notes", keys: { campaignId: 1, userId: 1, updatedAt: -1 } },
  { collection: "notes", keys: { campaignId: 1, visibility: 1, updatedAt: -1 } },
  { collection: "characters", keys: { campaignId: 1, ownerUserId: 1, updatedAt: -1 } },
  { collection: "characters", keys: { campaignId: 1, "visibility.visibleToParty": 1 } },
  { collection: "characters", keys: { campaignId: 1, "visibility.sharedWithGm": 1 } },
  { collection: "characters", keys: { campaignId: 1, "source.rawHash": 1 } },
  { collection: "maps", keys: { campaignId: 1, worldId: 1, title: 1 } },
  { collection: "maps", keys: { campaignId: 1, visibility: 1 } },
  { collection: "mapObjects", keys: { campaignId: 1, mapId: 1, visibility: 1 } },
  { collection: "mapObjects", keys: { campaignId: 1, entryId: 1 } },
  { collection: "timelineEvents", keys: { campaignId: 1, worldId: 1, sortIndex: 1 } },
  { collection: "timelineEvents", keys: { campaignId: 1, visibility: 1 } },
  { collection: "sessions", keys: { campaignId: 1, scheduledAt: -1 } },
  { collection: "sessions", keys: { campaignId: 1, status: 1, visibility: 1 } },
  { collection: "handouts", keys: { campaignId: 1, visibility: 1, releasedAt: -1 } },
  { collection: "handouts", keys: { campaignId: 1, visibleToUserIds: 1 } },
  { collection: "assets", keys: { campaignId: 1, originalHash: 1 } },
  { collection: "invitations", keys: { tokenHash: 1 }, options: { unique: true } },
  { collection: "emailOutbox", keys: { campaignId: 1, createdAt: -1 } },
  { collection: "auditLogs", keys: { campaignId: 1, createdAt: -1 } },
  { collection: "importJobs", keys: { campaignId: 1, type: 1, createdAt: -1 } }
];

export async function ensurePlannedIndexes(db, { dryRun = true } = {}) {
  if (dryRun) return plannedIndexes;

  for (const index of plannedIndexes) {
    await db.collection(index.collection).createIndex(index.keys, index.options || {});
  }
  return plannedIndexes;
}
