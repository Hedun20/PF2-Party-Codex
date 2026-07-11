function hostFromValue(value = "") {
  if (!value) return "";
  const first = String(value).split(",")[0].trim();
  try {
    const url = new URL(/^https?:\/\//i.test(first) ? first : `http://${first}`);
    return url.hostname.toLowerCase();
  } catch {
    return first.replace(/^\[/, "").replace(/\]$/, "").split(":")[0].toLowerCase();
  }
}

function requestHost(req) {
  return req.get("origin") || req.get("referer") || req.get("x-forwarded-host") || req.get("host") || "";
}

async function hasRegisteredUsers() {
  const { hasUsers } = await import("./authStore.js");
  return hasUsers();
}

async function publicUserForSession(user, campaignId = "") {
  if (!user) return null;
  const { toPublicUser } = await import("./authStore.js");
  return toPublicUser(user, campaignId ? { campaignId } : {});
}

export function requestedCampaignId(req) {
  return String(
    req.params?.campaignId
    || req.body?.campaignId
    || req.query?.campaignId
    || req.get?.("x-campaign-id")
    || ""
  ).trim();
}

function campaignRole(publicUser) {
  return String(publicUser?.activeMembership?.role || publicUser?.membership?.role || "").toLowerCase();
}

function canEditRole(role = "") {
  return role === "owner" || role === "gm";
}

export function isLocalGmRequest(_req) {
  return false;
}

export async function resolveRequestMode(req, requestedMode = "") {
  const wantsPlayerPreview = String(requestedMode || req.query?.mode || "").toLowerCase() === "player";
  if (wantsPlayerPreview) return "player";
  const publicUser = await publicUserForSession(req.user, requestedCampaignId(req));
  if (canEditRole(campaignRole(publicUser))) return "gm";
  return "player";
}

export async function sessionInfo(req) {
  const selectedCampaignId = requestedCampaignId(req);
  let publicUser = await publicUserForSession(req.user, selectedCampaignId);
  if (selectedCampaignId && publicUser && !publicUser.activeMembership?.id) {
    publicUser = await publicUserForSession(req.user);
  }
  const role = campaignRole(publicUser) || (publicUser ? "user" : "anonymous");
  const mode = await resolveRequestMode(req);
  return {
    mode,
    canEdit: canEditRole(role),
    access: role,
    host: requestHost(req),
    user: publicUser,
    activeWorkspace: publicUser?.activeWorkspace || null,
    activeCampaign: publicUser?.activeCampaign || null,
    activeMembership: publicUser?.activeMembership || publicUser?.membership || null,
    membership: publicUser?.membership || publicUser?.activeMembership || null,
    role,
    authRequiredForGm: await hasRegisteredUsers()
  };
}

export async function requireGm(req, res, next) {
  try {
    const user = await publicUserForSession(req.user, requestedCampaignId(req));
    const role = campaignRole(user);
    if (!user || !canEditRole(role)) {
      return res.status(403).json({ error: "GM access required. Log in with an owner/GM campaign membership to manage campaign content." });
    }
    const membership = user.activeMembership || user.membership || null;
    req.campaignIdentity = {
      user,
      workspace: user.activeWorkspace || null,
      campaign: user.activeCampaign || null,
      membership,
      role
    };
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCampaignMember(req, res, next) {
  try {
    const user = await publicUserForSession(req.user, requestedCampaignId(req));
    if (!user) return res.status(401).json({ error: "Login is required to access campaign content." });

    const membership = user.activeMembership || user.membership || null;
    if (!membership?.id) {
      return res.status(403).json({ error: "An active campaign membership is required to access campaign content." });
    }

    req.campaignIdentity = {
      user,
      workspace: user.activeWorkspace || null,
      campaign: user.activeCampaign || null,
      membership,
      role: campaignRole(user) || "player"
    };
    next();
  } catch (error) {
    next(error);
  }
}
