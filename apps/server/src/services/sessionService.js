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

async function publicUserForSession(user) {
  if (!user) return null;
  const { toPublicUser } = await import("./authStore.js");
  return toPublicUser(user);
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
  const publicUser = await publicUserForSession(req.user);
  if (canEditRole(campaignRole(publicUser))) return "gm";
  return "player";
}

export async function sessionInfo(req) {
  const publicUser = await publicUserForSession(req.user);
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
  if ((await resolveRequestMode(req)) !== "gm") {
    return res.status(403).json({ error: "GM access required. Log in with an owner/GM campaign membership to manage campaign content." });
  }
  next();
}