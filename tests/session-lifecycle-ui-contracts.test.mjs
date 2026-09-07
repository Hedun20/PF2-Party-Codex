import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

test("web API exposes every GM session lifecycle action through the campaign-scoped client", async () => {
  const client = await source("apps/web/src/api/client.js");
  assert.match(client, /function sessionLifecyclePath\(sessionId, action = ""\)/);
  for (const method of [
    "sessionLifecycle",
    "initializeSessionLifecycle",
    "connectSessionLifecycle",
    "startSessionLifecycle",
    "pauseSessionLifecycle",
    "endSessionLifecycle",
    "queueSessionLifecycle",
    "publishSessionLifecycle",
    "cancelSessionLifecycle",
    "recoverSessionLifecycle"
  ]) {
    assert.match(client, new RegExp(`\\b${method}:`), `Missing lifecycle API method ${method}`);
  }
  assert.match(client, /"X-Campaign-Id"/);
});

test("Session Mode keeps lifecycle controls GM-only and surfaces progress, retry and stale recovery", async () => {
  const page = await source("apps/web/src/pages/SessionModePage.jsx");
  assert.match(page, /function SessionLifecyclePanel\(\{ sessionId, canEdit \}\)/);
  assert.match(page, /if \(!canEdit\) return null/);
  assert.match(page, /<progress\b/);
  assert.match(page, /processingVersion/);
  assert.match(page, /safeErrorCode/);
  assert.match(page, /case "failed": return \{ action: "queue"/);
  assert.match(page, /case "processing": return \{ action: "recover"/);
  assert.match(page, /api\.recoverSessionLifecycle/);
  assert.match(page, /Recovery сработает только после истечения worker lease/);
});

test("Session Desk connection is explicit manual evidence and cannot impersonate an integration connection", async () => {
  const page = await source("apps/web/src/pages/SessionModePage.jsx");
  const helper = page.match(/function manualSessionDeskSource\(\) \{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(helper, /provider: "manual"/);
  assert.match(helper, /connectionId: null/);
  assert.match(helper, /stream: "gm\.sessionDesk"/);
  assert.match(helper, /schemaVersion: "manual-v1"/);
  assert.match(helper, /adapterVersion: "session-desk-v1"/);
  assert.doesNotMatch(helper, /foundry|discord/i);
});
