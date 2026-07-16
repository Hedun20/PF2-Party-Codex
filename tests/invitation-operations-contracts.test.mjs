import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("invitation repository tracks current delivery state without storing raw links", () => {
  const repository = read("apps/server/src/repositories/invitationsRepository.js");
  const createStart = repository.indexOf("export async function createCampaignInvitation");
  const resendStart = repository.indexOf("export async function resendCampaignInvitation");
  const acceptStart = repository.indexOf("export async function acceptInvitation");
  const resendBranch = repository.slice(resendStart, acceptStart);

  assert.match(repository, /collections\.emailOutbox/);
  assert.match(repository, /deliveryMapForInvitations/);
  assert.match(repository, /emailDeliveryId/);
  assert.match(repository, /publicInvitationDelivery/);
  assert.match(repository, /resendCount/);
  assert.match(repository, /lastResentAt/);
  assert.match(resendBranch, /const token = createInvitationToken\(\)/);
  assert.match(resendBranch, /tokenHash = hashInvitationToken\(token\)/);
  assert.match(resendBranch, /expiresAt = new Date\(Date\.now\(\) \+ INVITE_TTL_MS\)/);
  assert.match(resendBranch, /Invitation changed before it could be sent again/);
  assert.match(resendBranch, /queueInvitationEmail/);

  const persistedStart = repository.indexOf("const invitation = {", createStart);
  const persistedEnd = repository.indexOf("const result =", persistedStart);
  const persistedDocument = repository.slice(persistedStart, persistedEnd);
  assert.match(persistedDocument, /tokenHash: hashInvitationToken\(token\)/);
  assert.doesNotMatch(persistedDocument, /\binviteUrl\b/);
});

test("manager resend route is campaign scoped, audited, and does not consume another seat", () => {
  const routes = read("apps/server/src/routes/memberships.js");
  const resendStart = routes.indexOf('invitationActionsRouter.post("/resend"');
  const revokeStart = routes.indexOf('invitationActionsRouter.delete("/"', resendStart);
  const resendRoute = routes.slice(resendStart, revokeStart);

  assert.ok(resendStart >= 0);
  assert.match(routes, /resendCampaignInvitation/);
  assert.match(resendRoute, /campaignManagerContext\(req\)/);
  assert.match(resendRoute, /campaignId: context\.activeCampaign\.id/);
  assert.match(resendRoute, /invitationId: req\.params\.invitationId/);
  assert.match(resendRoute, /action: "invitations\.resend"/);
  assert.doesNotMatch(resendRoute, /assertPlanCapacity/);
});

test("players management shows seat capacity, delivery state, and token rotating resend", () => {
  const client = read("apps/web/src/api/client.js");
  const page = read("apps/web/src/pages/PlayersPage.jsx");

  assert.match(client, /resendCampaignInvitation/);
  assert.match(client, /\/resend`, \{ method: "POST"/);
  assert.match(page, /api\.subscription\(\)/);
  assert.match(page, /maxMemberSeats/);
  assert.match(page, /pendingInvitations/);
  assert.match(page, /seatLimitReached/);
  assert.match(page, /api\.resendCampaignInvitation/);
  assert.match(page, /Предыдущая ссылка больше не действует/);
  assert.match(page, /Письмо отправлено/);
  assert.match(page, /Ошибка доставки/);
  assert.match(page, /Отправить снова/);
  assert.match(page, /invite\.delivery\?\.lastError/);
});
