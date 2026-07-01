import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

for (const envPath of [path.join(rootDir, ".env"), path.join(rootDir, "apps", "server", ".env")]) {
  dotenv.config({ path: envPath, quiet: true });
}

export const config = {
  port: Number(process.env.PORT || 3050),
  host: process.env.HOST || "0.0.0.0",
  rootDir,
  vaultDir: path.join(rootDir, "vault"),
  imagesDir: path.join(rootDir, "vault", "images"),
  exportDir: path.join(rootDir, "foundry-export"),
  dataDir: process.env.DATA_DIR || path.join(rootDir, "data"),
  mongoUri: String(process.env.MONGO_DISABLED || "").toLowerCase() === "true" ? "" : (process.env.MONGO_URI || ""),
  mongoDbName: process.env.MONGO_DB_NAME || "pf2_party_codex"
};
