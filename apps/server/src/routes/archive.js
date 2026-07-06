import { Router } from "express";
import { collections } from "../repositories/collections.js";
import { getDb, mongoStatus } from "../db/mongo.js";
import { identityContextForCampaign, objectIdFrom } from "../repositories/identityRepository.js";

export const archiveRouter = Router({ mergeParams: true });

const GM_ROLES = new Set(["owner", "gm"]);
const PUBLIC_VISIBILITIES = ["public", "revealed"];
const PRIVATE_VISIBILITIES = ["gmOnly", "hidden", "needsReview"];

function isGm(role = "") {
  return GM_ROLES.has(role);
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return idString(value._id);
  return String(value);
}

function campaignKey(campaignId) {
  return objectIdFrom(campaignId) || campaignId;
}

function userKey(userId) {
  return objectIdFrom(userId) || userId;
}

function assertMongoArchive() {
  if (!mongoStatus().connected) {
    const error = new Error("Mongo archive storage is not connected.");
    error.status = 503;
    throw error;
  }
}

function requestedCampaignId(req) {
  return req.params.campaignId || req.query.campaignId || req.body?.campaignId || "";
}

function baseQuery(campaignId) {
  return { campaignId: campaignKey(campaignId) };
}

function contentVisibilityQuery(campaignId, role) {
  const query = baseQuery(campaignId);
  if (!isGm(role)) {
    query.visibility = { $in: PUBLIC_VISIBILITIES };
    query.status = { $ne: "draft" };
  }
  return query;
}

function handoutQuery(campaignId, role, userId) {
  const query = baseQuery(campaignId);
  if (!isGm(role)) {
    const userObjectId = userKey(userId);
    query.$or = [
      { visibility: "partyVisible" },
      { visibility: "specificPlayers", visibleToUserIds: userObjectId }
    ];
  }
  return query;
}

function characterQuery(campaignId, role, userId) {
  const query = baseQuery(campaignId);
  const userObjectId = userKey(userId);
  if (isGm(role)) {
    query.$or = [
      { ownerUserId: userObjectId },
      { "visibility.sharedWithGm": true },
      { "visibility.visibleToParty": true }
    ];
  } else {
    query.$or = [
      { ownerUserId: userObjectId },
      { "visibility.visibleToParty": true }
    ];
  }
  return query;
}

function noteQuery(campaignId, role, userId) {
  const query = baseQuery(campaignId);
  const userObjectId = userKey(userId);
  if (isGm(role)) {
    query.$or = [
      { userId: userObjectId },
      { visibility: { $in: ["sharedWithGm", "partyVisible", "gmPrivate"] } }
    ];
  } else {
    query.$or = [
      { userId: userObjectId },
      { visibility: "partyVisible" }
    ];
  }
  return query;
}

function compactEntry(entry = {}) {
  return {
    id: idString(entry._id),
    title: entry.title || "Untitled",
    type: entry.type || "lore",
    category: entry.category || "lore",
    path: entry.path || "",
    summary: entry.summary || "",
    visibility: entry.visibility || "public",
    updatedAt: entry.updatedAt || entry.createdAt || ""
  };
}

function compactMap(map = {}) {
  return {
    id: idString(map._id),
    title: map.title || "Untitled map",
    worldId: idString(map.worldId),
    visibility: map.visibility || "public",
    updatedAt: map.updatedAt || map.createdAt || ""
  };
}

function compactTimelineEvent(event = {}) {
  return {
    id: idString(event._id),
    title: event.title || "Untitled event",
    dateLabel: event.dateLabel || "",
    worldId: idString(event.worldId),
    visibility: event.visibility || "public",
    updatedAt: event.updatedAt || event.createdAt || ""
  };
}

function compactSession(session = {}) {
  return {
    id: idString(session._id),
    title: session.title || "Untitled session",
    number: Number.isFinite(Number(session.number)) ? Number(session.number) : null,
    scheduledAt: session.scheduledAt || "",
    status: session.status || "planned",
    visibility: session.visibility || "gmOnly",
    updatedAt: session.updatedAt || session.createdAt || ""
  };
}

