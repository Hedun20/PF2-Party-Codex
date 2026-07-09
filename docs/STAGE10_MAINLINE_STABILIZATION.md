# Stage 10 — Mainline Stabilization Summary

Status: implemented directly on `main` after PR #5 was merged.

## Product logic now fixed as the working model

PF2 Party Codex shell logic is now treated as:

```txt
Campaign -> Mode -> Tool -> Scope
```

Where:

- Campaign = active campaign membership context.
- Mode = `archive`, `table`, or `management`.
- Tool = the current page/tool inside that mode.
- Scope = campaign-wide by default, or a selected world.

World is no longer treated as the primary navigation level. It is a scope inside the selected mode. This preserves the difference between:

- Archive -> campaign-wide
- Archive -> Valdran
- Game Table -> campaign-wide
- Game Table -> Valdran
- Management -> campaign-wide
- Management -> Valdran settings/assets later

## Mainline changes

- Merged PR #5: Stage 10C product shell stabilization.
- Closed old stacked PRs #3 and #4 as superseded references, not merge sources.
- Added `apps/web/src/utils/shellContext.js`.
- Updated `App.jsx` to resolve active world from URL query scope, not only legacy `/world/:slug` routes.
- Updated `CodexTopbar.jsx` to show campaign/mode/tool context and a world scope switcher.
- Updated `CodexSidebar.jsx` so it renders tools for the selected mode only.
- Added `shell-context.css` for the route/mode/scope shell.
- Added UI block system foundation under `apps/web/src/components/ui`.
- Added `ui-blocks.css` and imported it in `main.jsx`.
- Migrated Dashboard and Session Desk to the UI block foundation.

## New reusable UI blocks

- `PageShell`
- `PageHero`
- `SectionHeader`
- `ActionRow`
- `EmptyState`
- `StatusMessage`
- existing `CodexButton`
- existing `CodexCard`
- `components/ui/index.js` barrel exports

## Design rule going forward

New pages should be built from shared UI blocks first. New page-specific CSS should be the exception, not the default.

## Route/scope compatibility

Existing routes are preserved. The stabilization uses query scope for mode-first navigation:

```txt
/archive?world=valdran
/session-desk?world=valdran
/notes?mode=table&world=valdran
/handouts?mode=table&world=valdran
```

Legacy `/world/:slug/...` routes still exist but are normalized by shell helpers where possible.

## Not included

- No backend rewrite.
- No billing/subscriptions/admin SaaS panel.
- No full premium redesign.
- No character builder.
- No deletion of old CSS files yet.
- No production deployment changes.
