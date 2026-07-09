# Stage 10 QA Checklist

Run after pulling the latest `main`.

## Setup

```bash
npm run build
npm run dev:clean
```

Open:

```txt
http://localhost:5173
```

## 1. Guest / no membership

- Open `/` while signed out.
- Confirm campaign shell does not expose GM/player campaign navigation.
- Open `/login`.
- Open `/guide`.
- Open an invite link if available.

Expected:

- No duplicate portal shell.
- No campaign archive data visible before login/membership.
- Sidebar shows only login/invite/help.

## 2. Owner / GM dashboard

Open `/` as owner/GM.

Expected:

- Dashboard shows exactly three main product modes:
  - Campaign Archive
  - Active Session / Game Table
  - Management / Campaign Access
- Hero copy explains mode-first workflow.
- GM shortcuts are visible.

## 3. Header context model

Check these routes:

```txt
/archive
/session-desk
/my
/players
/settings
/dice
/notes
/handouts
/maps
/timeline
/category/worlds
```

Expected:

- Header shows campaign -> mode -> tool context.
- Mode switch exists in the header, not as permanent top tabs in sidebar.
- Scope selector shows campaign-wide by default.
- Role indicator remains visible.

## 4. Mode -> tool -> scope behavior

In header scope selector choose a world, for example Valdran if present.

Check:

```txt
/archive?world=<worldSlug>
/category/npcs?world=<worldSlug>
/maps?world=<worldSlug>
/session-desk?world=<worldSlug>
/dice?world=<worldSlug>
/notes?mode=table&world=<worldSlug>
/handouts?mode=table&world=<worldSlug>
/my?world=<worldSlug>
```

Expected:

- World changes theme/background/accent through existing world theme system.
- Current mode remains selected.
- Sidebar tools match current mode.
- Scope can be returned to campaign-wide.

## 5. Sidebar behavior

Check archive mode:

```txt
/archive
/category/worlds
/category/npcs
/maps
/timeline
```

Expected:

- Sidebar shows archive/preparation tools only.
- It does not always show all three mode groups.

Check table mode:

```txt
/session-desk
/dice
/notes?mode=table
/handouts?mode=table
/characters
```

Expected:

- Sidebar shows live table tools only.
- Handouts/notes opened from table retain table mode through query `mode=table`.

Check management mode:

```txt
/my
/players
/settings
/profile
/gm-tools
/health
/foundry
/missing
/player-safety
```

Expected:

- Sidebar shows campaign management and GM tools only.
- Players and invitations are campaign-wide by default.

## 6. Player access

Log in as a player.

Check:

```txt
/
/archive
/session-desk
/dice
/notes
/handouts
/profile
/settings
/players
/editor
/gm-tools
/health
```

Expected:

- Player can use player-safe archive/table/profile tools.
- Player cannot access GM-only routes.
- Access denied copy appears for restricted GM routes.

## 7. UI block regression check

Visually inspect:

- Dashboard cards.
- Session Desk cards.
- Dice Tray.
- Players & Invitations.
- Notes.
- Archive cards.
- Header mode/scope controls.
- Sidebar context card.

Expected:

- Buttons use the same visual system.
- Cards feel consistent.
- No horizontal overflow on normal desktop width.
- No tiny broken buttons.
- No unreadable text in dark theme.

## 8. Console check

Open browser console while navigating all routes above.

Expected:

- No React runtime errors.
- No missing import errors.
- No route rendering crash.

## 9. Known manual verification needed

This mainline patch was made through GitHub file operations. Local `npm run build` still needs to be run on the developer machine because the assistant environment cannot clone GitHub from the container.
