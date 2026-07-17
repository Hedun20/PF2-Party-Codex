# SS UI & Information Architecture Rebuild

Status: active
Base branch: `main`
Working branch: `refactor/ss-ui-ia-rebuild`
Safety branch: `backup/pre-ss-ui-ia-rebuild-2026-07-17`

## Goal

Rebuild the frontend around one product structure, one navigation model, one design system, one world-theme engine, and one canonical owner for every editable entity while preserving authenticated data flow, campaign membership rules, backend visibility enforcement, and all working campaign functionality.

This is not a cosmetic reskin and not a temporary stabilization patch. It is the final controlled replacement of the legacy frontend architecture before external testing.

## Completion doctrine

1. No half-measures, placeholder architecture, temporary duplicate pages, or permanent compatibility layers.
2. A stage is complete only after its acceptance gate passes in code, automated checks, and manual route QA.
3. The next stage does not begin while the previous stage has known blocking defects.
4. Every editable entity has exactly one canonical editor and one canonical data owner.
5. Repeated information is represented by summaries, references, and links — never by competing copies.
6. One implementation exists for each UI primitive and shell responsibility.
7. World themes change tokens, assets, and atmosphere only; they never fork layout or component behavior.
8. Backend authorization, exact campaign membership, visibility filtering, and API contracts remain authoritative.
9. Existing functionality is either migrated and verified or explicitly removed by product decision; nothing silently disappears.
10. `main` is not updated until the entire rebuild passes the final release gate.

## Ten-stage execution plan

### 1. Complete inventory and canonical product map

Scope:
- Inventory every route, page, shell, CSS source, inline style, UI primitive, data surface, editor, redirect, and role restriction.
- Record the current build/test baseline.
- Define the canonical GM Portal and Player Portal navigation trees.
- Assign every feature a canonical page, data owner, role policy, primary action, and route.
- Produce migration matrices for routes, pages, styles, components, and duplicated information: keep, merge, redirect, replace, remove.

Acceptance gate:
- Every current route, page, stylesheet, and editor is accounted for.
- No feature or editable entity lacks a canonical home.
- No entity has two approved primary editors.
- The baseline is recoverable and its known failures are documented.
- No production behavior is intentionally changed in this stage.

### 2. Canonical route architecture and single application shell

Scope:
- Introduce campaign-scoped canonical URLs.
- Build one route/navigation registry used by routing, sidebar, breadcrumbs, page titles, and access rules.
- Replace competing shell responsibilities with one application shell.
- Implement deterministic campaign switcher, role context, active navigation, breadcrumbs, page header, desktop shell, and mobile shell.
- Convert legacy URLs into explicit tested redirects.

Acceptance gate:
- Every primary page is reachable from canonical navigation.
- Campaign, role, and current location are always unambiguous.
- Switching campaigns cannot leak or preserve the wrong campaign context.
- GM-only routes reject Player access correctly.
- There is exactly one active application shell.
- All route contract tests and route smoke checks pass.

### 3. Final design system foundation and shared UI primitives

Scope:
- Create semantic reset, base styles, tokens, typography, spacing, surfaces, borders, radii, shadows, motion, breakpoints, z-index, focus, and accessibility rules.
- Establish the ancient fantasy archive visual direction.
- Implement one production-ready version of Button, IconButton, Input, Select, Textarea, Card, Panel, Badge, Tabs, Table, Dialog, Drawer, Tooltip, Notice, Loading, Empty, Error, Forbidden, and PageHeader.
- Create a strictly bounded temporary legacy compatibility layer used only during migration.

Acceptance gate:
- New code does not import stage-numbered, hotfix, stabilization, or page-specific primitive CSS.
- Themeable values come from semantic tokens.
- All shared primitives include hover, focus, active, disabled, loading, error, and keyboard behavior where applicable.
- Primitives pass desktop, mobile, contrast, and keyboard checks.
- No migrated page invents a second version of a shared primitive.

### 4. Unified campaign home and portal context

Scope:
- Consolidate Dashboard, GM Home, Player Home, and overlapping world-dashboard responsibilities.
- Build one role-aware campaign home composition with clearly separated GM and Player content.
- Define one canonical source for campaign summary, recent activity, next session, alerts, and primary actions.
- Remove duplicated campaign summaries and conflicting calls to action.

Acceptance gate:
- GM and Player each receive a complete, useful home experience.
- Every home widget links to one canonical destination.
- Campaign summary data is fetched and transformed in one defined layer.
- Loading, empty, error, forbidden, and no-membership states are complete.
- No former dashboard remains as a parallel product entry point.

### 5. Campaign Archive as the product center

Scope:
- Rebuild Archive overview and navigation for lore, NPCs, locations, factions, quests, maps, timeline, handouts, and session recaps.
- Make world context a filter, theme, and content scope rather than a parallel application tree.
- Consolidate category and world navigation.
- Preserve reveal workflows and backend player-safe filtering.
- Define consistent list, detail, create, edit, relation, and reveal flows.

