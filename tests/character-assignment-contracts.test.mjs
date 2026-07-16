import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { canReadCharacter, canWriteCharacter, serializeCharacter } from "../apps/server/src/repositories/charactersRepository.js";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("players can read and write only characters assigned to their user", () => {
  const assigned = { assignedUserId: "player-1", ownerUserId: "legacy-owner", text: { privateNotes: "secret" } };
  const unassigned = { assignedUserId: null, ownerUserId: "player-1", visibility: { visibleToParty: true } };
  const legacy = { ownerUserId: "player-1" };

  assert.equal(canReadCharacter(assigned, { userId: "player-1", role: "player" }), true);
  assert.equal(canWriteCharacter(assigned, { userId: "player-1", role: "player" }), true);
  assert.equal(canReadCharacter(assigned, { userId: "player-2", role: "player" }), false);
  assert.equal(canReadCharacter(unassigned, { userId: "player-1", role: "player" }), false);
  assert.equal(canReadCharacter(legacy, { userId: "player-1", role: "player" }), true);
  assert.equal(canReadCharacter(unassigned, { userId: "gm-1", role: "gm" }), true);
});

test("serialized character permissions follow exact assignment and manager role", () => {
  const character = {
    _id: "character-1",
    campaignId: "campaign-1",
    assignedUserId: "player-1",
    assignedMembershipId: "membership-1",
    text: { publicSummary: "public", privateNotes: "private", gmNotes: "gm" }
  };
  const player = serializeCharacter(character, { userId: "player-1", role: "player" });
  const outsider = serializeCharacter(character, { userId: "player-2", role: "player" });
  const gm = serializeCharacter(character, { userId: "gm-1", role: "gm" });

  assert.equal(player.permissions.canEdit, true);
  assert.equal(player.permissions.canAssign, false);
  assert.equal(player.text.privateNotes, "private");
  assert.equal(outsider.permissions.canEdit, false);
  assert.equal("privateNotes" in outsider.text, false);
  assert.equal(gm.permissions.canAssign, true);
  assert.equal(gm.text.gmNotes, "gm");
});

test("backend assignment route is campaign scoped and validates active membership", () => {
  const routes = read("apps/server/src/routes/characters.js");
  const repository = read("apps/server/src/repositories/charactersRepository.js");
  const readGuard = repository.slice(repository.indexOf("export function canReadCharacter"), repository.indexOf("export function canWriteCharacter"));

  assert.match(routes, /characterAssignmentRouter = Router\(\{ mergeParams: true \}\)/);
  assert.match(routes, /charactersRouter\.use\("\/characters\/:id\/assignment", characterAssignmentRouter\)/);
  assert.match(routes, /findCampaignMembership\(\{ campaignId: context\.campaignId, membershipId \}\)/);
  assert.match(routes, /membership\.status !== "active"/);
  assert.match(routes, /GM or owner access is required to assign campaign characters/);
  assert.match(repository, /assignCharacterToMembership/);
  assert.match(repository, /assignedMembershipId/);
  assert.match(repository, /assignedUserId: \{ \$exists: false \}, ownerUserId: userObjectId/);
  assert.doesNotMatch(readGuard, /visibleToParty/);
  assert.match(readGuard, /return isAssignedUser\(character, userId\)/);
});

test("GM roster and player workspace expose assignment controls safely", () => {
  const page = read("apps/web/src/pages/CharactersPage.jsx");
  const panel = read("apps/web/src/components/CharacterAssignmentPanel.jsx");
  const client = read("apps/web/src/api/characterAssignments.js");
  const styles = read("apps/web/src/styles/stage35-character-assignment.css");
  const index = read("apps/web/src/styles/index.css");

  assert.match(page, /CharacterAssignmentPanel/);
  assert.match(page, /selected\?\.permissions\?\.canEdit/);
  assert.match(page, /only characters|только персонажи|только назначенные/i);
  assert.match(panel, /api\.campaignMemberships\(campaignId\)/);
  assert.match(panel, /assignCharacterMembership\(character\.id, selectedMembershipId\)/);
  assert.match(panel, /Не назначать/);
  assert.match(client, /\/characters\/\$\{encodeURIComponent\(characterId\)\}\/assignment/);
  assert.match(styles, /\.character-assignment-panel/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(index, /stage35-character-assignment\.css/);
});
