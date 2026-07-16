import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("password recovery stores hashed single-use tokens and revokes prior sessions", () => {
  const store = read("apps/server/src/services/authStore.js");

  assert.match(store, /passwordResetTokens/);
  assert.match(store, /createHash\("sha256"\)/);
  assert.match(store, /randomBytes\(32\)/);
  assert.match(store, /PASSWORD_RESET_TTL_MS/);
  assert.match(store, /usedAt:\s*""/);
  assert.match(store, /expiresAt:\s*\{\s*\$gte:/);
  assert.match(store, /sessionVersion:\s*Number\(user\.sessionVersion \|\| 1\) \+ 1/);
  assert.doesNotMatch(store, /resetToken:\s*reset\.token[\s\S]*insertOne/);
});

test("account recovery endpoints are rate limited and do not disclose account existence", () => {
  const routes = read("apps/server/src/routes/auth.js");

  assert.match(routes, /passwordRecoveryRouter\.post\("\/request", authAttemptLimiter/);
  assert.match(routes, /passwordRecoveryRouter\.post\("\/complete", authAttemptLimiter/);
  assert.match(routes, /authRouter\.use\("\/auth\/password-recovery", passwordRecoveryRouter\)/);
  assert.match(routes, /If an active account exists for this email/);
  assert.match(routes, /config\.isProduction \? undefined : devResetUrl/);
  assert.match(routes, /auth\.password\.reset\.requested/);
  assert.match(routes, /auth\.password\.reset\.completed/);
});

test("web auth supports request and completion without exposing reset tokens in storage", () => {
  const client = read("apps/web/src/api/client.js");
  const page = read("apps/web/src/pages/AuthPage.jsx");
  const email = read("apps/server/src/services/emailService.js");

  assert.match(client, /requestPasswordReset/);
  assert.match(client, /resetPassword/);
  assert.match(page, /params\.get\("resetToken"\)/);
  assert.match(page, /confirmPassword/);
  assert.match(page, /Forgot password\?/);
  assert.match(page, /Completing the reset signs out existing sessions/);
  assert.match(email, /passwordResetEmailTemplate/);
  assert.match(email, /expires after one hour/);
});
