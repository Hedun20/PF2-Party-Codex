# Stage 10 — Playtest Core Polish

Branch: `stage10-playtest-core-polish`

Status: **implementation complete, waiting for manual build/browser QA**

## Goal

Make the application usable for an actual table playtest after Stage 8 identity/portal and Stage 9 archive work.

This stage focuses on session usability, not SaaS billing/landing/admin.

## Product rules

- GM must be able to start from a useful dashboard.
- Player must be able to start from a useful dashboard.
- Dice tray must exist as an MVP route.
- Core UX must be understandable in Russian.
- Do not add billing, pricing, landing, SaaS admin, or production deploy in this stage.

## Patch 10.1 — GM Dashboard polish

Status: implemented.

Changed:

- `apps/web/src/pages/DashboardPage.jsx`

What changed:

- GM dashboard now has playtest-focused quick actions.
- Added shortcuts for create material, players/invites, archive, handouts/reveal, dice, and missing articles.
- Dashboard copy is localized and campaign-aware.
- Removed old MD/Obsidian dashboard shortcut language from the primary dashboard.

## Patch 10.2 — Player Dashboard polish

Status: implemented.

Changed:

- `apps/web/src/pages/PlayerHomePage.jsx`

What changed:

- Player portal is localized in Russian.
- Added shortcuts for known archive, handouts, maps, timeline, character, notes, dice, and profile.
- Player dashboard explains that it only shows GM-opened material.

## Patch 10.3 — Dice Tray MVP

Status: implemented.

Changed:

- `apps/web/src/pages/DiceTrayPage.jsx`
- `apps/web/src/App.jsx`

What changed:

- `/dice` is now a real page instead of a placeholder.
- Added quick d20/d12/d10/d8/d6/d4 buttons.
- Added formula input for simple expressions such as `1d20+7`, `2d6+3`, `d100`.
- Added local roll history.
- No multiplayer sync in MVP by design.

## Patch 10.4 — Core Russian pass

Status: implemented for core playtest routes.

Changed:

- `apps/web/src/components/CodexSidebar.jsx`
- `apps/web/src/pages/DashboardPage.jsx`
- `apps/web/src/pages/PlayerHomePage.jsx`
- `apps/web/src/pages/DiceTrayPage.jsx`

What changed:

- Sidebar labels were localized for GM/player core flow.
- Added Dice route to sidebar for both GM and player.
- Dashboard and player portal language now better matches playtest flow.

## Manual QA

Run locally:

```bash
git pull --ff-only origin stage10-playtest-core-polish
npm run build
npm run dev
```

Check:

1. Build passes.
2. GM dashboard opens and has useful quick actions.
3. Player dashboard opens and has useful quick actions.
4. `/dice` opens as a real dice tray, not placeholder.
5. d20/d12/d10/d8/d6/d4 quick rolls work.
6. Formula input works for `1d20+7`, `2d6+3`, and `d100`.
7. Roll history appears locally.
8. Player-only user does not see GM-only dashboard actions.
9. Sidebar has Dice link for GM and player.
10. No duplicate portal shell appears.
11. `/archive`, `/editor`, `/handouts` still work after Stage 10.

If build fails, fix only the smallest build/runtime blocker. Do not add billing, landing, pricing, SaaS admin, or broad redesign in this stage.
