import { MongoClient } from "mongodb";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let client = null;
let db = null;
let status = {
  mode: "legacy",
  configured: false,
  connected: false,
  database: config.mongoDbName,
  driver: "mongodb",
  error: null,
  message: "MONGO_URI is not configured; campaign data APIs are unavailable. Markdown remains import/export compatibility only."
};

function sanitizeMongoError(error) {
  const message = String(error?.message || error || "MongoDB connection failed.");
  return message
    .replace(/mongodb(?:\+srv)?:\/\/([^:@/]+):([^@/]+)@/gi, "mongodb://$1:<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>");
}

function setDisconnectedStatus(message, error = null) {
  status = {
    mode: config.mongoUri ? "mongo" : "legacy",
    configured: Boolean(config.mongoUri),
    connected: false,
    database: config.mongoDbName,
    driver: "mongodb",
    error: error ? sanitizeMongoError(error) : null,
    message
  };
  return status;
}

export async function connectMongo() {
  if (!config.mongoUri) {
    setDisconnectedStatus("MONGO_URI is not configured; campaign data APIs are unavailable. Markdown remains import/export compatibility only.");
    logger.warn(status.message);
    return status;
  }

  if (db) return status;

  status = {
    mode: "mongo",
    configured: true,
    connected: false,
    database: config.mongoDbName,
    driver: "mongodb",
    error: null,
    message: "Connecting to MongoDB..."
  };

  try {
    client = new MongoClient(config.mongoUri, {
      appName: "pf2-party-codex",
      serverSelectionTimeoutMS: 8000
    });
    await client.connect();
    db = client.db(config.mongoDbName);
    await db.command({ ping: 1 });
    status = {
      mode: "mongo",
      configured: true,
      connected: true,
      database: db.databaseName,
      driver: "mongodb",
      error: null,
      message: "MongoDB connected."
    };
    logger.info(status.message, { database: status.database });
    return status;
  } catch (error) {
    const sanitized = sanitizeMongoError(error);
    await closeMongo({ silent: true });
    status = {
      mode: "mongo",
      configured: true,
      connected: false,
      database: config.mongoDbName,
      driver: "mongodb",
      error: sanitized,
      message: "MongoDB connection failed. Campaign data APIs are unavailable; Markdown remains import/export compatibility only."
    };
    logger.warn(`${status.message} ${status.error}`);
    return status;
  }
}

export function getDb() {
  if (!db) {
    setDisconnectedStatus(config.mongoUri ? "MongoDB is configured but not connected." : "MongoDB is not configured.");
    const error = new Error("MongoDB is not connected.");
    error.status = 503;
    throw error;
  }
  return db;
}

export function isMongoConnected() {
  return Boolean(db && status.connected);
}

export function mongoStatus() {
  return { ...status, connected: Boolean(db && status.connected) };
}

export async function closeMongo(options = {}) {
  if (client) await client.close();
  client = null;
  db = null;
  if (!options.silent) {
    setDisconnectedStatus(config.mongoUri ? "MongoDB connection closed." : "MONGO_URI is not configured; campaign data APIs are unavailable. Markdown remains import/export compatibility only.");
  }
}
