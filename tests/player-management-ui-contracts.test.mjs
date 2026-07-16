import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("web client exposes membership role, removal and invitation revoke mutations", () => {
  const client = read("apps/web/src/api/client.js");

  assert.match(client, /updateCampaignMembership/);
  assert.match(client, /method: "PATCH"/);
  assert.match(client, /removeCampaignMembership/);
  assert.match(client, /revokeCampaignInvitation/);
  assert.match(client, /memberships\/\$\{encodeURIComponent\(membershipId\)\}/);
  assert.match(client, /invitations\/\$\{encodeURIComponent\(invitationId\)\}/);
});

test("players page mirrors owner and GM management permissions", () => {
  const page = read("apps/web/src/pages/PlayersPage.jsx");

  assert.match(page, /managerRole === "owner" && member\.role !== "owner"/);
  assert.match(page, /managerRole === "gm" && member\.role === "player"/);
  assert.match(page, /member\.role === "owner" \|\| isSelf\(member\)/);
  assert.match(page, /api\.updateCampaignMembership/);
  assert.match(page, /api\.removeCampaignMembership/);
  assert.match(page, /api\.revokeCampaignInvitation/);
  assert.match(page, /<option value="player">Игрок<\/option>/);
  assert.match(page, /<option value="gm">GM<\/option>/);
});

test("destructive player management actions require inline confirmation", () => {
  const page = read("apps/web/src/pages/PlayersPage.jsx");

  assert.match(page, /confirmAction !== key/);
  assert.match(page, /remove-member:/);
  assert.match(page, /revoke-invite:/);
  assert.match(page, /Подтвердить/);
  assert.match(page, /setConfirmAction\(""\)/);
});

test("player management controls have responsive and destructive-state styles", () => {
  const styles = read("apps/web/src/styles/stage25-player-management.css");
  const index = read("apps/web/src/styles/index.css");

  assert.match(styles, /\.players-role-select/);
  assert.match(styles, /\.players-danger-action/);
  assert.match(styles, /\.players-member-actions/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(index, /stage25-player-management\.css/);
});
