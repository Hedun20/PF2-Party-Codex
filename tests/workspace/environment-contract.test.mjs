import assert from "node:assert/strict";
import test from "node:test";

import { parseFoundryPublicConfig } from "@pf2-party-codex/config/foundry";
import { parsePublicWebEnvironment } from "@pf2-party-codex/config/public";
import {
  parseDiscordBotEnvironment,
  parseWebServerEnvironment,
  parseWorkerEnvironment
} from "@pf2-party-codex/config/server";

const authSecret = "auth-secret-redacted-12345678901234567890";
const serviceCredential = "service-credential-redacted-123456789012345";

function serverEnvironment(overrides = {}) {
  return {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_ORIGIN: "https://codex.example.test",
    MONGO_URI: "mongodb://redacted.invalid/pf2",
    MONGO_DB_NAME: "pf2_test",
    AUTH_SECRET: authSecret,
    ...overrides
  };
}

test("web, worker, bot and Foundry configuration surfaces are explicit", () => {
  assert.equal(parseWebServerEnvironment(serverEnvironment()).nodeEnv, "test");
  assert.equal(
    parsePublicWebEnvironment({ NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000" }).appOrigin,
    "http://localhost:3000"
  );
  assert.equal(
    parsePublicWebEnvironment({ NEXT_PUBLIC_APP_ORIGIN: "https://codex.example.test:65535" })
      .appOrigin,
    "https://codex.example.test:65535"
  );
  assert.equal(
    parseWorkerEnvironment({
      ...serverEnvironment(),
      WORKER_ID: "worker-test-001",
      JOB_POLL_INTERVAL_MS: "1000",
      WORKER_SERVICE_CREDENTIAL: serviceCredential
    }).workerId,
    "worker-test-001"
  );
  assert.equal(
    parseDiscordBotEnvironment({
      NODE_ENV: "test",
      CONNECTOR_API_ORIGIN: "https://codex.example.test",
      DISCORD_BOT_TOKEN: "discord-token-redacted-12345678901234567890",
      DISCORD_SERVICE_CREDENTIAL: serviceCredential
    }).connectorApiOrigin,
    "https://codex.example.test"
  );
  assert.equal(
    parseFoundryPublicConfig({
      connectorApiOrigin: "https://codex.example.test",
      systemId: "pf2e"
    }).systemId,
    "pf2e"
  );
});

test("environment errors fail closed without echoing secret values", () => {
  for (const candidate of [
    () => parseWebServerEnvironment(serverEnvironment({ AUTH_SECRET: "short-secret" })),
    () => parsePublicWebEnvironment({ NEXT_PUBLIC_APP_ORIGIN: "https://codex.example.test:99999" }),
    () => parsePublicWebEnvironment({ NEXT_PUBLIC_APP_ORIGIN: "https://codex.example.test:0" }),
    () => parsePublicWebEnvironment({ NEXT_PUBLIC_APP_ORIGIN: "https://user@codex.example.test" }),
    () => parsePublicWebEnvironment({ NEXT_PUBLIC_APP_ORIGIN: "https://codex.example.test/path" }),
    () =>
      parseWorkerEnvironment({
        ...serverEnvironment(),
        WORKER_ID: "worker-test-001",
        JOB_POLL_INTERVAL_MS: "0",
        WORKER_SERVICE_CREDENTIAL: serviceCredential
      }),
    () =>
      parseDiscordBotEnvironment({
        NODE_ENV: "test",
        CONNECTOR_API_ORIGIN: "http://private.example.test",
        DISCORD_BOT_TOKEN: "discord-token-redacted-12345678901234567890",
        DISCORD_SERVICE_CREDENTIAL: serviceCredential
      })
  ]) {
    assert.throws(candidate, (error) => {
      assert.equal(error instanceof Error, true);
      assert.equal(error.message.includes(authSecret), false);
      assert.equal(error.message.includes(serviceCredential), false);
      return true;
    });
  }
});