function compactHandout(handout = {}) {
  return {
    id: idString(handout._id),
    title: handout.title || "Untitled handout",
    visibility: handout.visibility || "partyVisible",
    releasedAt: handout.releasedAt || "",
    updatedAt: handout.updatedAt || handout.createdAt || ""
  };
}

async function recent(collection, query, mapper, limit = 8) {
  return collection
    .find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray()
    .then((items) => items.map(mapper));
}

function availableSections(counts) {
  return Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .map(([name]) => name);
}

archiveRouter.get("/", async (req, res, next) => {
  try {
    assertMongoArchive();
    if (!req.user) return res.status(401).json({ error: "Login is required to read the campaign archive." });

    const campaignId = requestedCampaignId(req);
    if (!campaignId) return res.status(400).json({ error: "campaignId is required." });

    const context = await identityContextForCampaign(req.user, campaignId);
    if (!context.activeMembership?.id) return res.status(403).json({ error: "No active membership found for the requested campaign." });

    const db = getDb();
    const role = context.role || "player";
    const userId = context.activeMembership.userId;
    const campaignObjectId = campaignKey(context.activeCampaign?.id || campaignId);

    const entriesQuery = contentVisibilityQuery(campaignObjectId, role);
    const mapsQuery = contentVisibilityQuery(campaignObjectId, role);
    const timelineQuery = contentVisibilityQuery(campaignObjectId, role);
    const sessionsQuery = contentVisibilityQuery(campaignObjectId, role);
    const handoutsQuery = handoutQuery(campaignObjectId, role, userId);
    const charactersQuery = characterQuery(campaignObjectId, role, userId);
    const notesQuery = noteQuery(campaignObjectId, role, userId);

    const entriesCollection = db.collection(collections.entries);
    const mapsCollection = db.collection(collections.maps);
    const timelineCollection = db.collection(collections.timelineEvents);
    const sessionsCollection = db.collection(collections.sessions);
    const handoutsCollection = db.collection(collections.handouts);
    const charactersCollection = db.collection(collections.characters);
    const notesCollection = db.collection(collections.notes);

    const [
      entriesCount,
      mapsCount,
      timelineEventsCount,
      sessionsCount,
      handoutsCount,
      charactersCount,
      notesCount,
      recentEntries,
      recentMaps,
      recentTimelineEvents,
      recentSessions,
      recentHandouts
    ] = await Promise.all([
      entriesCollection.countDocuments(entriesQuery),
      mapsCollection.countDocuments(mapsQuery),
      timelineCollection.countDocuments(timelineQuery),
      sessionsCollection.countDocuments(sessionsQuery),
      handoutsCollection.countDocuments(handoutsQuery),
      charactersCollection.countDocuments(charactersQuery),
      notesCollection.countDocuments(notesQuery),
      recent(entriesCollection, entriesQuery, compactEntry),
      recent(mapsCollection, mapsQuery, compactMap),
      recent(timelineCollection, timelineQuery, compactTimelineEvent),
      recent(sessionsCollection, sessionsQuery, compactSession),
      recent(handoutsCollection, handoutsQuery, compactHandout)
    ]);

    const counts = {
      entries: entriesCount,
      maps: mapsCount,
      timelineEvents: timelineEventsCount,
      sessions: sessionsCount,
      handouts: handoutsCount,
      characters: charactersCount,
      notes: notesCount
    };

    res.json({
      campaign: context.activeCampaign,
      workspace: context.activeWorkspace,
      role,
      archive: {
        counts,
        recent: {
          entries: recentEntries,
          maps: recentMaps,
          timelineEvents: recentTimelineEvents,
          sessions: recentSessions,
          handouts: recentHandouts
        },
        availableSections: availableSections(counts),
        visibility: isGm(role) ? "gm" : "player",
        excludedVisibilities: isGm(role) ? [] : PRIVATE_VISIBILITIES
      }
    });
  } catch (error) {
    next(error);
  }
});