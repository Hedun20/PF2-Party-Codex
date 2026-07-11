import { Router } from "express";
import { logAuditEvent } from "../services/auditLogService.js";
import { identityContextForCampaign } from "../repositories/identityRepository.js";
import { toPublicUser } from "../services/authStore.js";
import { requestedCampaignId as campaignIdFromRequest, requireCampaignMember } from "../services/sessionService.js";
import {
  createCampaignSession,
  createHandout,
  createMap,
  createMapObject,
  createTimelineEvent,
  deleteCampaignSession,
  deleteHandout,
  deleteMap,
  deleteMapObject,
  deleteTimelineEvent,
  ensureWorldSystemIndexes,
  findMapById,
  isMongoWorldSystemsEnabled,
  listCampaignSessions,
  listHandouts,
  listMapObjects,
  listMaps,
  listTimelineEvents,
  updateCampaignSession,
  updateHandout,
  updateMap,
  updateMapObject,
  updateTimelineEvent
} from "../repositories/worldSystemsRepository.js";

export const worldSystemsRouter = Router();
for (const prefix of ["/world-systems", "/maps", "/map-objects", "/timeline-events", "/sessions", "/handouts"]) {
  worldSystemsRouter.use(prefix, requireCampaignMember);
}

const GM_ROLES = new Set(["owner", "gm"]);

function assertMongoWorldSystems() {
  if (!isMongoWorldSystemsEnabled()) {
    const error = new Error("Mongo campaign storage is not connected. Maps, timeline, sessions and handouts are unavailable until the database connection is restored.");
    error.status = 503;
    throw error;
  }
}

async function currentContext(req) {
  if (!req.user) {
    const error = new Error("Login is required to use campaign world systems.");
    error.status = 401;
    throw error;
  }

  const selectedCampaignId = campaignIdFromRequest(req);
  const user = await toPublicUser(req.user, selectedCampaignId ? { campaignId: selectedCampaignId } : {});
  const campaignId = selectedCampaignId || user?.activeCampaign?.id || user?.activeMembership?.campaignId || user?.membership?.campaignId || "";
  if (!campaignId) {
    const error = new Error("No active campaign membership found for this user.");
    error.status = 403;
    throw error;
  }

  const campaignContext = await identityContextForCampaign(req.user, campaignId);
  if (!campaignContext.activeMembership?.id) {
    const error = new Error("No active membership found for the requested campaign.");
    error.status = 403;
    throw error;
  }

  return {
    user: {
      ...user,
      activeWorkspace: campaignContext.activeWorkspace,
      activeCampaign: campaignContext.activeCampaign,
      activeMembership: campaignContext.activeMembership,
      membership: campaignContext.membership,
      role: campaignContext.role || "player"
    },
    userId: user.id,
    workspaceId: campaignContext.activeWorkspace?.id || campaignContext.activeMembership?.workspaceId || "",
    campaignId: campaignContext.activeCampaign?.id || campaignId,
    membershipId: campaignContext.activeMembership.id,
    role: campaignContext.role || "player"
  };
}

function requireGmContext(context) {
  if (!GM_ROLES.has(context.role)) {
    const error = new Error("GM access required.");
    error.status = 403;
    throw error;
  }
}

function notFound(res, label) {
  return res.status(404).json({ error: `${label} not found.` });
}

