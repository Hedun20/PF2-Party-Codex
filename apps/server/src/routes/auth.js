import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { createUser, findUserByEmail, renewEmailVerification, revokeUserSessions, toPublicUser, verifyEmailToken, verifyPassword } from "../services/authStore.js";
import { createSessionToken } from "../services/authTokens.js";
import { sendEmail, verifyEmailTemplate } from "../services/emailService.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const authRouter = Router();
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please try again later." }
});

function publicBase(req) {
  if (config.publicAppUrl) return config.publicAppUrl;
  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
}

async function queueVerificationEmail(req, user, verifyToken) {
  const verifyUrl = `${publicBase(req)}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const email = verifyEmailTemplate({ verifyUrl, name: user.name });
  const delivery = await sendEmail({ to: user.email, subject: "Confirm your Party Codex email", ...email });
  return { verifyUrl, delivery };
}

async function tokenResponse(user) {
  const publicUser = await toPublicUser(user);
  return {
    user: publicUser,
    activeWorkspace: publicUser?.activeWorkspace || null,
    activeCampaign: publicUser?.activeCampaign || null,
    activeMembership: publicUser?.activeMembership || publicUser?.membership || null,
    membership: publicUser?.membership || publicUser?.activeMembership || null,
    role: publicUser?.role || "player",
    token: createSessionToken({ id: publicUser.id, sessionVersion: user.sessionVersion || 1 })
  };
}

authRouter.post("/auth/register", authAttemptLimiter, async (req, res, next) => {
  try {
    const created = await createUser(req.body || {});
    const { verifyUrl, delivery } = await queueVerificationEmail(req, created.user, created.verifyToken);
    await logAuditEvent({ req, actorUserId: created.user.id, actorEmail: created.user.email, actorRole: created.user.role, campaignId: created.user.activeCampaign?.id, action: "auth.register", entityType: "user", entityId: created.user.id });
    res.status(201).json({
      user: created.user,
      activeWorkspace: created.user.activeWorkspace || null,
      activeCampaign: created.user.activeCampaign || null,
      activeMembership: created.user.activeMembership || created.user.membership || null,
      membership: created.user.membership || created.user.activeMembership || null,
      role: created.user.role,
      verificationQueued: true,
      verificationSent: delivery.status === "sent",
      emailDelivery: { mode: delivery.deliveryMode, status: delivery.status },
      devVerifyUrl: config.isProduction ? undefined : verifyUrl
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/resend-verification", authAttemptLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const user = email ? await findUserByEmail(email) : null;
    if (user && !user.emailVerified && user.status === "active") {
      const renewed = await renewEmailVerification(user);
      if (renewed) {
        await queueVerificationEmail(req, renewed.user, renewed.verifyToken);
        await logAuditEvent({
          req,
          actorUserId: String(user._id || user.id || ""),
          actorEmail: user.email,
          action: "auth.email.verification.resent",
          entityType: "user",
          entityId: String(user._id || user.id || "")
        });
      }
    }
    res.status(202).json({ ok: true, message: "If an unverified account exists for this email, a new confirmation message has been queued." });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/login", authAttemptLimiter, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(user, password))) {
      await logAuditEvent({ req, actorEmail: email, action: "auth.login.failed", entityType: "user", metadata: { reason: "bad_credentials" } });
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (!user.emailVerified) {
      const publicUser = await toPublicUser(user);
      await logAuditEvent({ req, actorUserId: publicUser.id, actorEmail: user.email, actorRole: publicUser.role, campaignId: publicUser.activeCampaign?.id, action: "auth.login.failed", entityType: "user", entityId: publicUser.id, metadata: { reason: "email_unverified" } });
      return res.status(403).json({ error: "Confirm your email before logging in." });
    }
    req.user = user;
    await logAuditEvent({ req, action: "auth.login.success", entityType: "user", entityId: String(user._id || user.id || "") });
    res.json(await tokenResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/logout", async (req, res, next) => {
  try {
    await logAuditEvent({ req, action: "auth.logout", entityType: "user", entityId: String(req.user?._id || req.user?.id || "") });
    if (req.user) await revokeUserSessions(req.user);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/auth/me", async (req, res, next) => {
  try {
    const user = await toPublicUser(req.user);
    res.json({ user, activeWorkspace: user?.activeWorkspace || null, activeCampaign: user?.activeCampaign || null, activeMembership: user?.activeMembership || user?.membership || null, membership: user?.membership || user?.activeMembership || null, role: user?.role || "player" });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/auth/verify-email", async (req, res, next) => {
  try {
    const user = await verifyEmailToken(req.query.token || "");
    if (!user) return res.redirect("/?verified=invalid");
    await logAuditEvent({ req, actorUserId: user.id, actorEmail: user.email, actorRole: user.role, campaignId: user.activeCampaign?.id, action: "auth.email.verified", entityType: "user", entityId: user.id });
    res.redirect("/?verified=1");
  } catch (error) {
    next(error);
  }
});
