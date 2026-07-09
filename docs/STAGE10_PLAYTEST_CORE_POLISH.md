# Stage 10 — Playtest Core Polish

Branch: `stage10-playtest-core-polish`

Status: **Stage 10B implementation complete, waiting for manual build/browser QA**

## Goal

Make the application usable for an actual table playtest after Stage 8 identity/portal and Stage 9 archive work.

This stage focuses on session usability, not SaaS billing/landing/admin.

## Product rules

- GM must be able to start from a useful dashboard.
- Player must be able to start from a useful dashboard.
- Dice tray must exist as an MVP route.
- Core UX must be understandable in Russian.
- Guests must not see the campaign shell, archive header, or sidebar before login.
- Product structure must be Archive / Live Session / Management, not one giant sidebar.
- Do not add billing, pricing, landing, SaaS admin, or production deploy in this stage.

## Patch 10.1 — GM Dashboard polish

Status: implemented.

Changed:

- `apps/web/src/pages/DashboardPage.jsx`

What changed:

- GM dashboard now uses three product-mode cards: Archive, Игровой стол, Управление.
- Archive is preparation/worldbuilding/lore.
- Игровой стол is live-session work.
- Управление is players/invites/profile/settings.

## Patch 10.2 — Player Dashboard polish

Status: implemented.

Changed:

- `apps/web/src/pages/PlayerHomePage.jsx`

What changed:

- Player portal is localized in Russian.
- Player main flow is focused on character, dice, notes, known lore, and player materials.
- Maps were removed from the primary player dashboard because table maps are handled outside the player app flow unless GM opens an image as material.

## Patch 10.3 — Dice Tray MVP + visual roll history

Status: implemented.

Changed:

- `apps/web/src/pages/DiceTrayPage.jsx`
- `apps/web/src/App.jsx`
- `apps/web/src/styles/stage10b-hotfix.css`
- `apps/web/src/main.jsx`

What changed:

- `/dice` is now a real page instead of a placeholder.
- Added quick d20/d12/d10/d8/d6/d4 buttons.
- Added formula input for simple expressions such as `1d20+7`, `2d6+3`, `d100`.
- Added local roll history.
- Improved dice history from a raw list to visual roll cards.
- Natural 20 and Natural 1 are visually labeled.
- No multiplayer sync in MVP by design.

## Patch 10.4 — Core Russian pass and product navigation

Status: implemented.

Changed:

- `apps/web/src/components/CodexSidebar.jsx`
- `apps/web/src/pages/DashboardPage.jsx`
- `apps/web/src/pages/PlayerHomePage.jsx`
- `apps/web/src/pages/DiceTrayPage.jsx`
- `apps/web/src/pages/HandoutsPageV2.jsx`

What changed:

- Sidebar is split into product groups: Главное, Архив / подготовка, Во время игры, Управление.
- Player sidebar is focused on Игровой стол, character, dice, notes, known lore, player materials, profile.
- Handouts wording was replaced with “Материалы игрокам” in the visible UI.
- Reveal is explained as an action: open material to players.

## Patch 10B — Product Structure Hotfix

Status: implemented.

Changed:

- `apps/server/src/index.js`
- `apps/web/src/App.jsx`
- `apps/web/src/pages/SessionDeskPage.jsx`
- `apps/web/src/pages/DashboardPage.jsx`
- `apps/web/src/pages/PlayerHomePage.jsx`
- `apps/web/src/components/CodexSidebar.jsx`
- `apps/web/src/pages/ProfilePageV2.jsx`
- `apps/web/src/pages/SettingsPage.jsx`
- `apps/web/src/pages/HandoutsPageV2.jsx`
- `apps/web/src/styles/stage10b-hotfix.css`
- `apps/web/src/main.jsx`

What changed:

- Guest users now see only AuthPage or invite accept flow, not the campaign shell/sidebar/archive header.
- Dev CORS now allows dynamic localhost Vite ports from `5173` through `5199` in non-production.
- Added `/session-desk` as the Live Session / Игровой стол page.
- Dashboard is restructured around Archive / Live Session / Management.
- Player dashboard is restructured around Character / Dice / Notes / Known Lore / Player Materials.
- Profile email is now break-safe and copyable.
- Settings no longer mention MongoDB or email outbox in normal user UI.
- Technical diagnostics remain in health/diagnostics instead of regular settings.

## Manual QA

Run locally:

```bash
git pull --ff-only origin stage10-playtest-core-polish
npm run build
npm run dev
```

Check:

1. Build passes.
2. Guest opening `/` sees only login/register, no shell/sidebar/archive header.
3. Guest opening `/archive` still sees only login/register, no archive shell.
4. Invite URL still opens invite accept flow.
5. Login works from Vite fallback ports such as `5174` or `5175` without CORS error.
6. GM dashboard shows three big zones: Архив кампании, Игровой стол, Управление.
7. Player dashboard does not show Maps as a primary action.
8. `/session-desk` opens for GM and player.
9. `/dice` opens as a real dice tray, not placeholder.
10. d20/d12/d10/d8/d6/d4 quick rolls work.
11. Formula input works for `1d20+7`, `2d6+3`, and `d100`.
12. Roll history appears as visual cards.
13. Player-only user does not see GM-only dashboard actions.
14. Sidebar is grouped and less noisy than before.
15. Profile long email does not collide with the card layout.
16. Settings do not mention MongoDB or outbox.
17. `/archive`, `/editor`, `/handouts` still work after Stage 10B.
18. No duplicate portal shell appears.

If build fails, fix only the smallest build/runtime blocker. Do not add billing, landing, pricing, SaaS admin, or broad redesign in this stage.
