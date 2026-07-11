import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/platformAccess.js";
import { identityCounts } from "../repositories/identityRepository.js";
import { deliverQueuedEmail, emailOutboxCounts, listEmailOutbox } from "../services/emailService.js";
import { logAuditEvent } from "../services/auditLogService.js";
import { releaseReadiness } from "../services/releaseReadinessService.js";

export const platformRouter = Router();

platformRouter.get("/platform/status", requirePlatformAdmin, async (req, res, next) => {
  try {
    const [identity, emailOutbox] = await Promise.all([identityCounts(), emailOutboxCounts()]);
    res.json({
      platform: "Party Codex",
      release: releaseReadiness(),
      identity,
      emailOutbox
    });
  } catch (error) {
    next(error);
  }
});

platformRouter.get("/platform/email-outbox", requirePlatformAdmin, async (req, res, next) => {
  try {
    const items = await listEmailOutbox({ status: req.query.status || "", limit: req.query.limit || 100 });
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

platformRouter.post("/platform/email-outbox/:id/retry", requirePlatformAdmin, async (req, res, next) => {
  try {
    const delivery = await deliverQueuedEmail(req.params.id);
    await logAuditEvent({
      req,
      action: "platform.email.retry",
      entityType: "emailOutbox",
      entityId: delivery.id,
      metadata: { status: delivery.status, attempts: delivery.attempts }
    });
    res.json({ delivery });
  } catch (error) {
    next(error);
  }
});
