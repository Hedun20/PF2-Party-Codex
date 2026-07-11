import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

for (const envPath of [path.join(rootDir, ".env"), path.join(rootDir, "apps", "server", ".env")]) {
  dotenv.config({ path: envPath, quiet: true });
}

const LOCAL_AUTH_SECRET = "pf2-party-codex-local-dev-secret";
const LOCAL_ORIGINS = ["http://localhost:5173", "http://localhost:3050"];
const EMAIL_MODES = new Set(["outbox", "webhook"]);
const BILLING_MODES = new Set(["disabled", "manual"]);

function csv(value = "") {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function envBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function parseTrustProxy(value = "") {
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === "false" || normalized === "0") return false;
  if (normalized === "true") return true;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  return value;
}

function validUrl(value, { https = false } = {}) {
  try {
    const parsed = new URL(String(value));
    return ["http:", "https:"].includes(parsed.protocol) && (!https || parsed.protocol === "https:");
  } catch {
    return false;
  }
}

function validOrigin(value, { https = false } = {}) {
  try {
    const parsed = new URL(String(value));
    const normalized = String(value).replace(/\/$/, "");
    return validUrl(value, { https }) && parsed.origin === normalized;
  } catch {
    return false;
  }
}

function validEmailSender(value = "") {
  const text = String(value).trim();
  const bracketed = text.match(/<([^<>]+)>$/);
  const email = (bracketed ? bracketed[1] : text).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith("@localhost");
}

export function productionConfigIssues(env = process.env) {
  const issues = [];
  const allowHttp = envBoolean(env.ALLOW_INSECURE_PRODUCTION_HTTP, false);
  const authSecret = String(env.AUTH_SECRET || "");
  const mongoDisabled = envBoolean(env.MONGO_DISABLED, false);
  const origins = csv(env.ALLOWED_ORIGINS);
  const emailMode = String(env.EMAIL_MODE || "outbox").trim().toLowerCase();
  const billingMode = String(env.BILLING_MODE || "disabled").trim().toLowerCase();

  if (authSecret.length < 32 || authSecret === LOCAL_AUTH_SECRET || /change[_-]?me|replace[_-]?me/i.test(authSecret)) {
    issues.push("AUTH_SECRET must be a unique secret of at least 32 characters.");
  }
  if (!env.MONGO_URI || mongoDisabled) issues.push("MONGO_URI is required and MONGO_DISABLED must be false.");
  if (!env.PUBLIC_APP_URL || !validOrigin(env.PUBLIC_APP_URL, { https: !allowHttp })) {
    issues.push(`PUBLIC_APP_URL must be a valid ${allowHttp ? "HTTP(S)" : "HTTPS"} origin without a path.`);
  }
  if (!origins.length || origins.some((origin) => origin === "*" || !validOrigin(origin, { https: !allowHttp }))) {
    issues.push(`ALLOWED_ORIGINS must contain explicit valid ${allowHttp ? "HTTP(S)" : "HTTPS"} origins and may not contain '*'.`);
  }
  if (!EMAIL_MODES.has(emailMode)) {
    issues.push("EMAIL_MODE must be 'outbox' or 'webhook'.");
  } else if (emailMode !== "webhook" && !envBoolean(env.ALLOW_OUTBOX_EMAIL_IN_PRODUCTION, false)) {
    issues.push("EMAIL_MODE must be 'webhook' in production unless ALLOW_OUTBOX_EMAIL_IN_PRODUCTION=true is explicitly accepted.");
  }
  if (emailMode === "webhook") {
    if (!env.EMAIL_WEBHOOK_URL || !validUrl(env.EMAIL_WEBHOOK_URL, { https: !allowHttp })) {
      issues.push(`EMAIL_WEBHOOK_URL must be a valid ${allowHttp ? "HTTP(S)" : "HTTPS"} URL when EMAIL_MODE=webhook.`);
    }
    if (String(env.EMAIL_WEBHOOK_TOKEN || "").length < 16) {
      issues.push("EMAIL_WEBHOOK_TOKEN must contain at least 16 characters when EMAIL_MODE=webhook.");
    }
  }
  if (!validEmailSender(env.EMAIL_FROM)) {
    issues.push("EMAIL_FROM must contain a valid deliverable sender address and may not use localhost.");
  }
  if (!BILLING_MODES.has(billingMode)) issues.push("BILLING_MODE must be 'disabled' or 'manual'; no payment provider is simulated.");
  return issues;
}

