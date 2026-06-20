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
  // In Vite dev mode the backend may receive a proxied Host header, so Origin/Referer
  // better represent the browser URL that the GM/player actually opened.
  return req.get("origin") || req.get("referer") || req.get("x-forwarded-host") || req.get("host") || "";
}

export function isLocalGmRequest(req) {
  return isLocalHost(requestHost(req));
}

export function resolveRequestMode(req, requestedMode = "") {
  const wantsPlayerPreview = String(requestedMode || req.query?.mode || "").toLowerCase() === "player";
  if (wantsPlayerPreview) return "player";
  return isLocalGmRequest(req) ? "gm" : "player";
}

export function sessionInfo(req) {
  const mode = resolveRequestMode(req);
  return {
    mode,
    canEdit: mode === "gm",
    access: mode === "gm" ? "local-gm" : "lan-player",
    host: requestHost(req)
  };
}

export function requireGm(req, res, next) {
  if (resolveRequestMode(req) !== "gm") {
    return res.status(403).json({ error: "Только локальный GM может изменять vault. Открой приложение через localhost на машине мастера." });
  }
  next();
}
