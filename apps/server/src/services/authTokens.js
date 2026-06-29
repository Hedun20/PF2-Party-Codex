import crypto from "crypto";

const SESSION_TTL_MS = Number(process.env.AUTH_SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 14);

function secret() {
  return process.env.AUTH_SECRET || "pf2-party-codex-local-dev-secret";
}

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(user) {
  const payload = b64url(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS
  }));
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token = "") {
  const [payload, signature] = String(token).split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}