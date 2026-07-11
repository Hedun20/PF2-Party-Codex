import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

for (const envPath of [path.join(rootDir, ".env"), path.join(rootDir, "apps", "server", ".env")]) {
  dotenv.config({ path: envPath, quiet: true });
}
const isProduction = process.env.NODE_ENV === "production";
const localAuthSecret = "pf2-party-codex-local-dev-secret";
const authSecret = process.env.AUTH_SECRET || (isProduction ? "" : localAuthSecret);
const defaultAllowedOrigins = ["http://localhost:5173", "http://localhost:3050"];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || defaultAllowedOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const dataDir = process.env.DATA_DIR || path.join(rootDir, "data");

if (!authSecret) {
  throw new Error("AUTH_SECRET is required when NODE_ENV=production. Refusing to start without a signing secret.");
}

if (!process.env.AUTH_SECRET) {
  console.warn("");
  console.warn("************************************************************");
  console.warn("WARNING: AUTH_SECRET is not set. Using a local development");
  console.warn("fallback signing secret. Set AUTH_SECRET in .env before");
  console.warn("sharing this server beyond trusted local development.");
  console.warn("************************************************************");
  console.warn("");
}

export const config = {
  port: Number(process.env.PORT || 3050),
  host: process.env.HOST || "0.0.0.0",
  rootDir,
  authSecret,
  allowedOrigins,
  vaultDir: path.join(rootDir, "vault"),
  imagesDir: path.join(rootDir, "vault", "images"),
  exportDir: path.join(rootDir, "foundry-export"),
  dataDir,
  campaignAssetsDir: path.join(dataDir, "campaign-assets"),
  campaignExportsDir: path.join(dataDir, "campaign-exports"),
  mongoUri: String(process.env.MONGO_DISABLED || "").toLowerCase() === "true" ? "" : (process.env.MONGO_URI || ""),
  mongoDbName: process.env.MONGO_DB_NAME || "pf2_party_codex"
};
