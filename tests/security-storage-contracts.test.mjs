import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { productionConfigIssues } from "../apps/server/src/config.js";
import { playerSafeEntry } from "../apps/server/src/repositories/entriesRepository.js";
import { createSessionToken, verifySessionToken } from "../apps/server/src/services/authTokens.js";
import { entryToCampaignPage } from "../apps/server/src/services/campaignContentService.js";
import { assertPlanCapacity, normalizeWorkspacePlan } from "../apps/server/src/services/entitlementsService.js";
import { platformAccessForUser } from "../apps/server/src/services/platformAccessService.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function read(relative) { return fs.readFile(path.join(root, relative), "utf8"); }

test("production configuration, platform access and entitlement boundaries fail closed", async () => {
  const env = {
    AUTH_SECRET: "a-unique-production-signing-secret-that-is-long-enough", MONGO_URI: "mongodb://database.example/party_codex",
    PUBLIC_APP_URL: "https://party.example.com", ALLOWED_ORIGINS: "https://party.example.com", EMAIL_MODE: "webhook",
    EMAIL_WEBHOOK_URL: "https://mail.example.com/party-codex", EMAIL_WEBHOOK_TOKEN: "webhook-token-with-enough-entropy",
    EMAIL_FROM: "Party Codex <noreply@example.com>", BILLING_MODE: "disabled"
  };
  assert.deepEqual(productionConfigIssues(env), []);
  assert.ok(productionConfigIssues({}).length >= 5);
  const owner = { email: "owner@example.com", emailVerified: true, status: "active", role: "owner" };
  assert.equal(platformAccessForUser(owner, { adminEmails: [] }).isAdmin, false);
  assert.equal(platformAccessForUser(owner, { adminEmails: ["owner@example.com"] }).isAdmin, true);
  assert.equal(platformAccessForUser({ ...owner, emailVerified: false }, { adminEmails: ["owner@example.com"] }).isAdmin, false);
  assert.equal(platformAccessForUser({ ...owner, platformRoles: ["admin"] }, { adminEmails: [] }).isAdmin, true);
  const token = createSessionToken({ id: "user-1", sessionVersion: 4, email: "must-not-leak@example.com", role: "owner" });
  assert.equal(verifySessionToken(token)?.sv, 4);
  assert.equal(verifySessionToken(`${token}.extra`), null);
  assert.doesNotMatch(Buffer.from(token.split(".")[0], "base64url").toString("utf8"), /must-not-leak|owner/);
  assert.equal(normalizeWorkspacePlan("local-dev"), "development");
  assert.doesNotThrow(() => assertPlanCapacity({ workspace: { plan: "free" }, resource: "campaigns", current: 2, increase: 1 }));
  assert.throws(() => assertPlanCapacity({ workspace: { plan: "free" }, resource: "campaigns", current: 3, increase: 1 }), (error) => error.code === "ENTITLEMENT_LIMIT" && error.status === 409);
  const email = await read("apps/server/src/services/emailService.js");
  assert.doesNotMatch(email, /readJson|writeJson|mail-outbox\.json/i);
  assert.match(email, /collections\.emailOutbox/);
  assert.match(email, /EMAIL_MODE|emailMode/);
});

test("campaign context stays explicit across API and invitation activation", async () => {
  const [client, session, identity, invitation] = await Promise.all([
    read("apps/web/src/api/client.js"), read("apps/server/src/services/sessionService.js"),
    read("apps/server/src/repositories/identityRepository.js"), read("apps/server/src/repositories/invitationsRepository.js")
  ]);
  assert.match(client, /"X-Campaign-Id"/);
  assert.match(session, /x-campaign-id/i);
  assert.doesNotMatch(identity, /already has an active campaign membership/i);
  assert.match(invitation, /setActiveCampaignForUser/);
});

