import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { config } from "./config.js";
import { attachUser } from "./middleware/auth.js";
import { archiveRouter } from "./routes/archive.js";
import { assetsRouter } from "./routes/assets.js";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { categoriesRouter } from "./routes/categories.js";
import { charactersRouter } from "./routes/characters.js";
import { entriesRouter } from "./routes/entries.js";
import { foundryRouter } from "./routes/foundry.js";
import { healthRouter } from "./routes/health.js";
import { importRouter } from "./routes/import.js";
import { invitationsRouter, membershipsRouter } from "./routes/memberships.js";
import { notesRouter } from "./routes/notes.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { pagesRouter } from "./routes/pages.js";
import { pf2Router } from "./routes/pf2.js";
import { revealRouter } from "./routes/reveal.js";
import { searchRouter } from "./routes/search.js";
import { toolsRouter } from "./routes/tools.js";
import { worldSystemsRouter } from "./routes/worldSystems.js";
import { sessionInfo } from "./services/sessionService.js";
import { logger } from "./utils/logger.js";

export function createApp({ appConfig = config, appLogger = logger } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || appConfig.allowedOrigins.includes(origin)) return callback(null, true);
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

  const webDist = path.join(appConfig.rootDir, "apps", "web", "dist");
  app.use("/fonts", express.static(path.join(webDist, "fonts"), { fallthrough: false, index: false }));
  app.use(express.static(webDist));
  app.get("*", (_req, res, next) => {
    res.sendFile(path.join(webDist, "index.html"), (error) => error && next());
  });

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    appLogger.error("Request failed", { status, error: error.message || String(error) });
    res.status(status).json({ error: error.message || "Unexpected server error" });
  });
  return app;
}
