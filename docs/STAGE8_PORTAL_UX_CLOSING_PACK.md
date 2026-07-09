# Stage 8 — Portal UX Closing Pack

Branch: `fix/identity-onboarding-v2`

## Goal

Bring the product from identity-foundation state to testable platform state.

This stage is not about adding billing, SaaS admin, or landing pages yet. It closes the current app shell gaps so the GM and player flows can be tested without legacy localhost/mode confusion.

## Locked product model

- User registration creates only a user.
- A user without membership is a no-campaign user.
- GM/owner access comes only from `activeMembership.role` equal to `owner` or `gm`.
- Player access comes only from `activeMembership.role` equal to `player`.
- Player invitations create only player memberships.
- GM invitations are not supported through the invite form.
- Manual invite link must be available in addition to email outbox delivery.
- Sidebar/topbar are the only navigation surfaces.
- The old visual GM/player toggle must not be shown to users.

## Done in this pack

- Removed the duplicate portal shell navigation from dashboard.
- Rebuilt topbar role display around `activeMembership.role`.
- Hid the GM/player mode toggle from the UI.
- Rebuilt `/players` as `PlayersPageV2`.
- Restricted backend invitations to player role.
- Stored and returned `inviteUrl` for pending invitations.
- Added `/my` workspace overview through `MyWorkspacePageV2`.
- Added `/profile` overview through `ProfilePageV2`.
- Localized Settings page.
- Added a temporary `/dice` placeholder route so workspace cards do not dead-end.
- Removed unused `identity-ui-fix.css`.

## Still to close before Green QA

1. Run local build.
2. Run browser smoke with Mongo.
3. Check `/players` invite creation and invite acceptance.
4. Check `/my`, `/profile`, `/settings`, `/handouts`, `/dice` visually.
5. Check no-campaign onboarding.
6. Check player cannot access `/players`, `/editor`, `/gm-tools`, `/health`.
7. Check owner/GM can access `/players`, `/editor`, `/gm-tools`, `/health`.
8. Optionally localize the remaining sidebar labels and Handouts empty state if they are still visibly mixed.

## Codex task

Use Codex for local build and QA only after pulling the branch.

Prompt:

```text
You are working on Hedun20/PF2-Party-Codex branch fix/identity-onboarding-v2. Do not merge main. Do not add billing, landing, subscriptions, or SaaS admin features.

Goal: verify Stage 8 Portal UX Closing Pack and fix only regressions that block test readiness.

Run:
- npm install if needed
- npm run build
- node --check apps/server/src/repositories/identityRepository.js
- node --check apps/server/src/repositories/invitationsRepository.js
- node --check apps/server/src/routes/onboarding.js
- node --check apps/server/src/routes/memberships.js
- node --check apps/server/src/services/sessionService.js
- node --check apps/server/src/index.js

Then inspect app flows:
1. Register new user: must be no-campaign, not GM/player.
2. No-campaign user sees onboarding/profile only.
3. Onboarding creates workspace/campaign/owner membership.
4. Owner sees GM portal, /players, /editor, /gm-tools.
5. /players must invite only player, no GM role select.
6. Invite creates email outbox item and returns copyable invite link.
7. Second user accepts invite and becomes player.
8. Player cannot access GM-only routes.
9. /my, /profile, /settings must render without blank pages.
10. /dice must not 404; placeholder is acceptable.

If a build error appears, fix the smallest possible code issue. Do not redesign the app. Do not merge to main. Report exact files changed and whether status is Green or Yellow.
```

## Merge rule

Do not merge until local build and browser smoke are Green.
