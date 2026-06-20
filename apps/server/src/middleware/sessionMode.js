import os from "os";

const localHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);

function normalizeHost(value = "") {
  const raw = String(value || "").split(",")[0].trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `http://${raw}`);
    return url.hostname.toLowerCase();
  } catch {
    return raw.replace(/^\[/, "").replace(/\]$/, "").split(":")[0].toLowerCase();
  }
}

function localInterfaceIps() {
  return new Set(
    Object.values(os.networkInterfaces())
      .flat()
      .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
      .map((entry) => entry.address.toLowerCase())
  );
}

export function isLocalGmRequest(req) {
  const originHost = normalizeHost(req.get("origin") || req.get("referer") || "");
  const host = normalizeHost(req.hostname || req.headers.host || "");
  const remote = normalizeHost(String(req.ip || req.socket?.remoteAddress || "").replace(/^::ffff:/, ""));
  const localIps = localInterfaceIps();
  return localHosts.has(originHost) || localHosts.has(host) || localHosts.has(remote) || localIps.has(remote);
}

export function requestMode(req, fallback = "player") {
  if (isLocalGmRequest(req)) return req.query.mode === "player" ? "player" : "gm";
  return "player";
}

export function sessionPayload(req) {
  const gm = isLocalGmRequest(req);
  return {
    mode: gm ? "gm" : "player",
    canEdit: gm,
    access: gm ? "local-gm" : "lan-player"
  };
}

export function requireGm(req, res, next) {
  if (isLocalGmRequest(req)) return next();
  return res.status(403).json({ error: "Только локальный GM может изменять vault. Игроки по LAN видят только player-visible контент." });
}