test("player entry serialization removes GM content and hidden map data", () => {
  const raw = {
    _id: "entry-1", campaignId: "campaign-a", title: "Safe page", path: "lore/safe-page.md",
    publicContent: "Visible text", gmContent: "The hidden villain", visibility: "public", status: "active",
    source: { kind: "vaultImport", originalPath: "private/source.md" }, createdBy: "gm-user", updatedBy: "gm-user",
    metadata: {
      gmNotes: "never expose",
      frontmatter: {
        title: "Safe page", gmSecrets: "never expose", customPrivatePayload: { password: "never expose" },
        pins: [{ id: "public-pin", label: "Town", visibility: "public" }, { id: "secret-pin", label: "Lair", visibility: "gmOnly", gmNotes: "trap" }]
      },
      mapObjects: [{ id: "public-object", label: "Bridge", visibility: "revealed" }, { id: "secret-object", label: "Ambush", visibility: "hidden", secret: "bandits" }]
    }
  };
  const safe = playerSafeEntry(raw);
  assert.equal(safe.gmContent, "");
  assert.equal(safe.source, undefined);
  assert.equal(safe.createdBy, undefined);
  assert.equal(safe.metadata.gmNotes, undefined);
  assert.equal(safe.metadata.frontmatter.gmSecrets, undefined);
  assert.equal(safe.metadata.frontmatter.customPrivatePayload, undefined);
  assert.deepEqual(safe.metadata.pins.map((item) => item.id), ["public-pin"]);
  assert.deepEqual(safe.metadata.mapObjects.map((item) => item.id), ["public-object"]);
  const page = entryToCampaignPage(safe, "player");
  assert.doesNotMatch(JSON.stringify(page), /hidden villain|never expose|Ambush|bandits|private\/source/i);
  assert.deepEqual(page.pins.map((item) => item.id), ["public-pin"]);
  assert.deepEqual(page.mapObjects.map((item) => item.id), ["public-object"]);
});

test("Mongo remains the only live campaign store and browser fallbacks stay disabled", async () => {
  const [notes, characters, sessionDesk, reveal, server, importSource, authStore] = await Promise.all([
    read("apps/web/src/utils/playerNotes.js"), read("apps/web/src/utils/playerCharacters.js"), read("apps/web/src/pages/SessionModePage.jsx"),
    read("apps/server/src/services/revealService.js"), read("apps/server/src/index.js"), read("apps/server/src/routes/import.js"), read("apps/server/src/services/authStore.js")
  ]);
  assert.doesNotMatch(notes, /localStorage|browser fallback/i);
  assert.doesNotMatch(characters, /localStorage|browser fallback/i);
  assert.doesNotMatch(sessionDesk, /localStorage|browser fallback/i);
  assert.match(sessionDesk, /api\.(?:createSession|updateSession)/);
  assert.doesNotMatch(reveal, /new Map\s*\(/);
  assert.match(reveal, /collections\.handouts/);
  assert.match(server, /if \(!databaseStatus\.connected\)/);
  assert.doesNotMatch(importSource, /Vault remains the source of truth/i);
  assert.doesNotMatch(authStore, /readJson|writeJson|USERS_FILE|legacyPublicUser|fallbackOnMongoUnavailable/);
  assert.match(authStore, /requireMongoIdentity/);
});

test("registration and dev seed contain no dead or committed identity path", async () => {
  const [auth, seed] = await Promise.all([read("apps/web/src/pages/AuthPage.jsx"), read("apps/server/scripts/dev-create-owner-user.mjs")]);
  assert.doesNotMatch(auth, /first registered account becomes|Create GM|Create player|Continue as player preview/i);
  assert.match(auth, /workspace creation or an invitation/i);
  assert.match(auth, /to="\/guide"/);
  assert.match(seed, /process\.env\.DEV_OWNER_EMAIL/);
  assert.match(seed, /process\.env\.DEV_OWNER_PASSWORD/);
  assert.match(seed, /DEV_OWNER_SEED_CONFIRM/);
  assert.doesNotMatch(seed, /const\s+(?:email|password)\s*=\s*["'][^"']+["']/i);
  assert.doesNotMatch(seed, /memberships\.deleteMany|users\.deleteOne/);
  assert.match(seed, /Existing dev owner updated without changing userId/);
});
