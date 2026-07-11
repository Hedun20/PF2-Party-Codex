import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { config } from "./config.js";
import { closeMongo, connectMongo } from "./db/mongo.js";
import { attachUser } from "./middleware/auth.js";
import { archiveRouter } from "./routes/archive.js";
import { assetsRouter } from "./routes/assets.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { charactersRouter } from "./routes/characters.js";
import { entriesRouter } from "./routes/entries.js";
import { foundryRouter } from "./routes/foundry.js";
import { importRouter } from "./routes/import.js";
import { invitationsRouter, membershipsRouter } from "./routes/memberships.js";
import { healthRouter } from "./routes/health.js";
import { notesRouter } from "./routes/notes.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { worldSystemsRouter } from "./routes/worldSystems.js";
import { pagesRouter } from "./routes/pages.js";
import { pf2Router } from "./routes/pf2.js";
import { revealRouter } from "./routes/reveal.js";
import { searchRouter } from "./routes/search.js";
import { toolsRouter } from "./routes/tools.js";
import { ensureIdentityIndexes } from "./repositories/identityRepository.js";
import { ensureInvitationIndexes } from "./repositories/invitationsRepository.js";
import { ensureCodexIndexes } from "./repositories/entriesRepository.js";
import { ensureWorldSystemIndexes } from "./repositories/worldSystemsRepository.js";
import { startVaultWatcher } from "./services/fileWatchService.js";
import { rebuildVaultIndex } from "./services/vaultService.js";
import { sessionInfo } from "./services/sessionService.js";
import { logger } from "./utils/logger.js";
import { localIpv4Addresses } from "./utils/network.js";

const app = express();
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error("Origin is not allowed by CORS.");
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: "6mb" }));
app.use(attachUser);
app.get("/api/session", async (req, res, next) => {
  try {
    res.json(await sessionInfo(req));
  } catch (error) {
    next(error);
  }
});

app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", onboardingRouter);
app.use("/api", campaignsRouter);
app.use("/api", membershipsRouter);
app.use("/api", invitationsRouter);
app.use("/api", notesRouter);
app.use("/api", charactersRouter);
app.use("/api", entriesRouter);
app.use("/api", worldSystemsRouter);
app.use("/api", importRouter);
app.use("/api", pagesRouter);
app.use("/api", pf2Router);
app.use("/api", revealRouter);
app.use("/api", categoriesRouter);
app.use("/api", searchRouter);
app.use("/api", foundryRouter);
app.use("/api", toolsRouter);
app.use("/api/campaigns/:campaignId/archive", archiveRouter);
app.use("/api/archive", archiveRouter);
app.use("/api", assetsRouter);
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
});

const webDist = path.join(config.rootDir, "apps", "web", "dist");
app.use("/fonts", express.static(path.join(webDist, "fonts"), { fallthrough: false, index: false }));
app.use(express.static(webDist));
app.get("*", (_req, res, next) => {
  res.sendFile(path.join(webDist, "index.html"), (error) => error && next());
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  logger.error("Request failed", { status, error: error.message || String(error) });
  res.status(status).json({ error: error.message || "Unexpected server error" });
});

const databaseStatus = await connectMongo();
await ensureIdentityIndexes();
await ensureInvitationIndexes();
await ensureCodexIndexes();
await ensureWorldSystemIndexes();
if (!databaseStatus.connected) {
  await rebuildVaultIndex();
  startVaultWatcher();
} else {
  logger.info("MongoDB is the active content source. Markdown vault remains available only for explicit import/export compatibility.");
}

const server = app.listen(config.port, config.host, () => {
  logger.info(`Party Codex running at http://localhost:${config.port}`);
  for (const ip of localIpv4Addresses()) logger.info(`LAN URL: http://${ip}:${config.port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.error(`Port ${config.port} is already in use. Stop the existing Party Codex server or set PORT to another value.`);
    process.exit(1);
  }
  throw error;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await closeMongo();
    server.close(() => process.exit(0));
  });
}
