import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("invitation acceptance claims a pending token before membership activation", () => {
  const repository = read("apps/server/src/repositories/invitationAcceptanceRepository.js");
  const claim = repository.indexOf("const claim = await invitations().updateOne");
  const activate = repository.indexOf("membership = await activateClaimedMembership", claim);
  const finalize = repository.indexOf("const finalized = await invitations().updateOne", activate);

  assert.ok(claim >= 0 && activate > claim && finalize > activate, "claim must happen before access activation and finalization");
  assert.match(repository.slice(claim, activate), /status: "pending"/);
  assert.match(repository.slice(claim, activate), /status: "accepting"/);
  assert.match(repository.slice(claim, activate), /acceptingBy: fullUser\._id/);
  assert.match(repository.slice(claim, activate), /tokenHash/);
});

test("failed membership activation releases the invitation claim for retry", () => {
  const repository = read("apps/server/src/repositories/invitationAcceptanceRepository.js");
  const activation = repository.indexOf("membership = await activateClaimedMembership");
  const finalize = repository.indexOf("const acceptedAt", activation);
  const activationBlock = repository.slice(activation, finalize);

  assert.match(activationBlock, /catch \(error\)/);
  assert.match(activationBlock, /status: "accepting"/);
  assert.match(activationBlock, /status: "pending"/);
  assert.match(activationBlock, /\$unset: \{ acceptingBy: "", acceptingAt: "" \}/);
});

test("stale acceptance locks recover while fresh concurrent requests are rejected", () => {
  const repository = read("apps/server/src/repositories/invitationAcceptanceRepository.js");

  assert.match(repository, /ACCEPT_LOCK_MS/);
  assert.match(repository, /Date\.now\(\) - acceptingAt >= ACCEPT_LOCK_MS/);
  assert.match(repository, /status: "accepting"/);
  assert.match(repository, /INVITATION_ACCEPTING/);
  assert.match(repository, /Invitation acceptance is already in progress\. Retry in a moment\./);
});

test("accepted links never recreate revoked membership access", () => {
  const repository = read("apps/server/src/repositories/invitationAcceptanceRepository.js");
  const acceptedStart = repository.indexOf('if (status === "accepted")');
  const acceptingStart = repository.indexOf('if (status === "accepting")', acceptedStart);
  const branch = repository.slice(acceptedStart, acceptingStart);

  assert.match(branch, /existingAcceptedMembership\(invitation, fullUser\)/);
  assert.match(repository, /INVITATION_ACCESS_REVOKED/);
  assert.doesNotMatch(branch, /activateClaimedMembership/);
  assert.match(branch, /idempotent: true/);
});

test("accept route uses the guarded acceptance lifecycle and audits only first success", () => {
  const routes = read("apps/server/src/routes/memberships.js");
  assert.match(routes, /acceptInvitationSafely/);
  assert.match(routes, /const accepted = await acceptInvitationSafely/);
  assert.match(routes, /if \(!accepted\.idempotent\)/);
  assert.match(routes, /action: "invitations\.accept"/);
});

test("invite UI exposes an accepting recovery state instead of a dead end", () => {
  const page = read("apps/web/src/pages/InviteAcceptPage.jsx");
  assert.match(page, /const processing = status === "accepting"/);
  assert.match(page, /Принятие уже выполняется/);
  assert.match(page, /Проверить статус/);
  assert.match(page, /Повторить принятие/);
  assert.match(page, /\[409, 410\]\.includes/);
  assert.match(page, /await loadPreview\(\)/);
});
