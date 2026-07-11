import { getDb, mongoStatus } from "../db/mongo.js";
import { logger } from "../utils/logger.js";

function requestIp(req) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req?.ip || req?.socket?.remoteAddress || "";
}

function actorId(input) {
  return String(input.req?.user?._id || input.req?.user?.id || input.actorUserId || "") || null;
}

async function campaignIdFromInput(input) {
  if (input.campaignId) return input.campaignId;
  if (input.req?.campaignIdentity?.campaign?.id) return input.req.campaignIdentity.campaign.id;
  if (!input.req?.user || !mongoStatus().connected) return null;
  try {
    const { toPublicUser } = await import("./authStore.js");
    const requestedCampaignId = input.req.get?.("x-campaign-id") || "";
    const user = await toPublicUser(input.req.user, requestedCampaignId ? { campaignId: requestedCampaignId } : {});
    return user?.activeCampaign?.id || null;
  } catch {
    return null;
  }
}

export async function logAuditEvent(input) {
  try {
    const event = {
      createdAt: new Date().toISOString(),
      campaignId: await campaignIdFromInput(input),
      actorUserId: actorId(input),
      actorEmail: input.req?.user?.email || input.actorEmail || "",
      actorRole: input.req?.campaignIdentity?.role || input.actorRole || "",
      action: input.action,
      entityType: input.entityType || "",
      entityId: input.entityId || "",
      ip: requestIp(input.req),
      userAgent: String(input.req?.headers?.["user-agent"] || "").slice(0, 500),
      metadata: input.metadata || {}
    };

    if (!mongoStatus().connected) {
      logger.warn("Audit event skipped because MongoDB is unavailable", { action: input.action });
      return;
    }
    await getDb().collection("auditLogs").insertOne(event);
  } catch (error) {
    logger.error("Failed to write audit event", { action: input.action, error: error?.message || String(error) });
  }
}

export async function listAuditEvents(input = 200) {
  const options = typeof input === "object" && input !== null ? input : { limit: input };
  const { campaignId = "" } = options;
  const limit = options.limit ?? 200;
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  if (mongoStatus().connected) {
    const query = campaignId ? { campaignId: String(campaignId) } : {};
    const events = await getDb().collection("auditLogs").find(query).sort({ createdAt: -1 }).limit(safeLimit).toArray();
    return events.map((event) => ({ ...event, id: String(event._id), _id: undefined }));
  }
  return [];
}