worldSystemsRouter.post("/world-systems/indexes", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const indexes = await ensureWorldSystemIndexes();
    res.json({ ok: true, indexes });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.get("/maps", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    const maps = await listMaps({ ...context, worldId: req.query.worldId || "", search: req.query.search || "", limit: req.query.limit || 200 });
    res.json({ maps, campaignId: context.campaignId, role: context.role });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.post("/maps", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const map = await createMap({ ...context, input: req.body || {} });
    await logAuditEvent({ req, action: "maps.create", entityType: "map", entityId: map.id, campaignId: context.campaignId, metadata: { title: map.title, visibility: map.visibility } });
    res.status(201).json({ map });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.get("/maps/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    const map = await findMapById({ ...context, id: req.params.id });
    if (!map) return notFound(res, "Map");
    const objects = String(req.query.includeObjects ?? "true") === "false" ? [] : await listMapObjects({ ...context, mapId: req.params.id });
    res.json({ map, objects });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.patch("/maps/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const map = await updateMap({ ...context, id: req.params.id, input: req.body || {} });
    if (!map) return notFound(res, "Map");
    await logAuditEvent({ req, action: "maps.update", entityType: "map", entityId: map.id, campaignId: context.campaignId, metadata: { title: map.title, visibility: map.visibility } });
    res.json({ map });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.delete("/maps/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const ok = await deleteMap({ ...context, id: req.params.id });
    if (!ok) return notFound(res, "Map");
    await logAuditEvent({ req, action: "maps.delete", entityType: "map", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.get("/maps/:id/objects", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    const objects = await listMapObjects({ ...context, mapId: req.params.id, category: req.query.category || "" });
    res.json({ objects, mapId: req.params.id });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.post("/maps/:id/objects", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const object = await createMapObject({ ...context, mapId: req.params.id, input: req.body || {} });
    await logAuditEvent({ req, action: "mapObjects.create", entityType: "mapObject", entityId: object.id, campaignId: context.campaignId, metadata: { mapId: req.params.id, category: object.category, visibility: object.visibility } });
    res.status(201).json({ object });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.patch("/map-objects/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const object = await updateMapObject({ ...context, id: req.params.id, input: req.body || {} });
    if (!object) return notFound(res, "Map object");
    await logAuditEvent({ req, action: "mapObjects.update", entityType: "mapObject", entityId: object.id, campaignId: context.campaignId, metadata: { category: object.category, visibility: object.visibility } });
    res.json({ object });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.delete("/map-objects/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const ok = await deleteMapObject({ ...context, id: req.params.id });
    if (!ok) return notFound(res, "Map object");
    await logAuditEvent({ req, action: "mapObjects.delete", entityType: "mapObject", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.get("/timeline-events", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    const events = await listTimelineEvents({ ...context, worldId: req.query.worldId || "", branch: req.query.branch || "", limit: req.query.limit || 500 });
    res.json({ timelineEvents: events, events, campaignId: context.campaignId, role: context.role });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.post("/timeline-events", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const event = await createTimelineEvent({ ...context, input: req.body || {} });
    await logAuditEvent({ req, action: "timeline.create", entityType: "timelineEvent", entityId: event.id, campaignId: context.campaignId, metadata: { title: event.title, visibility: event.visibility } });
    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.patch("/timeline-events/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const event = await updateTimelineEvent({ ...context, id: req.params.id, input: req.body || {} });
    if (!event) return notFound(res, "Timeline event");
    await logAuditEvent({ req, action: "timeline.update", entityType: "timelineEvent", entityId: event.id, campaignId: context.campaignId, metadata: { title: event.title, visibility: event.visibility } });
    res.json({ event });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.delete("/timeline-events/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const ok = await deleteTimelineEvent({ ...context, id: req.params.id });
    if (!ok) return notFound(res, "Timeline event");
    await logAuditEvent({ req, action: "timeline.delete", entityType: "timelineEvent", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.get("/sessions", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    const sessions = await listCampaignSessions({ ...context, status: req.query.status || "", limit: req.query.limit || 100 });
    res.json({ sessions, campaignId: context.campaignId, role: context.role });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.post("/sessions", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const session = await createCampaignSession({ ...context, input: req.body || {} });
    await logAuditEvent({ req, action: "sessions.create", entityType: "session", entityId: session.id, campaignId: context.campaignId, metadata: { title: session.title, visibility: session.visibility, status: session.status } });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.patch("/sessions/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const session = await updateCampaignSession({ ...context, id: req.params.id, input: req.body || {} });
    if (!session) return notFound(res, "Session");
    await logAuditEvent({ req, action: "sessions.update", entityType: "session", entityId: session.id, campaignId: context.campaignId, metadata: { title: session.title, visibility: session.visibility, status: session.status } });
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.delete("/sessions/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const ok = await deleteCampaignSession({ ...context, id: req.params.id });
    if (!ok) return notFound(res, "Session");
    await logAuditEvent({ req, action: "sessions.delete", entityType: "session", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.get("/handouts", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    const handouts = await listHandouts({ ...context, limit: req.query.limit || 100 });
    res.json({ handouts, campaignId: context.campaignId, role: context.role });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.post("/handouts", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const handout = await createHandout({ ...context, input: req.body || {} });
    await logAuditEvent({ req, action: "handouts.create", entityType: "handout", entityId: handout.id, campaignId: context.campaignId, metadata: { title: handout.title, visibility: handout.visibility } });
    res.status(201).json({ handout });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.patch("/handouts/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const handout = await updateHandout({ ...context, id: req.params.id, input: req.body || {} });
    if (!handout) return notFound(res, "Handout");
    await logAuditEvent({ req, action: "handouts.update", entityType: "handout", entityId: handout.id, campaignId: context.campaignId, metadata: { title: handout.title, visibility: handout.visibility } });
    res.json({ handout });
  } catch (error) {
    next(error);
  }
});

worldSystemsRouter.delete("/handouts/:id", async (req, res, next) => {
  try {
    assertMongoWorldSystems();
    const context = await currentContext(req);
    requireGmContext(context);
    const ok = await deleteHandout({ ...context, id: req.params.id });
    if (!ok) return notFound(res, "Handout");
    await logAuditEvent({ req, action: "handouts.delete", entityType: "handout", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
