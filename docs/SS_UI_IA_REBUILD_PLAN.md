# SS UI & Information Architecture Rebuild

Status: active
Base branch: `main`
Working branch: `refactor/ss-ui-ia-rebuild`
Safety branch: `backup/pre-ss-ui-ia-rebuild-2026-07-17`

## Goal

Rebuild the frontend around one product structure, one navigation model, one design system, and one world-theme engine while preserving authenticated data flow, campaign membership rules, backend visibility enforcement, and working campaign functionality.

This is not a cosmetic reskin. It is a controlled replacement of the legacy visual layer and a redistribution of page responsibilities before the GM alpha.

## Non-negotiable rules

1. Campaign Archive remains the product center.
2. GM Portal and Player Portal are role-aware views of the same campaign platform.
3. Every page has one primary responsibility and one canonical data owner.
4. Repeated information is represented by summaries and links, not duplicated editors.
5. One UI component implementation exists for each primitive.
6. World themes change tokens and atmosphere, not layout or behavior.
7. Legacy routes remain available through explicit redirects until migration is complete.
8. Backend authorization, campaign membership, visibility, and API contracts are preserved.
9. Every stage ends with build/tests, route checks, changed-files report, and a commit.
10. No new product module is added during the rebuild unless required to preserve an existing flow.

## Stage plan

### SS-0 — Snapshot and audit

- Freeze the GitHub-visible baseline.
- Inventory routes, pages, shells, CSS imports, inline styles, duplicated components, and duplicated data surfaces.
- Record the current build/test baseline.
- Produce a migration matrix: keep, merge, redirect, replace, remove.

Acceptance:
- Baseline is recoverable.
- Every current route and style source is accounted for.
- No production behavior is intentionally changed.

### SS-1 — Product map and page ownership

- Define the canonical GM and Player navigation trees.
- Assign one responsibility, data source, role policy, and primary action to every page.
- Identify duplicate pages and content surfaces.
- Define canonical campaign-scoped URLs and legacy redirects.

Acceptance:
- No feature exists without a canonical home.
- No editable entity has two competing primary editors.
- Route and page responsibility contracts are documented and testable.

### SS-2 — Design foundation

- Introduce reset/base styles and semantic design tokens.
- Define typography, spacing, surfaces, borders, radii, shadows, motion, focus, breakpoints, and z-index.
- Establish the primary fantasy-archive visual direction.
- Create a compatibility boundary for legacy styles during migration.

Acceptance:
- New code does not depend on stage-numbered CSS patches.
- Tokens are the only source for themeable values.
- Base accessibility states are present.

### SS-3 — Application shell and navigation

- Replace competing shell responsibilities with one application shell.
- Implement canonical sidebar/topbar, campaign switcher, role context, breadcrumbs, page header, and mobile navigation.
- Make navigation derive from one route/navigation registry.

Acceptance:
- All primary routes are reachable from the canonical navigation.
- Active route, campaign, and role are always visible.
- Desktop and mobile shell behavior is deterministic.

### SS-4 — Shared UI primitives

- Build one implementation for buttons, icon buttons, inputs, selects, textarea, cards, panels, badges, tabs, tables, dialogs, drawers, tooltips, notices, loading, empty, error, and forbidden states.
- Remove page-level reinventions as pages migrate.

Acceptance:
- Migrated pages use shared primitives only.
- Component states and keyboard focus are consistent.

### SS-5 — Home and context pages

- Consolidate `DashboardPage`, `GmHomePage`, and `PlayerHomePage` responsibilities.
- Keep one role-aware campaign home with GM and Player compositions where practical.
- Remove duplicated campaign summaries and competing calls to action.

Acceptance:
- GM and Player each receive a clear next-action home.
- Campaign status data has one canonical source.

### SS-6 — Campaign Archive rebuild

- Rebuild Archive overview and sections for lore, NPCs, locations, factions, quests, maps, timeline, handouts, and recaps.
- Make world context a filter/theme context rather than a parallel application tree.
- Preserve reveal and player-safe behavior.

Acceptance:
- Archive is the clear product center.
- World and category navigation do not duplicate global modules.
- GM-only data remains backend-protected.

### SS-7 — Campaign operations

- Migrate sessions, maps, timeline, handouts, notes, assets, health, import/export, and GM tools.
- Decide which tools remain primary pages and which become contextual actions.

Acceptance:
- Each operation has one canonical entry point.
- Cross-links return to the expected campaign and archive context.

### SS-8 — People, characters, account, and settings

- Migrate players, invitations, memberships, characters, profile, campaign selection, and settings.
- Separate account settings from campaign settings.
- Remove repeated membership and character assignment surfaces.

Acceptance:
- Role/member editing has one canonical page.
- Character ownership/assignment remains intact.
- Account and campaign settings are clearly separated.

### SS-9 — World theme engine

- Implement themes as token and atmosphere presets.
- Provide a primary ancient fantasy archive theme.
- Adapt existing fire, ice, arcane, paradise, infernal, Midgard, and death-world concepts without branching component CSS.
- Keep one background visual and one world sound source model.

Acceptance:
- Theme switching never changes layout or component behavior.
- Every theme passes contrast and readability checks.
- Theme assets fail gracefully.

### SS-10 — Legacy purge

- Remove obsolete CSS imports, stage patch files, duplicate components, dead routes, unused props, and compatibility selectors.
- Keep only documented redirects required for existing links.

Acceptance:
- One active design system remains.
- No stage-numbered frontend CSS is loaded.
- No duplicate canonical route remains.

### SS-11 — GM alpha stabilization

- Run full build and contract test suite.
- Add route smoke coverage for authenticated GM, Player, missing membership, forbidden, loading, error, and empty states.
- Check responsive layouts and keyboard navigation.
- Prepare a seeded GM alpha walkthrough.

Acceptance:
- Critical GM flow works from login to campaign management without dead ends.
- No critical route, data-loss, visibility, or navigation defect remains.
- Alpha release notes and known limitations are documented.

## Per-stage delivery format

Every completed stage must report:

- result;
- changed files;
- removed duplication;
- tests/build checks;
- manual QA route list;
- known limitations;
- commit SHA;
- next stage.
