import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForHealth(baseUrl, logs) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become ready.\n${logs()}`);
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual", ...options });
  return {
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    requestId: response.headers.get("x-request-id") || "",
    cacheControl: response.headers.get("cache-control") || "",
    contentSecurityPolicy: response.headers.get("content-security-policy") || "",
    body: await response.text()
  };
}

test("server starts safely and guest campaign reads stay closed", { timeout: 20_000 }, async (context) => {
  const port = await availablePort();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "party-codex-smoke-"));
  const baseUrl = `http://127.0.0.1:${port}`;
  let output = "";
  const server = spawn(process.execPath, ["apps/server/src/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      AUTH_SECRET: "route-smoke-secret-at-least-32-characters",
      MONGO_DISABLED: "true",
      DATA_DIR: dataDir,
      PORT: String(port),
      HOST: "127.0.0.1",
      ALLOWED_ORIGINS: "http://localhost:5173"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.stdout.on("data", (chunk) => { output += chunk; });
  server.stderr.on("data", (chunk) => { output += chunk; });

  context.after(async () => {
    if (server.exitCode === null) {
      server.kill("SIGTERM");
      await new Promise((resolve) => server.once("exit", resolve));
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  await waitForHealth(baseUrl, () => output);
  assert.equal(server.exitCode, null, output);

  const health = await request(baseUrl, "/api/health");
  assert.equal(health.status, 200);
  assert.match(health.contentType, /application\/json/);
  assert.match(health.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(health.cacheControl, "no-store");
  assert.ok(health.contentSecurityPolicy);
  assert.equal(JSON.parse(health.body).ready, false);

  const databaseHealth = await request(baseUrl, "/api/health/db");
  assert.equal(databaseHealth.status, 503);

  const registration = await request(baseUrl, "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "offline@example.com", password: "not-a-real-password", name: "Offline" })
  });
  assert.equal(registration.status, 503);
  assert.match(registration.body, /Mongo identity storage is not connected/);

  for (const pathname of [
    "/api/pages",
    "/api/page?path=worlds%2Fvaldran.md",
    "/api/preview?path=worlds%2Fvaldran.md",
    "/api/categories",
    "/api/search?q=valdran",
    "/api/reveal",
    "/api/assets/list",
    "/api/assets/missing.png",
    "/api/metadata",
    "/api/campaigns",
    "/api/entries",
    "/api/notes",
    "/api/characters",
    "/api/maps",
    "/api/sessions",
    "/api/handouts",
    "/api/subscription",
    "/api/platform/status",
    "/api/health/identity"
  ]) {
    const response = await request(baseUrl, pathname);
    assert.ok([401, 403].includes(response.status), `${pathname} returned ${response.status}`);
    assert.match(response.contentType, /application\/json/, pathname);
  }

  const missingApi = await request(baseUrl, "/api/definitely-missing");
  assert.equal(missingApi.status, 404);
  assert.match(missingApi.contentType, /application\/json/);
  assert.match(missingApi.body, /API route not found/);

  const missingPage = await request(baseUrl, "/definitely-missing");
  assert.equal(missingPage.status, 200);
  assert.match(missingPage.contentType, /text\/html/);
  assert.equal(server.exitCode, null, output);
});
