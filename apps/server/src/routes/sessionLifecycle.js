import { Router } from "express";
import { logAuditEvent } from "../services/auditLogService.js";
import { requireCampaignMember } from "../services/sessionService.js";
import {
  endCampaignSessionLifecycle,
  ensureSessionLifecycle,
  readSessionLifecycle,
  recoverCampaignSessionLifecycle,
  startCampaignSessionLifecycle,
  transitionCampaignSessionLifecycle
} from "../repositories/sessionLifecycleRepository.js";

export const sessionLifecycleRouter = Router();
sessionLifecycleRouter.use("/sessions/:sessionId/lifecycle", requireCampaignMember);

const GM_ROLES = new Set(["owner", "gm"]);

function context(req) {
  const identity = req.campaignIdentity || {};
  const role = String(identity.role || "").toLowerCase();
  if (!GM_ROLES.has(role)) {
    const error = new Error("GM access required for session lifecycle management.");
    error.status = 403;
    error.code = "SESSION_LIFECYCLE_GM_REQUIRED";
    throw error;
  }
  const workspaceId = identity.workspace?.id || identity.membership?.workspaceId || "";
  const campaignId = identity.campaign?.id || identity.membership?.campaignId || "";
  const userId = identity.user?.id || identity.membership?.userId || "";
  if (!workspaceId || !campaignId || !userId) {
    const error = new Error("Active workspace, campaign and user identity are required for session lifecycle management.");
    error.status = 409;
    error.code = "SESSION_LIFECYCLE_CONTEXT_MISSING";
    throw error;
  }
  return {
    workspaceId,
    campaignId,
    userId,
    sessionId: req.params.sessionId,
    role
  };
}

async function auditLifecycle(req, action, result, metadata = {}) {
  const session = result?.session || {};
  await logAuditEvent({
    req,
    action,
    entityType: "session",
    entityId: session.id || req.params.sessionId,
    campaignId: session.campaignId || req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "",
    metadata: {
      lifecycleStatus: session.status || "",
      lifecycleRevision: Number(session.lifecycleRevision || 0),
      processingVersion: Number(session.processing?.processingVersion || 0),
      warningCount: Array.isArray(session.warnings) ? session.warnings.length : 0,
      idempotent: Boolean(result?.idempotent),
      ...metadata
    }
  });
}

sessionLifecycleRouter.get("/sessions/:sessionId/lifecycle", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await readSessionLifecycle(scope);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/initialize", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await ensureSessionLifecycle({ ...scope, occurredAt: req.body?.occurredAt });
    await auditLifecycle(req, "sessions.lifecycle.initialize", result, { initialized: Boolean(result.initialized) });
    res.status(result.initialized ? 201 : 200).json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/connect", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await transitionCampaignSessionLifecycle({
      ...scope,
      input: {
        to: "connected",
        sourceRanges: req.body?.sourceRanges || [],
        occurredAt: req.body?.occurredAt,
        reasonCode: "GM_CONNECT"
      }
    });
    await auditLifecycle(req, "sessions.lifecycle.connect", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/start", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await startCampaignSessionLifecycle({ ...scope, input: { occurredAt: req.body?.occurredAt } });
    await auditLifecycle(req, "sessions.lifecycle.start", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/pause", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await transitionCampaignSessionLifecycle({
      ...scope,
      input: { to: "paused", occurredAt: req.body?.occurredAt, reasonCode: "GM_PAUSE" }
    });
    await auditLifecycle(req, "sessions.lifecycle.pause", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/end", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await endCampaignSessionLifecycle({
      ...scope,
      input: {
        occurredAt: req.body?.occurredAt,
        ...(req.body?.sourceRanges !== undefined ? { sourceRanges: req.body.sourceRanges } : {})
      }
    });
    await auditLifecycle(req, "sessions.lifecycle.end", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/queue", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await transitionCampaignSessionLifecycle({
      ...scope,
      input: { to: "queued", occurredAt: req.body?.occurredAt, reasonCode: "GM_QUEUE_PROCESSING" }
    });
    await auditLifecycle(req, "sessions.lifecycle.queue", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/publish", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await transitionCampaignSessionLifecycle({
      ...scope,
      input: { to: "published", occurredAt: req.body?.occurredAt, reasonCode: "GM_PUBLISH" }
    });
    await auditLifecycle(req, "sessions.lifecycle.publish", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/cancel", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await transitionCampaignSessionLifecycle({
      ...scope,
      input: { to: "canceled", occurredAt: req.body?.occurredAt, reasonCode: "GM_CANCEL" }
    });
    await auditLifecycle(req, "sessions.lifecycle.cancel", result);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

sessionLifecycleRouter.post("/sessions/:sessionId/lifecycle/recover", async (req, res, next) => {
  try {
    const scope = context(req);
    const result = await recoverCampaignSessionLifecycle({
      ...scope,
      input: { occurredAt: req.body?.occurredAt }
    });
    await auditLifecycle(req, "sessions.lifecycle.recover", result, { recovery: "staleProcessingLease" });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