Acceptance gate:
- Campaign Archive is the clear primary knowledge workspace.
- Every archive entity has one list surface and one canonical editor.
- World and category navigation cannot duplicate global modules.
- GM-only fields never appear in Player payloads or rendered output.
- Create, edit, reveal, read, search, and cross-link flows pass automated and manual QA.

### 6. Complete campaign operations migration

Scope:
- Rebuild and migrate Sessions, Maps, Map Objects, Timeline, Handouts, Notes, Assets, Campaign Health, Import/Export, and GM Tools.
- Decide which tools remain full pages and which become contextual actions.
- Standardize list/detail/editor patterns, autosave or explicit-save behavior, destructive confirmations, and return navigation.
- Preserve all existing useful functionality.

Acceptance gate:
- Each operation has one canonical entry point and one editor.
- All create, update, delete, reveal, upload, import, and rollback flows that existed before are either verified or explicitly retired.
- Cross-links always return to the expected campaign and archive context.
- No dead-end, orphan page, silent failure, or data-loss path remains.
- Module-level tests, route tests, build, and manual workflows pass.

### 7. People, invitations, characters, profile, and settings

Scope:
- Rebuild Players, Invitations, Memberships, Characters, Character Assignment, Profile, Campaign Selection, Account Settings, and Campaign Settings.
- Separate account concerns from campaign concerns.
- Remove repeated membership, invitation, and assignment surfaces.
- Preserve exact role, ownership, assignment, visibility, and audit behavior.

Acceptance gate:
- Membership and role editing exist on one canonical campaign page.
- Invitation create, copy, revoke, expire, accept, and return-to-auth flows are complete.
- Character create/import, assignment, reassignment, unassignment, read, and edit permissions work for GM and Player.
- Account settings and campaign settings cannot be confused.
- All permission, invitation, membership, character, and profile contracts pass.

### 8. Production world-theme and atmosphere engine

Scope:
- Implement themes as typed token, asset, ornament, background, motion, and atmosphere presets.
- Complete the primary ancient fantasy archive theme to production quality.
- Migrate fire, ice, arcane, paradise, infernal, Midgard, and death-world concepts without component-specific theme forks.
- Implement one background visual source and one world sound source model with resilient controls.
- Ensure theme assets fail gracefully and never block content.

Acceptance gate:
- Theme switching cannot change layout, markup contracts, route behavior, or component dimensions unexpectedly.
- Every theme passes contrast, readability, loading, missing-asset, and responsive checks.
- Background visual and world sound continue correctly across navigation according to the documented model.
- No theme-specific duplicate component stylesheet exists.
- The primary theme is visually complete, not a placeholder.

### 9. Total legacy removal and repository cleanup

Scope:
- Remove obsolete CSS imports, stage patch files, stabilization files, duplicate components, old shells, dead routes, unused props, unused state, compatibility selectors, and abandoned page variants.
- Replace temporary redirects with the final documented redirect set.
- Remove dead dependencies and stale tests.
- Add static checks preventing forbidden legacy imports and duplicate route ownership.

Acceptance gate:
- Exactly one active design system, shell, route registry, and theme engine remain.
- No stage-numbered frontend CSS is loaded or referenced.
- No duplicate canonical route, editor, shell, or primitive remains.
- The temporary compatibility layer is deleted.
- Repository search and automated guard tests confirm the purge.
- Full test, build, syntax, and production audit commands pass.

### 10. End-to-end stabilization and release gate

Scope:
- Execute full authenticated GM and Player journeys from registration/login through campaign work.
- Cover active campaign switching, missing membership, changed role, forbidden access, loading, empty, error, offline/API failure, and recovery states.
- Run desktop and mobile responsive QA, keyboard navigation, focus order, contrast, long-content, and destructive-action checks.
- Prepare a seeded walkthrough campaign and release notes.
- Fix every blocking and high-severity defect found; do not defer them as known limitations.

Acceptance gate:
- Critical GM flow works end to end: authentication → campaign → home → archive → content creation/editing → maps/timeline/sessions → players/invitations → character assignment → Preview as Player.
- Critical Player flow works end to end: invitation/authentication → campaign home → archive → handouts/recaps → assigned character → private/shared notes.
- No critical or high-severity route, data-loss, authorization, visibility, navigation, responsive, or accessibility defect remains.
- Full CI, build, syntax, security audit, contract tests, and documented manual QA pass from the final commit.
- Only after this gate passes may the PR leave draft status and be merged into `main`.

## Per-stage delivery contract

Every completed stage must include:
- implemented result;
- acceptance-gate checklist;
- changed files;
- removed duplication;
- preserved functionality;
- automated tests and build results;
- manual QA routes and scenarios;
- defects found and fixed;
- confirmed absence of blocking defects;
- commit SHA;
- explicit readiness for the next stage.

A stage is not reported as complete when tests are skipped, the build is unknown, temporary duplication remains inside that stage's scope, or a blocking defect is deferred.