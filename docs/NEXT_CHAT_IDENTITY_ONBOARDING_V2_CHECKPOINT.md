# Next Chat Checkpoint — Identity / Onboarding v2

Branch: `fix/identity-onboarding-v2`

Do not merge into `main` yet.

## Why this checkpoint exists

The previous assistant session glitched during direct GitHub work. Continue carefully from this checkpoint and do not start unrelated features.

## Strategic product rule

PF2 Party Codex is moving to an archive-first SaaS-ready identity model:

- MongoDB is the source of truth.
- Markdown vault is only import/export/backup/compatibility.
- A global registered user is not automatically a GM or player.
- A user may exist with no workspace, no campaign, and no membership.
- GM access comes from exact campaign membership: `owner` or `gm`.
- Player access comes only from invitation acceptance.
- No subdomains for this product plan.

## Current branch state

The branch already contains partial Identity / Onboarding v2 work.

Implemented backend/core pieces:

- `apps/server/src/repositories/identityRepository.js`
  - Added explicit workspace/campaign creation helper.
  - Changed no-membership identity context role to `user`.
  - Added no-op `bootstrapMembershipForNewUser()` so normal registration should not auto-create/join a campaign.
  - Kept explicit local/dev helper `bootstrapLocalDevWorkspaceForUser()` for dev seed compatibility only.
- `apps/server/src/routes/onboarding.js`
  - Added `POST /api/onboarding/workspace`.
  - Requires logged-in user.
  - Requires verified email.
  - Creates workspace + campaign + owner membership.
- `apps/server/src/index.js`
  - Mounted onboarding router.
- `apps/server/src/services/sessionService.js`
  - GM permissions now derive from active campaign membership role.
  - Localhost bootstrap GM mode is disabled as normal permission source.
- `apps/web/src/api/client.js`
  - Added `createWorkspaceOnboarding(payload)`.
- `apps/web/src/pages/OnboardingPage.jsx`
  - Added no-campaign onboarding UI.
- `apps/web/src/components/AppShell.jsx`
  - Hides portal navigation for signed-in users without campaign membership.
- `apps/web/src/pages/ProfilePage.jsx`
  - Shows onboarding when signed-in user has no campaign membership.
- `docs/identity-onboarding-v2.md`
  - Documents the model.

Known incomplete part:

- Full route-level frontend gating in `apps/web/src/App.jsx` is not completed.
- Dashboard route still needs a clean no-campaign redirect/render path.
- Some large file update attempts in the previous session were blocked by the GitHub connector safety layer, so inspect files directly before editing.

## Next Codex task

Title: Finish Identity / Onboarding v2 frontend gating and QA on `fix/identity-onboarding-v2`

Work only on branch:

```bash
git checkout fix/identity-onboarding-v2
```

### Goal

Finish the partial Identity / Onboarding v2 alignment without merging to `main`.

A registered user with no active campaign membership must see a clear onboarding state and must not see a fake GM Portal or Player Portal.

### Required behavior

1. Registration creates user only.
   - No workspace.
   - No campaign.
   - No membership.
   - `/api/auth/me` and `/api/session` should return user with `activeWorkspace: null`, `activeCampaign: null`, `activeMembership: null`, role/access like `user`.

2. GM onboarding is explicit.
   - `POST /api/onboarding/workspace` creates workspace, campaign, and owner membership.
   - Requires login.
   - Requires verified email.
   - Must not allow a second workspace for the same user if they already have active membership.

3. Player onboarding is invitation-only.
   - Player registration alone does not attach to any campaign.
   - Player gets membership only via `POST /api/invitations/accept` with matching email.

4. Frontend no-campaign state.
   - Signed-in user with no membership should see `OnboardingPage` or a clear no-campaign page on `/`, `/profile`, and portal entry routes.
   - AppShell should not show campaign portal nav when no active membership exists.
   - GM-only routes should not be accessible just because user is logged in.
   - Routes that require a campaign should not crash when pages/categories are empty or API returns 403.

5. Campaign permissions.
   - Use `activeMembership.role`, not global `user.role`, not local host, not mode switch.
   - `owner`/`gm` can manage.
   - `player` cannot manage.
   - no-membership user is `user`, not `player` and not `gm`.

### Files to inspect first

- `apps/server/src/services/authStore.js`
- `apps/server/src/repositories/identityRepository.js`
- `apps/server/src/routes/onboarding.js`
- `apps/server/src/routes/memberships.js`
- `apps/server/src/services/sessionService.js`
- `apps/web/src/App.jsx`
- `apps/web/src/components/AppShell.jsx`
- `apps/web/src/pages/OnboardingPage.jsx`
- `apps/web/src/pages/DashboardPage.jsx`
- `apps/web/src/pages/ProfilePage.jsx`
- `apps/web/src/pages/InviteAcceptPage.jsx`
- `apps/web/src/api/client.js`

### Hard boundaries

Do not:

- merge to `main`;
- create a PR yet unless explicitly asked;
- add billing/subscriptions/admin features;
- redesign the whole UI;
- change campaign content models;
- create fake localStorage campaign data;
- reintroduce first-user/second-user auto campaign bootstrap;
- make global `user.role` the permission source.

### QA required

Run:

```bash
npm run build
node --check apps/server/src/repositories/identityRepository.js
node --check apps/server/src/routes/onboarding.js
node --check apps/server/src/services/sessionService.js
node --check apps/server/src/index.js
```

Manual/API smoke if possible:

1. Register new user.
2. Confirm no active workspace/campaign/membership.
3. Verify email.
4. Open `/` and `/profile`; user should see onboarding/no-campaign state.
5. Create workspace through onboarding route/UI.
6. Confirm active workspace/campaign/owner membership appears.
7. Confirm GM portal appears only after owner membership exists.
8. Create invitation as owner/GM.
9. Register another user.
10. Confirm second user is still no-campaign after registration.
11. Accept invitation with matching email.
12. Confirm player membership appears.
13. Confirm player cannot access GM management routes.
14. Confirm unknown `/api/*` returns JSON 404, not SPA HTML.

### Expected report format

Report:

- branch name;
- files changed;
- exact behavior fixed;
- build/check results;
- remaining risks;
- whether it is ready for PR/merge or still Yellow.

## Current human decision

Next step is not a new feature. Next step is finishing/QA of Identity / Onboarding v2 on this branch. After that, review diff and only then decide whether to merge into `main`.
