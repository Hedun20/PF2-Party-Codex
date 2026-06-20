import cors from "cors";
import express from "express";
import os from "os";
import path from "path";
import { config } from "./config.js";
import { assetsRouter } from "./routes/assets.js";
import { categoriesRouter } from "./routes/categories.js";
import { foundryRouter } from "./routes/foundry.js";
import { healthRouter } from "./routes/health.js";
import { pagesRouter } from "./routes/pages.js";
import { searchRouter } from "./routes/search.js";
import { toolsRouter } from "./routes/tools.js";
import { startVaultWatcher } from "./services/fileWatchService.js";
import { rebuildVaultIndex } from "./services/vaultService.js";
import { sessionPayload } from "./middleware/sessionMode.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.get("/api/session", (req, res) => res.json(sessionPayload(req)));

app.use("/api", healthRouter);
app.use("/api", pagesRouter);
app.use("/api", categoriesRouter);
app.use("/api", searchRouter);
app.use("/api", foundryRouter);
app.use("/api", toolsRouter);
app.use("/api", assetsRouter);

const webDist = path.join(config.rootDir, "apps", "web", "dist");
app.use("/fonts", express.static(path.join(webDist, "fonts"), { fallthrough: false, index: false }));
app.use(express.static(webDist));
app.get("*", (_req, res, next) => {
  res.sendFile(path.join(webDist, "index.html"), (error) => error && next());
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || "Unexpected server error" });
});

function localIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

await rebuildVaultIndex();
startVaultWatcher();

const server = app.listen(config.port, config.host, () => {
  console.log(`PF2 Party Codex running at http://localhost:${config.port}`);
  for (const ip of localIps()) console.log(`LAN URL: http://${ip}:${config.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${config.port} is already in use. Stop the existing PF2 Party Codex server or set PORT to another value.`);
    process.exit(1);
  }
  throw error;
});
