import {
  parseMongoUri,
  parsePositiveInteger,
  parsePublicOrigin,
  parseStableEnvironmentId,
  requireEnvironmentValue,
  type EnvironmentSource
} from "./shared.js";

export interface WebServerEnvironment {
  readonly nodeEnv: "development" | "test" | "production";
  readonly appOrigin: string;
  readonly mongoUri: string;
  readonly mongoDatabase: string;
  readonly authSecret: string;
}

export interface WorkerEnvironment {
  readonly nodeEnv: "development" | "test" | "production";
  readonly workerId: string;
  readonly pollIntervalMs: number;
  readonly mongoUri: string;
  readonly mongoDatabase: string;
  readonly serviceCredential: string;
}

export interface DiscordBotEnvironment {
  readonly nodeEnv: "development" | "test" | "production";
  readonly connectorApiOrigin: string;
  readonly botToken: string;
  readonly serviceCredential: string;
}

function parseNodeEnvironment(source: EnvironmentSource): "development" | "test" | "production" {
  const value = requireEnvironmentValue(source, "NODE_ENV");
  if (value !== "development" && value !== "test" && value !== "production") {
    throw new Error("NODE_ENV is invalid");
  }
  return value;
}

function parseMongoEnvironment(source: EnvironmentSource): {
  readonly mongoUri: string;
  readonly mongoDatabase: string;
} {
  return {
    mongoUri: parseMongoUri(requireEnvironmentValue(source, "MONGO_URI"), "MONGO_URI"),
    mongoDatabase: parseStableEnvironmentId(
      requireEnvironmentValue(source, "MONGO_DB_NAME"),
      "MONGO_DB_NAME"
    )
  };
}

export function parseWebServerEnvironment(source: EnvironmentSource): WebServerEnvironment {
  const mongo = parseMongoEnvironment(source);
  return {
    nodeEnv: parseNodeEnvironment(source),
    appOrigin: parsePublicOrigin(
      requireEnvironmentValue(source, "NEXT_PUBLIC_APP_ORIGIN"),
      "NEXT_PUBLIC_APP_ORIGIN"
    ),
    ...mongo,
    authSecret: requireEnvironmentValue(source, "AUTH_SECRET", 32)
  };
}

export function parseWorkerEnvironment(source: EnvironmentSource): WorkerEnvironment {
  const mongo = parseMongoEnvironment(source);
  return {
    nodeEnv: parseNodeEnvironment(source),
    workerId: parseStableEnvironmentId(requireEnvironmentValue(source, "WORKER_ID"), "WORKER_ID"),
    pollIntervalMs: parsePositiveInteger(
      requireEnvironmentValue(source, "JOB_POLL_INTERVAL_MS"),
      "JOB_POLL_INTERVAL_MS",
      60_000
    ),
    ...mongo,
    serviceCredential: requireEnvironmentValue(source, "WORKER_SERVICE_CREDENTIAL", 32)
  };
}

export function parseDiscordBotEnvironment(source: EnvironmentSource): DiscordBotEnvironment {
  return {
    nodeEnv: parseNodeEnvironment(source),
    connectorApiOrigin: parsePublicOrigin(
      requireEnvironmentValue(source, "CONNECTOR_API_ORIGIN"),
      "CONNECTOR_API_ORIGIN"
    ),
    botToken: requireEnvironmentValue(source, "DISCORD_BOT_TOKEN", 32),
    serviceCredential: requireEnvironmentValue(source, "DISCORD_SERVICE_CREDENTIAL", 32)
  };
}
