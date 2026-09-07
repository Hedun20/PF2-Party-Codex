import { ObjectId } from "mongodb";
import { getDb, mongoStatus } from "../db/mongo.js";

const MAX_CANDIDATE_DOCUMENTS = 250;

function requireMongo() {
  if (mongoStatus().connected) return;
  const error = new Error("MongoDB is required for evidence retrieval.");
  error.status = 503;
  error.code = "EVIDENCE_SEARCH_STORAGE_UNAVAILABLE";
  throw error;
}

function objectIdOrValue(value) {
  const text = String(value || "");
  return ObjectId.isValid(text) ? new ObjectId(text) : value;
}

function objectIds(values = []) {
  return values.map((value) => objectIdOrValue(value)).filter(Boolean);
}

function boundedLimit(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return MAX_CANDIDATE_DOCUMENTS;
  return Math.min(parsed, MAX_CANDIDATE_DOCUMENTS);
}

function entries() {
  return getDb().collection("entries");
}

function evidenceRecords() {
  return getDb().collection("evidenceRecords");
}

function notes() {
  return getDb().collection("notes");
}

function timeRangeVariants(from, to) {
  if (!from && !to) return [];
  const stringRange = {};
  const dateRange = {};
  if (from) {
    stringRange.$gte = from;
    dateRange.$gte = new Date(from);
  }
  if (to) {
    stringRange.$lte = to;
    dateRange.$lte = new Date(to);
  }
  return [stringRange, dateRange];
}

export async function findApprovedCanonSearchCandidates({
  campaignId,
  viewer = "player",
  filters = {},
  limit = MAX_CANDIDATE_DOCUMENTS
} = {}) {
  requireMongo();
  const query = {
    campaignId: objectIdOrValue(campaignId),
    status: "active",
    $and: []
  };
  query.visibility = viewer === "manager"
    ? { $in: ["public", "revealed", "gmOnly", "hidden"] }
    : { $in: ["public", "revealed"] };

  const entityIds = objectIds(filters.entityIds || []);
  if (entityIds.length) query._id = { $in: entityIds };

  const sessionIds = objectIds(filters.sessionIds || []);
  if (sessionIds.length) {
    query.$and.push({
      $or: [
        { sessionId: { $in: sessionIds } },
        { "source.sessionId": { $in: sessionIds } },
        { "metadata.sessionId": { $in: sessionIds } }
      ]
    });
  }

  const timeRanges = timeRangeVariants(filters.occurredFrom, filters.occurredTo);
  if (timeRanges.length) {
    query.$and.push({ $or: timeRanges.map((range) => ({ updatedAt: range })) });
  }
  if (!query.$and.length) delete query.$and;

  return entries().find(query, {
    projection: {
      _id: 1,
      campaignId: 1,
      sessionId: 1,
      worldId: 1,
      type: 1,
      category: 1,
      title: 1,
      path: 1,
      summary: 1,
      publicContent: 1,
      gmContent: 1,
      status: 1,
      visibility: 1,
      source: 1,
      policy: 1,
      metadata: 1,
      createdAt: 1,
      updatedAt: 1
    }
  }).sort({ updatedAt: -1, _id: 1 }).limit(boundedLimit(limit)).toArray();
}

function providerFilterForKinds(kinds = []) {
  const providers = new Set();
  if (kinds.includes("foundry")) providers.add("foundry");
  if (kinds.includes("discord")) providers.add("discord");
  if (kinds.includes("transcriptSegment")) providers.add("transcript");
  if (kinds.includes("manualNote")) providers.add("manualImport");
  return [...providers];
}

export async function findRawEvidenceSearchCandidates({
  workspaceId,
  campaignId,
  kinds = [],
  filters = {},
  evaluatedAt,
  limit = MAX_CANDIDATE_DOCUMENTS
} = {}) {
  requireMongo();
  const providers = providerFilterForKinds(kinds);
  if (!providers.length) return [];

  const query = {
    workspaceId: objectIdOrValue(workspaceId),
    campaignId: objectIdOrValue(campaignId),
    provider: { $in: providers },
    $and: [
      { $or: [{ state: { $exists: false } }, { state: { $in: ["active", "ended"] } }] },
      { $or: [{ revokedAt: { $exists: false } }, { revokedAt: null }] },
      { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
      {
        $or: [
          { purgeAt: { $exists: false } },
          { purgeAt: null },
          { purgeAt: { $gt: evaluatedAt } },
          { purgeAt: { $gt: new Date(evaluatedAt) } }
        ]
      }
    ]
  };

  const sessionIds = objectIds(filters.sessionIds || []);
  if (sessionIds.length) query.sessionId = { $in: sessionIds };

  const entityIds = objectIds(filters.entityIds || []);
  if (entityIds.length) {
    query.$and.push({
      $or: [
        { entityId: { $in: entityIds } },
        { "normalizedProjection.entityId": { $in: entityIds } }
      ]
    });
  }

  const timeRanges = timeRangeVariants(filters.occurredFrom, filters.occurredTo);
  if (timeRanges.length) {
    query.$and.push({ $or: timeRanges.map((range) => ({ occurredAt: range })) });
  }

  return evidenceRecords().find(query, {
    projection: {
      _id: 1,
      schemaVersion: 1,
      workspaceId: 1,
      campaignId: 1,
      provider: 1,
      connectionId: 1,
      stream: 1,
      sourceId: 1,
      providerObjectId: 1,
      providerEventId: 1,
      sourceDocumentId: 1,
      sessionId: 1,
      entityId: 1,
      occurredAt: 1,
      ingestedAt: 1,
      adapterVersion: 1,
      visibility: 1,
      audience: 1,
      releaseState: 1,
      state: 1,
      approvalState: 1,
      retentionClass: 1,
      purgeAt: 1,
      revokedAt: 1,
      deletedAt: 1,
      normalizedProjection: 1,
      contentHash: 1,
      policyVersion: 1
    }
  }).sort({ occurredAt: -1, _id: 1 }).limit(boundedLimit(limit)).toArray();
}

export async function findManualNoteSearchCandidates({
  campaignId,
  userId,
  filters = {},
  limit = MAX_CANDIDATE_DOCUMENTS
} = {}) {
  requireMongo();
  const query = {
    campaignId: objectIdOrValue(campaignId),
    $and: [{
      $or: [
        { userId: objectIdOrValue(userId) },
        { visibility: { $in: ["sharedWithGm", "partyVisible", "gmPrivate"] } }
      ]
    }]
  };

  const sessionIds = objectIds(filters.sessionIds || []);
  if (sessionIds.length) query.$and.push({ linkedSessionId: { $in: sessionIds } });

  const entityIds = objectIds(filters.entityIds || []);
  if (entityIds.length) query.$and.push({ linkedEntryIds: { $in: entityIds } });

  const timeRanges = timeRangeVariants(filters.occurredFrom, filters.occurredTo);
  if (timeRanges.length) {
    query.$and.push({ $or: timeRanges.map((range) => ({ updatedAt: range })) });
  }

  return notes().find(query, {
    projection: {
      _id: 1,
      campaignId: 1,
      userId: 1,
      characterId: 1,
      title: 1,
      body: 1,
      linkedEntryIds: 1,
      linkedSessionId: 1,
      linkedPath: 1,
      linkedTitle: 1,
      tags: 1,
      visibility: 1,
      createdAt: 1,
      updatedAt: 1
    }
  }).sort({ updatedAt: -1, _id: 1 }).limit(boundedLimit(limit)).toArray();
}
