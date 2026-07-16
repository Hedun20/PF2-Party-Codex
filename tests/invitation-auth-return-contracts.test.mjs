import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("signed-out invitation keeps its return path without browser token storage", () => {
  const invite = read("apps/web/src/pages/InviteAcceptPage.jsx");

  assert.match(invite, /function authReturnPath/);
  assert.match(invite, /\/login\?returnTo=/);
  assert.match(invite, /encodeURIComponent\(invitePath\)/);
  assert.match(invite, /to=\{authReturnPath\(token\)\}/);
  assert.doesNotMatch(invite, /localStorage|sessionStorage/);
});

test("authentication accepts only local return paths and resumes the invite", () => {
  const auth = read("apps/web/src/pages/AuthPage.jsx");

  assert.match(auth, /function safeAuthReturnTo/);
  assert.match(auth, /!path\.startsWith\("\/"\)/);
  assert.match(auth, /path\.startsWith\("\/\/"\)/);
  assert.match(auth, /path\.includes\("\\\\"\)/);
  assert.match(auth, /params\.get\("returnTo"\)/);
  assert.match(auth, /navigate\(returnTo, \{ replace: true \}\)/);
  assert.match(auth, /returnTo\.startsWith\("\/invite\/"\)/);
  assert.doesNotMatch(auth, /localStorage\.setItem\([^\n]*invite/i);
});

test("registration and verification carry the validated return path", () => {
  const auth = read("apps/web/src/pages/AuthPage.jsx");
  const client = read("apps/web/src/api/client.js");
  const routes = read("apps/server/src/routes/auth.js");

  assert.match(auth, /api\.register\(\{ name: form\.name, email: form\.email, password: form\.password, returnTo \}\)/);
  assert.match(auth, /api\.resendVerification\(form\.email, returnTo\)/);
  assert.match(client, /resendVerification: \(email, returnTo = ""\)/);
  assert.match(routes, /function safeReturnTo/);
  assert.match(routes, /queueVerificationEmail\(req, created\.user, created\.verifyToken, req\.body\?\.returnTo\)/);
  assert.match(routes, /verificationRedirect\("1", returnTo\)/);
  assert.match(routes, /verificationRedirect\("invalid", returnTo\)/);
});
