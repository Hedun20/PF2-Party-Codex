import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { productionConfigIssues } from "../apps/server/src/config.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function productionBase(overrides = {}) {
  return {
    AUTH_SECRET: "s".repeat(48),
    MONGO_URI: "mongodb://staging.example.test:27017",
    PUBLIC_APP_URL: "https://pf2-party-codex-staging.onrender.com",
    ALLOWED_ORIGINS: "https://pf2-party-codex-staging.onrender.com",
    EMAIL_MODE: "outbox",
    ALLOW_OUTBOX_EMAIL_IN_PRODUCTION: "true",
    EMAIL_FROM: "Party Codex Staging <staging@pf2partycodex.com>",
    BILLING_MODE: "disabled",
    ...overrides
  };
}

test("staging may expose the new-account verification URL only behind explicit accepted outbox flags", () => {
  const accepted = productionConfigIssues(productionBase({
    ALLOW_STAGING_REGISTRATION_VERIFY_URL: "true"
  }));
  assert.deepEqual(accepted, []);

  const outboxNotAccepted = productionConfigIssues(productionBase({
    ALLOW_OUTBOX_EMAIL_IN_PRODUCTION: "false",
    ALLOW_STAGING_REGISTRATION_VERIFY_URL: "true"
  }));
  assert.equal(
    outboxNotAccepted.some((issue) => issue.includes("ALLOW_STAGING_REGISTRATION_VERIFY_URL=true requires")),
    true
  );

  const webhookMode = productionConfigIssues(productionBase({
    EMAIL_MODE: "webhook",
    EMAIL_WEBHOOK_URL: "https://mail.example.test/send",
    EMAIL_WEBHOOK_TOKEN: "w".repeat(32),
    ALLOW_OUTBOX_EMAIL_IN_PRODUCTION: "false",
    ALLOW_STAGING_REGISTRATION_VERIFY_URL: "true"
  }));
  assert.equal(
    webhookMode.some((issue) => issue.includes("ALLOW_STAGING_REGISTRATION_VERIFY_URL=true requires")),
    true
  );
});

test("accepted production outbox mode is a staging readiness dependency but never automatic delivery", () => {
  const config = read("apps/server/src/config.js");
  const email = read("apps/server/src/services/emailService.js");
  const health = read("apps/server/src/routes/health.js");
  const dockerfile = read("Dockerfile");

  assert.match(config, /allowOutboxEmailInProduction/);
  assert.match(email, /!config\.isProduction \|\| config\.allowOutboxEmailInProduction/);
  assert.match(email, /automaticDelivery: config\.emailMode === "webhook" && webhookReady/);
  assert.match(health, /ready: db\.ok && email\.ready/);
  assert.match(dockerfile, /if\(!r\.ok\|\|!body\.ready\)process\.exit\(1\)/);
});

test("staging verification escape hatch is limited to immediate registration response", () => {
  const routes = read("apps/server/src/routes/auth.js");
  const page = read("apps/web/src/pages/AuthPage.jsx");

  const registerStart = routes.indexOf('authRouter.post("/auth/register"');
  const resendStart = routes.indexOf('authRouter.post("/auth/resend-verification"');
  const passwordStart = routes.indexOf('passwordRecoveryRouter.post("/request"');
  const passwordCompleteStart = routes.indexOf('passwordRecoveryRouter.post("/complete"');
  const registerRoute = routes.slice(registerStart, resendStart);
  const resendRoute = routes.slice(resendStart, passwordStart);
  const passwordRequestRoute = routes.slice(passwordStart, passwordCompleteStart);

  assert.match(registerRoute, /config\.allowStagingRegistrationVerifyUrl/);
  assert.match(registerRoute, /devVerifyUrl:/);
  assert.doesNotMatch(resendRoute, /devVerifyUrl|verifyUrl/);
  assert.match(passwordRequestRoute, /devResetUrl: config\.isProduction \? undefined : devResetUrl/);
  assert.match(page, /setActionUrl\(data\.devVerifyUrl \|\| ""\)/);
  assert.match(page, /<a href=\{actionUrl\}>\{actionUrl\}<\/a>/);
});

test("Render blueprint and two-user guide use the explicit staging-only handoff", () => {
  const render = read("render.yaml");
  const guide = read("docs/deployment/STAGING_RENDER.md");
  const players = read("apps/web/src/pages/PlayersPage.jsx");

  assert.match(render, /EMAIL_MODE\n\s+value: outbox/);
  assert.match(render, /ALLOW_OUTBOX_EMAIL_IN_PRODUCTION\n\s+value: "true"/);
  assert.match(render, /ALLOW_STAGING_REGISTRATION_VERIFY_URL\n\s+value: "true"/);
  assert.match(guide, /one-time staging verification URL/i);
  assert.match(guide, /Players shows the newly generated invitation URL once/i);
  assert.match(guide, /Do not enable this flag in a real production deployment/i);
  assert.match(players, /data\.invitation\?\.inviteUrl/);
  assert.match(players, /Новая ссылка готова/);
});
