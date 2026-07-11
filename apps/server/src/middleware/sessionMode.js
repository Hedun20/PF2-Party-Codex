export { isLocalGmRequest, requireCampaignMember, requireGm } from "../services/sessionService.js";

export async function requestMode(req, fallback = "player") {
  const { resolveRequestMode } = await import("../services/sessionService.js");
  return resolveRequestMode(req, req.query?.mode || fallback);
}

export async function sessionPayload(req) {
  const { sessionInfo } = await import("../services/sessionService.js");
  return sessionInfo(req);
}
