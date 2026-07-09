# Stage 8 — Portal UX Closing Pack

Branch: `fix/identity-onboarding-v2`

Status: **Green locally after Codex build and browser smoke**

Last validation:

- Codex pulled the latest branch first.
- `npm install` completed.
- `npm run build` passed.
- Dev server started at `http://localhost:5173`.
- Legacy nested portal navigation was removed from `AppShell.jsx`.
- `/players`, `/my`, `/profile`, `/settings`, `/dice` render.
- `/players` invite is player-only; no GM role select.
- Invite API creates a copyable `inviteUrl`.
- New registration returns no campaign membership.
- Onboarding creates workspace, campaign, and owner membership.
- Player is denied on `/players`, `/editor`, `/gm-tools`, `/health`.
- Owner and seeded GM membership can access `/players`, `/editor`, `/gm-tools`, `/health`.
- Sidebar/topbar show no GM/player toggle.
- Duplicate `.portal-nav` count is `0`.

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
- Removed legacy inner portal nav wrapper from `AppShell.jsx`.

## Merge rule

This branch is now eligible for merge to `main` if the user accepts the local Green QA result.

Suggested merge flow:

```bash
git checkout main
git pull --ff-only origin main
git merge --no-ff fix/identity-onboarding-v2
npm run build
git push origin main
```

After merge, create the Stage 9 branch:

```bash
git checkout -b stage9-campaign-archive-mongo
git push -u origin stage9-campaign-archive-mongo
```
