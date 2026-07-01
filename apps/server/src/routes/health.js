import { Router } from "express";
import { plannedIndexes } from "../db/indexes.js";
import { mongoStatus } from "../db/mongo.js";
import { identityCounts } from "../repositories/identityRepository.js";

export const healthRouter = Router();

function dbHealthPayload() {
  const db = mongoStatus();
  const ok = db.mode === "legacy" ? true : db.connected;
  return {
    ok,
    mode: db.mode,
    connected: db.connected,
    database: db.database,
    hasMongoUri: db.configured,
    driver: db.driver || "mongodb",
    plannedIndexes,
    error: db.error || null
  };
}

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true, app: "PF2 Party Codex", db: dbHealthPayload() });
});

healthRouter.get("/health/db", (_req, res) => {
  const payload = dbHealthPayload();
  res.status(payload.ok ? 200 : 503).json(payload);
});

healthRouter.get("/health/identity", async (_req, res, next) => {
  try {
    const payload = await identityCounts();
    res.status(payload.ok ? 200 : 503).json(payload);
  } catch (error) {
    next(error);
  }
});