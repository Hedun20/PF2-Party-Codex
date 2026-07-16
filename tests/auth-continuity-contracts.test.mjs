import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("password recovery links return through the login route and preserve the requested destination", () => {
  const routes = read("apps/server/src/routes/auth.js");
  const client = read("apps/web/src/api/client.js");
  const page = read("apps/web/src/pages/AuthPage.jsx");

  assert.match(routes, /async function queuePasswordResetEmail\(req, user, resetToken, returnTo = ""\)/);
  assert.match(routes, /const path = safeReturnTo\(returnTo\)/);
  assert.match(routes, /new URLSearchParams\(\{ resetToken \}\)/);
  assert.match(routes, /const resetUrl = `\$\{publicBase\(req\)\}\/login\?\$\{query\.toString\(\)\}`/);
  assert.match(routes, /queuePasswordResetEmail\(req, recovery\.user, recovery\.resetToken, req\.body\?\.returnTo\)/);
  assert.match(client, /requestPasswordReset: \(email, returnTo = ""\)/);
  assert.match(client, /JSON\.stringify\(\{ email, returnTo \}\)/);
  assert.match(page, /api\.requestPasswordReset\(form\.email, returnTo\)/);
  assert.match(page, /setParams\(loginSearchParams\(\{ reset: "1" \}\)\)/);
});

test("account creation survives confirmation delivery failure without leaving a dead registration screen", () => {
  const routes = read("apps/server/src/routes/auth.js");
  const page = read("apps/web/src/pages/AuthPage.jsx");
  const registerStart = routes.indexOf('authRouter.post("/auth/register"');
  const resendStart = routes.indexOf('authRouter.post("/auth/resend-verification"');
  const registerRoute = routes.slice(registerStart, resendStart);

  assert.match(registerRoute, /let verification = null/);
  assert.match(registerRoute, /Email verification could not be queued after account creation/);
  assert.match(registerRoute, /verificationQueued: Boolean\(verification\)/);
  assert.match(registerRoute, /Account created, but the confirmation email could not be queued/);
  assert.match(registerRoute, /res\.status\(201\)\.json/);
  assert.match(page, /setMessage\(data\.message \|\|/);
  assert.match(page, /setMode\("login"\)/);
});

test("verification resend and password reset requests keep account enumeration closed", () => {
  const routes = read("apps/server/src/routes/auth.js");
  const resendStart = routes.indexOf('authRouter.post("/auth/resend-verification"');
  const passwordStart = routes.indexOf('passwordRecoveryRouter.post("/request"');
  const resendRoute = routes.slice(resendStart, passwordStart);

  assert.match(resendRoute, /Email verification resend could not be queued/);
  assert.match(resendRoute, /res\.status\(202\)\.json/);
  assert.match(resendRoute, /If an unverified account exists for this email/);
  assert.match(routes, /If an active account exists for this email/);
  assert.doesNotMatch(resendRoute, /verificationSent|delivery\.status/);
});

test("unverified login exposes a machine-readable recovery code without changing generic credentials errors", () => {
  const routes = read("apps/server/src/routes/auth.js");
  assert.match(routes, /Invalid email or password\./);
  assert.match(routes, /code: "EMAIL_UNVERIFIED"/);
  assert.match(routes, /metadata: \{ reason: "email_unverified" \}/);
});

test("invitation auth copy promises continuity through verification and recovery", () => {
  const page = read("apps/web/src/pages/AuthPage.jsx");
  assert.match(page, /Verification and password recovery will return you to the same invitation/);
  assert.match(page, /api\.resendVerification\(form\.email, returnTo\)/);
});
