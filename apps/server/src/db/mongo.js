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
  message: "MONGO_URI is not configured; using legacy Markdown/JSON storage."
};

function sanitizeMongoError(error) {
  const message = String(error?.message || error || "MongoDB connection failed.");
  return message
    .replace(/mongodb(?:\+srv)?:\/\/([^:@/]+):([^@/]+)@/gi, "mongodb://$1:<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>");
}

export async function connectMongo() {
  if (!config.mongoUri) {
    status = {
      mode: "legacy",
      configured: false,
      connected: false,
      database: config.mongoDbName,
      driver: "mongodb",
      error: null,
      message: "MONGO_URI is not configured; using legacy Markdown/JSON storage."
    };
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
    status = {
      mode: "mongo",
      configured: true,
      connected: false,
      database: config.mongoDbName,
      driver: "mongodb",
      error: sanitizeMongoError(error),
      message: "MongoDB connection failed. Legacy storage remains available."
    };
    logger.warn(`${status.message} ${status.error}`);
    await closeMongo();
    return status;
  }
}

export function getDb() {
  if (!db) {
    const error = new Error("MongoDB is not connected.");
    error.status = 503;
    throw error;
  }
  return db;
}

export function mongoStatus() {
  return { ...status };
}

export async function closeMongo() {
  if (client) await client.close();
  client = null;
  db = null;
}
