import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { invitationState, maskInvitationEmail } from "../apps/server/src/repositories/invitationsRepository.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("invitation previews mask email addresses and classify expiry deterministically", () => {
  const hint = maskInvitationEmail("timur.abbs@example.com");
  assert.equal(hint, "t***s@e***.com");
  assert.doesNotMatch(hint, /timur|example/);

  const stamp = Date.parse("2026-07-16T18:00:00.000Z");
  assert.equal(invitationState({ status: "pending", expiresAt: "2026-07-16T17:59:59.000Z" }, stamp), "expired");
  assert.equal(invitationState({ status: "pending", expiresAt: "2026-07-16T18:00:01.000Z" }, stamp), "pending");
  assert.equal(invitationState({ status: "accepted", expiresAt: "2026-07-01T00:00:00.000Z" }, stamp), "accepted");
});

test("new invitations persist only a token hash and scrub legacy plaintext invite URLs", () => {
  const repository = read("apps/server/src/repositories/invitationsRepository.js");
  const createStart = repository.indexOf("export async function createCampaignInvitation");
  const documentStart = repository.indexOf("const invitation = {", createStart);
  const documentEnd = repository.indexOf("const result =", documentStart);
  const persistedDocument = repository.slice(documentStart, documentEnd);

  assert.match(persistedDocument, /tokenHash: hashInvitationToken\(token\)/);
  assert.doesNotMatch(persistedDocument, /\binviteUrl\b/);
  assert.match(repository, /updateMany\(\{ inviteUrl: \{ \$exists: true \} \}, \{ \$unset: \{ inviteUrl: "" \} \}\)/);
  assert.match(repository, /includeInviteUrl && inviteUrl/);
});

test("public preview subrouter does not require login and exposes only the preview contract", () => {
  const routes = read("apps/server/src/routes/memberships.js");
  const previewStart = routes.indexOf('invitationPreviewRouter.get("/"');
  const previewEnd = routes.indexOf('invitationsRouter.use("/invitations/:token/preview"', previewStart);
  const previewRoute = routes.slice(previewStart, previewEnd);

  assert.ok(previewStart >= 0);
  assert.match(previewRoute, /getInvitationPreview\(\{ token: req\.params\.token \|\| "", user: req\.user \|\| null \}\)/);
  assert.doesNotMatch(previewRoute, /requireUser\(req\)/);
  assert.match(routes, /invitationsRouter\.use\("\/invitations\/:token\/preview", invitationPreviewRouter\)/);
  assert.match(routes, /if \(!accepted\.idempotent\)/);
});

test("invite page previews first and accepts only after explicit confirmation", () => {
  const invite = read("apps/web/src/pages/InviteAcceptPage.jsx");
  const effectStart = invite.indexOf("useEffect");
  const acceptStart = invite.indexOf("async function acceptInvite");
  const previewEffect = invite.slice(effectStart, acceptStart);

  assert.match(invite, /api\.invitationPreview\(token\)/);
  assert.match(invite, /async function acceptInvite/);
  assert.match(invite, /onClick=\{acceptInvite\}/);
  assert.match(invite, /Accept invitation/);
  assert.doesNotMatch(previewEffect, /api\.acceptInvitation/);
  assert.doesNotMatch(invite, /setTimeout\(\(\) => navigate/);
  assert.match(invite, /window\.location\.assign\(authReturnPath\(token\)\)/);
});

test("accepted links are idempotent only while the original membership remains active", () => {
  const repository = read("apps/server/src/repositories/invitationsRepository.js");
  const acceptedStart = repository.indexOf('if (status === "accepted")');
  const pendingStart = repository.indexOf('if (status !== "pending")', acceptedStart);
  const acceptedBranch = repository.slice(acceptedStart, pendingStart);

  assert.match(repository, /async function existingAcceptedMembership/);
  assert.match(repository, /Invitation has already been used and campaign access is no longer active/);
  assert.match(acceptedBranch, /existingAcceptedMembership\(invitation, fullUser\)/);
  assert.doesNotMatch(acceptedBranch, /activateInvitationMembership/);
  assert.match(acceptedBranch, /idempotent: true/);
});

test("frontend client exposes invitation preview without changing active campaign", () => {
  const client = read("apps/web/src/api/client.js");
  assert.match(client, /invitationPreview: \(token\) => request\(`\/invitations\/\$\{encodeURIComponent\(token\)\}\/preview`\)/);
});
