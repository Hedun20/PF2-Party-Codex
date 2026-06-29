import crypto from "crypto";
import { logger } from "../utils/logger.js";
import { readJson, writeJson } from "./jsonDb.js";

const AUDIT_FILE = "audit-log.json";
const MAX_EVENTS = Number(process.env.AUDIT_MAX_EVENTS || 5000);

function requestIp(req) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req?.ip || req?.socket?.remoteAddress || "";
}

export async function logAuditEvent(input) {
  try {
    const events = await readJson(AUDIT_FILE, []);
    events.push({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      actorUserId: input.req?.user?.id || input.actorUserId || null,
      actorEmail: input.req?.user?.email || input.actorEmail || "",
      actorRole: input.req?.user?.role || input.actorRole || "",
      action: input.action,
      entityType: input.entityType || "",
      entityId: input.entityId || "",
      ip: requestIp(input.req),
      userAgent: String(input.req?.headers?.["user-agent"] || "").slice(0, 500),
      metadata: input.metadata || {}
    });
    await writeJson(AUDIT_FILE, events.slice(-MAX_EVENTS));
  } catch (error) {
    logger.error("Failed to write audit event", { action: input.action, error: error?.message || String(error) });
  }
}

export async function listAuditEvents(limit = 200) {
  const events = await readJson(AUDIT_FILE, []);
  return events.slice(-Math.max(1, Math.min(Number(limit) || 200, 1000))).reverse();
}