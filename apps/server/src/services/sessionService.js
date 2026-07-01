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

function isLocalHost(host = "") {
  const normalized = hostFromValue(host);
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "0.0.0.0";
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

function canEditRole(role = "") {
  return role === "owner" || role === "gm";
}

export function isLocalGmRequest(req) {
  return isLocalHost(requestHost(req));
}

export async function resolveRequestMode(req, requestedMode = "") {
  const wantsPlayerPreview = String(requestedMode || req.query?.mode || "").toLowerCase() === "player";
  if (wantsPlayerPreview) return "player";
  const publicUser = await publicUserForSession(req.user);
  if (canEditRole(publicUser?.role || req.user?.role)) return "gm";
  if (isLocalGmRequest(req) && !(await hasRegisteredUsers())) return "gm";
  return "player";
}

export async function sessionInfo(req) {
  const publicUser = await publicUserForSession(req.user);
  const mode = await resolveRequestMode(req);
  const bootstrapping = mode === "gm" && !req.user;
  return {
    mode,
    canEdit: mode === "gm",
    access: publicUser ? publicUser.role : bootstrapping ? "bootstrap-local-gm" : "player",
    host: requestHost(req),
    user: publicUser,
    activeCampaign: publicUser?.activeCampaign || null,
    membership: publicUser?.membership || null,
    role: publicUser?.role || (bootstrapping ? "gm" : "player"),
    authRequiredForGm: await hasRegisteredUsers()
  };
}

export async function requireGm(req, res, next) {
  if ((await resolveRequestMode(req)) !== "gm") {
    return res.status(403).json({ error: "GM access required. Log in with a GM account to edit the campaign vault." });
  }
  next();
}