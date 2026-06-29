import { Router } from "express";
import { createUser, findUserByEmail, toPublicUser, verifyEmailToken, verifyPassword } from "../services/authStore.js";
import { createSessionToken } from "../services/authTokens.js";
import { sendEmail, verifyEmailTemplate } from "../services/emailService.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const authRouter = Router();

function publicBase(req) {
  const configured = String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (configured) return configured;
  const protocol = req.get("x-forwarded-proto") || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
}

function tokenResponse(user) {
  return { user: toPublicUser(user), token: createSessionToken(user) };
}

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const created = await createUser(req.body || {});
    const verifyUrl = `${publicBase(req)}/api/auth/verify-email?token=${encodeURIComponent(created.verifyToken)}`;
    const email = verifyEmailTemplate({ verifyUrl, name: created.user.name });
    await sendEmail({ to: created.user.email, subject: "Confirm your PF2 Party Codex email", ...email });
    await logAuditEvent({ req, actorUserId: created.user.id, actorEmail: created.user.email, actorRole: created.user.role, action: "auth.register", entityType: "user", entityId: created.user.id });
    res.status(201).json({ user: created.user, verificationSent: true, devVerifyUrl: process.env.NODE_ENV === "production" ? undefined : verifyUrl });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(user, password))) {
      await logAuditEvent({ req, actorEmail: email, action: "auth.login.failed", entityType: "user", metadata: { reason: "bad_credentials" } });
      return res.status(401).json({ error: "Invalid email or password." });
    }
    if (!user.emailVerified) {
      await logAuditEvent({ req, actorUserId: user.id, actorEmail: user.email, actorRole: user.role, action: "auth.login.failed", entityType: "user", entityId: user.id, metadata: { reason: "email_unverified" } });
      return res.status(403).json({ error: "Confirm your email before logging in." });
    }
    req.user = user;
    await logAuditEvent({ req, action: "auth.login.success", entityType: "user", entityId: user.id });
    res.json(tokenResponse(user));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/logout", async (req, res) => {
  await logAuditEvent({ req, action: "auth.logout", entityType: "user", entityId: req.user?.id || "" });
  res.json({ ok: true });
});

authRouter.get("/auth/me", (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

authRouter.get("/auth/verify-email", async (req, res, next) => {
  try {
    const user = await verifyEmailToken(req.query.token || "");
    if (!user) return res.redirect("/?verified=invalid");
    await logAuditEvent({ req, actorUserId: user.id, actorEmail: user.email, actorRole: user.role, action: "auth.email.verified", entityType: "user", entityId: user.id });
    res.redirect("/?verified=1");
  } catch (error) {
    next(error);
  }
});