const isProduction = process.env.NODE_ENV === "production";
const mongoDisabled = envBoolean(process.env.MONGO_DISABLED, false);
const authSecret = process.env.AUTH_SECRET || (isProduction ? "" : LOCAL_AUTH_SECRET);
const allowedOrigins = csv(process.env.ALLOWED_ORIGINS || LOCAL_ORIGINS.join(",")).map((origin) => origin.replace(/\/$/, ""));
const dataDir = process.env.DATA_DIR || path.join(rootDir, "data");
const emailMode = String(process.env.EMAIL_MODE || "outbox").trim().toLowerCase();
const billingMode = String(process.env.BILLING_MODE || "disabled").trim().toLowerCase();
const productionIssues = isProduction ? productionConfigIssues(process.env) : [];

if (productionIssues.length) {
  throw new Error(`Production configuration is invalid:\n- ${productionIssues.join("\n- ")}`);
}

if (!isProduction && !process.env.AUTH_SECRET) {
  console.warn("");
  console.warn("************************************************************");
  console.warn("WARNING: AUTH_SECRET is not set. Using a local development");
  console.warn("fallback signing secret. Set AUTH_SECRET in .env before");
  console.warn("sharing this server beyond trusted local development.");
  console.warn("************************************************************");
  console.warn("");
}

export const config = {
  environment: process.env.NODE_ENV || "development",
  isProduction,
  port: positiveNumber(process.env.PORT, 3050),
  host: process.env.HOST || "0.0.0.0",
  rootDir,
  authSecret,
  allowedOrigins,
  publicAppUrl: String(process.env.PUBLIC_APP_URL || "").replace(/\/$/, ""),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "6mb",
  apiRateLimit: positiveNumber(process.env.API_RATE_LIMIT, 600),
  requestTimeoutMs: positiveNumber(process.env.REQUEST_TIMEOUT_MS, 30_000),
  headersTimeoutMs: positiveNumber(process.env.HEADERS_TIMEOUT_MS, 35_000),
  shutdownGraceMs: positiveNumber(process.env.SHUTDOWN_GRACE_MS, 10_000),
  vaultDir: path.join(rootDir, "vault"),
  imagesDir: path.join(rootDir, "vault", "images"),
  exportDir: path.join(rootDir, "foundry-export"),
  dataDir,
  campaignAssetsDir: path.join(dataDir, "campaign-assets"),
  campaignExportsDir: path.join(dataDir, "campaign-exports"),
  mongoUri: mongoDisabled ? "" : (process.env.MONGO_URI || ""),
  mongoDbName: process.env.MONGO_DB_NAME || "pf2_party_codex",
  emailMode: EMAIL_MODES.has(emailMode) ? emailMode : "outbox",
  emailFrom: process.env.EMAIL_FROM || "Party Codex <noreply@localhost>",
  emailWebhookUrl: process.env.EMAIL_WEBHOOK_URL || "",
  emailWebhookToken: process.env.EMAIL_WEBHOOK_TOKEN || "",
  emailWebhookTimeoutMs: positiveNumber(process.env.EMAIL_WEBHOOK_TIMEOUT_MS, 10_000),
  billingMode: BILLING_MODES.has(billingMode) ? billingMode : "disabled",
  platformAdminEmails: csv(process.env.PLATFORM_ADMIN_EMAILS).map((email) => email.toLowerCase()),
  productionIssues
};
