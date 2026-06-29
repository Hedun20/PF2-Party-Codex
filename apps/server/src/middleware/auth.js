import { findUserById } from "../services/authStore.js";
import { verifySessionToken } from "../services/authTokens.js";

export async function attachUser(req, _res, next) {
  try {
    const header = String(req.get("authorization") || "");
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match) return next();
    const token = verifySessionToken(match[1]);
    if (!token?.sub) return next();
    const user = await findUserById(token.sub);
    if (user?.status === "active") req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}