import { Router } from "express";
import { profileForUser, updateProfileForUser } from "../repositories/profilesRepository.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const profilesRouter = Router();

function requireUser(req) {
  if (req.user) return;
  const error = new Error("Login is required.");
  error.status = 401;
  throw error;
}

profilesRouter.get("/profile", async (req, res, next) => {
  try {
    requireUser(req);
    res.json({ profile: await profileForUser(req.user) });
  } catch (error) {
    next(error);
  }
});

profilesRouter.patch("/profile", async (req, res, next) => {
  try {
    requireUser(req);
    const profile = await updateProfileForUser(req.user, req.body || {});
    await logAuditEvent({
      req,
      action: "profile.update",
      entityType: "profile",
      entityId: profile.id,
      metadata: { language: profile.language, theme: profile.theme }
    });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});
