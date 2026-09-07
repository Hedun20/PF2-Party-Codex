import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function source(relativePath) {
  return fs.readFile(path.join(rootDir, relativePath), "utf8");
}

test("Discord linking is one-time-code based and never accepts a browser-supplied Discord user id", async () => {
  const [repository, routes, client, panel] = await Promise.all([
    source("apps/server/src/repositories/discordIdentityRepository.js"),
    source("apps/server/src/routes/memberships.js"),
    source("apps/web/src/api/client.js"),
    source("apps/web/src/components/DiscordIdentityPanel.jsx")
  ]);

  assert.match(repository, /randomInt/);
  assert.match(repository, /sha256/);
  assert.match(repository, /codeHash/);
  assert.doesNotMatch(repository, /pairingCode:\s*pairingCode[,\n]/);
  assert.match(routes, /\/internal\/discord\/identity\/confirm/);
  assert.match(routes, /x-party-codex-service-credential/);
  assert.match(routes, /timingSafeEqual/);
  assert.match(client, /createDiscordIdentityChallenge/);
  assert.match(client, /unlinkDiscordIdentity/);
  assert.doesNotMatch(panel, /name=["']discordUserId|id=["']discordUserId|placeholder=["'][^"']*Discord ID/i);
  assert.match(panel, /одноразов/i);
});

test("Discord identity is subordinate to exact campaign membership and revoked before membership access disappears", async () => {
  const [repository, membershipManagement] = await Promise.all([
    source("apps/server/src/repositories/discordIdentityRepository.js"),
    source("apps/server/src/repositories/membershipManagementRepository.js")
  ]);

  assert.match(repository, /workspaceId:\s*scope\.workspaceId[\s\S]*campaignId:\s*scope\.campaignId[\s\S]*membershipId:\s*scope\.membershipId[\s\S]*userId:\s*scope\.userId[\s\S]*status:\s*["']active["']/);
  assert.match(repository, /DISCORD_IDENTITY_MEMBERSHIP_INACTIVE/);
  const revokePosition = membershipManagement.indexOf("await revokeDiscordIdentityForMembership");
  const removePosition = membershipManagement.indexOf("status: \"removed\"");
  assert.ok(revokePosition >= 0 && removePosition >= 0 && revokePosition < removePosition, "Discord identity must be revoked before membership removal");
});

test("active Discord bindings are protected by partial unique indexes while revoked history remains legal", async () => {
  const indexes = await source("apps/server/src/repositories/discordIdentityConcurrencyIndexes.js");
  assert.match(indexes, /campaignId:\s*1,\s*membershipId:\s*1/);
  assert.match(indexes, /campaignId:\s*1,\s*discordUserId:\s*1/);
  assert.equal((indexes.match(/unique:\s*true/g) || []).length, 2);
  assert.equal((indexes.match(/partialFilterExpression:\s*\{\s*status:\s*["']active["']\s*\}/g) || []).length, 2);
});

test("profile exposes pairing status and recovery instead of a dead settings endpoint", async () => {
  const [profile, panel, client] = await Promise.all([
    source("apps/web/src/pages/ProfilePage.jsx"),
    source("apps/web/src/components/DiscordIdentityPanel.jsx"),
    source("apps/web/src/api/client.js")
  ]);
  assert.match(profile, /<DiscordIdentityPanel\s+session=\{session\}/);
  assert.match(panel, /Обновить статус/);
  assert.match(panel, /Отключить Discord/);
  assert.match(panel, /setInterval/);
  assert.match(client, /discordIdentity:\s*\(campaignId\)/);
});

test("production cannot enable Discord pairing without a separate service credential", async () => {
  const config = await source("apps/server/src/config.js");
  assert.match(config, /DISCORD_IDENTITY_LINK_ENABLED/);
  assert.match(config, /DISCORD_SERVICE_CREDENTIAL/);
  assert.match(config, /discordServiceCredential/);
  assert.match(config, /discordIdentityLinkEnabled/);
});
