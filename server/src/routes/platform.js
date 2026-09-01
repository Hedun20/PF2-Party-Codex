import { Router } from "express";
import { requirePlatformAdmin } from "../middleware/platformAccess.js";
import {
  identityCounts,
  mongoFindUserById,
  mongoListUsers,
  mongoUpdateUser
} from "../repositories/identityRepository.js";
import { deliverQueuedEmail, emailOutboxCounts, listEmailOutbox } from "../services/emailService.js";
import { listAuditEvents, logAuditEvent } from "../services/auditLogService.js";
import { releaseReadiness } from "../services/releaseReadinessService.js";

export const platformRouter = Router();

function publicAdminUser(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id || ""),
    email: user.email || "",
    name: user.name || "",
    status: user.status || "active",
    platformRoles: Array.isArray(user.platformRoles) ? user.platformRoles : [],
    emailVerified: Boolean(user.emailVerified),
    verificationMethod: user.verificationMethod || "",
    emailVerifiedAt: user.emailVerifiedAt || "",
    verifiedByUserId: user.verifiedByUserId ? String(user.verifiedByUserId) : "",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || ""
  };
}

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

platformRouter.get("/platform/users", requirePlatformAdmin, async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim().toLowerCase();
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 500));
    const users = await mongoListUsers();
    const filtered = query
      ? users.filter((user) => `${user.email || ""} ${user.name || ""}`.toLowerCase().includes(query))
      : users;
    res.json({ items: filtered.slice(0, limit).map(publicAdminUser), total: filtered.length });
  } catch (error) {
    next(error);
  }
});

platformRouter.get("/platform/users/:id", requirePlatformAdmin, async (req, res, next) => {
  try {
    const user = await mongoFindUserById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({ user: publicAdminUser(user) });
  } catch (error) {
    return next(error);
  }
});

platformRouter.post("/platform/users/:id/verification", requirePlatformAdmin, async (req, res, next) => {
  try {
    const target = await mongoFindUserById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    const verified = req.body?.verified !== false;
    const reason = String(req.body?.reason || "Manual platform admin verification").trim().slice(0, 500);
    const actorUserId = String(req.user?._id || req.user?.id || "");
    const stamp = new Date().toISOString();

    const patch = verified
      ? {
          emailVerified: true,
          emailVerifiedAt: target.emailVerified && target.emailVerifiedAt ? target.emailVerifiedAt : stamp,
          verificationMethod: "platformAdmin",
          verifiedByUserId: actorUserId || null,
          emailVerifyTokenHash: "",
          emailVerifyTokenExpiresAt: ""
        }
      : {
          emailVerified: false,
          emailVerifiedAt: "",
          verificationMethod: "",
          verifiedByUserId: null,
          emailVerifyTokenHash: "",
          emailVerifyTokenExpiresAt: ""
        };

    const updated = await mongoUpdateUser(req.params.id, patch);
    await logAuditEvent({
      req,
      action: verified ? "platform.user.verification.grant" : "platform.user.verification.revoke",
      entityType: "user",
      entityId: req.params.id,
      metadata: {
        targetEmail: target.email || "",
        previousEmailVerified: Boolean(target.emailVerified),
        emailVerified: verified,
        verificationMethod: verified ? "platformAdmin" : "",
        reason
      }
    });

    return res.json({ user: publicAdminUser(updated), changed: Boolean(target.emailVerified) !== verified });
  } catch (error) {
    return next(error);
  }
});

platformRouter.get("/platform/audit-logs", requirePlatformAdmin, async (req, res, next) => {
  try {
    const items = await listAuditEvents({ limit: req.query.limit || 200 });
    res.json({ items });
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
