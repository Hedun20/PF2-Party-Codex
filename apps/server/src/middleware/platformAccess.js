import { platformAccessForUser } from "../services/platformAccessService.js";

export function requirePlatformAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Login is required for platform administration." });
  const access = platformAccessForUser(req.user);
  if (!access.isAdmin) {
    return res.status(403).json({ error: "Platform administrator access is required. Campaign owner and GM roles do not grant platform access." });
  }
  req.platformAccess = access;
  next();
}
