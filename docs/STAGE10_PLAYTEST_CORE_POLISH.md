# Stage 10 — Playtest Core Polish

Branch: `stage10-playtest-core-polish`

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

Planned:

- Campaign status.
- Quick create actions.
- Players/invites shortcut.
- Archive shortcut.
- Handouts/reveal shortcut.
- Next session placeholder.

## Patch 10.2 — Player Dashboard polish

Planned:

- Campaign intro.
- Known lore shortcut.
- Handouts shortcut.
- Maps shortcut.
- Character shortcut.
- Notes shortcut.

## Patch 10.3 — Dice Tray MVP

Planned:

- `/dice` real page instead of placeholder.
- d20, d12, d10, d8, d6, d4 quick rolls.
- Formula input like `1d20+7`.
- Local roll history.
- No multiplayer sync in MVP.

## Patch 10.4 — Core Russian pass

Planned:

- Sidebar labels.
- Dashboard labels.
- Dice labels.
- Empty states.
- Playtest flow language.

## Codex QA after implementation

Run:

```bash
git checkout stage10-playtest-core-polish
git pull --ff-only origin stage10-playtest-core-polish
npm run build
npm run dev
```

Check:

1. GM dashboard opens and has useful quick actions.
2. Player dashboard opens and has useful quick actions.
3. `/dice` opens as real dice tray, not placeholder.
4. d20/d12/d10/d8/d6/d4 quick rolls work.
5. Formula input works for simple expressions like `1d20+7` and `2d6+3`.
6. Roll history appears locally.
7. No player-only user sees GM-only dashboard actions.
8. No duplicate portal shell appears.
9. Build passes.
