# SS Stage 3 — Production Design System Foundation

Status: **complete**

The production frontend now has one canonical Silverleaf Dark design-system module, one controlled stylesheet entrypoint, and one final compatibility composition for routes whose feature JSX is migrated in later stages. Branding Lab remains a visual reference only and is not imported by production code.

## Implemented result

Canonical production module:

- `apps/web/src/components/ui/Silverleaf.jsx`
- `apps/web/src/components/ui/index.js`

Canonical styles:

- `apps/web/src/styles/silverleaf/tokens.css`
- `apps/web/src/styles/silverleaf/base.css`
- `apps/web/src/styles/silverleaf/components.css`
- `apps/web/src/styles/silverleaf/advanced-primitives.css`
- `apps/web/src/styles/silverleaf/shell.css`
- `apps/web/src/styles/silverleaf/page-composition.css`
- `apps/web/src/styles/silverleaf/adapter-controls.css`
- `apps/web/src/styles/silverleaf/adapter-pages.css`
- `apps/web/src/styles/silverleaf/adapter-responsive.css`
- `apps/web/src/styles/index.css`

The approved Primary Button geometry remains locked at 248 × 56 px. The field height remains 48 px and circular icon controls remain 40 × 40 px.

## Canonical primitives

The production barrel exports one supported implementation of:

- Button
- IconButton
- Input / TextInput
- Select / SelectInput
- Textarea / TextareaInput
- Field
- Card
- Panel
- Badge / Chip
- Tabs
- Table and semantic table subcomponents
- Dialog
- Drawer
- Tooltip
- Notice
- LoadingState
- EmptyState
- ErrorState
- ForbiddenState
- DisabledState
- PageHeader

## Interaction and accessibility coverage

- hover, active, disabled and loading behavior for actions;
- focus-visible treatment for interactive elements;
- error and `aria-invalid` behavior for fields;
- custom listbox keyboard support: Arrow Up/Down, Home, End, Enter, Space and Escape;
- tab-list roving focus with Arrow Left/Right, Home and End;
- Dialog and Drawer focus trapping, Escape close, body scroll lock and focus restoration;
- tooltip hover and focus-within behavior;
- semantic table markup with horizontal overflow on narrow layouts;
- reduced-motion support;
- responsive PageHeader, Dialog, Drawer, actions and cards;
- semantic z-index, motion, spacing, surface, border, typography and breakpoint tokens.

## Final compatibility result

Historical feature modules may temporarily retain semantic names such as `CodexButton`, `CodexCard`, `PageHero`, `EmptyState` and `StatusMessage`, but those adapters now render the canonical Silverleaf primitives and classes. They no longer own an alternative button, card, hero or status design.

The final composition layer also normalizes all still-unmigrated production routes:

- the purple cinematic prototype is disabled until the dedicated Theme Engine stage;
- breadcrumbs are horizontal, unnumbered and compact;
- page titles are bounded and cannot become poster-sized;
- legacy panels, forms and cards inherit Silverleaf surfaces and frames;
- archive counters are compact archive objects rather than stretched admin KPI bars;
- Campaign Home and Archive grids collapse predictably at medium and mobile widths;
- native legacy selects receive dark option styling until their feature JSX migration;
- file inputs and raw feature controls use the same angular field language;
- the approved Primary Button cannot be overridden by historical `.codex-button` rules.

## Removed duplication in Stage 3 scope

- production topbar no longer uses browser-native campaign/world selects;
- migrated shell code does not use `MagicSelectLayer`, `LoreDropdown`, `CodexButton` or `CodexCard`;
- compatibility adapters delegate to the canonical Silverleaf system;
- new production code imports the canonical Silverleaf module only;
- all historical CSS remains below one explicitly named temporary `legacy` layer;
- final Silverleaf composition and adapter layers load after every historical stylesheet;
- Branding Lab and production design-system implementations are isolated from each other.

Legacy page files remain temporarily available only for pages scheduled for Stages 4–7. Their existence is allowed by the Stage 3 bounded-compatibility rule; no new code may depend on their visual implementation. They are deleted in Stage 9 after all page migrations complete.

## Preserved functionality

- authentication and invitation continuity;
- exact campaign membership and role access;
- campaign switching and campaign-scoped routes;
- archive, character, dice, editor and player-management source contracts;
- server production-bundle fallback and smoke behavior;
- existing feature behavior through the bounded compatibility layer.

## Acceptance-gate checklist

- [x] Semantic reset, tokens, typography, spacing, surfaces, borders, radii, shadows, motion, breakpoints, z-index, focus and accessibility rules exist.
- [x] Ancient fantasy archive visual direction is established in production.
- [x] Every Stage 3 shared primitive has one canonical production implementation.
- [x] Compatibility adapters render canonical Silverleaf primitives.
- [x] Temporary legacy compatibility is explicitly bounded below the canonical layers.
- [x] Final page composition loads after all historical styles.
- [x] Migrated production code does not import stage-numbered, hotfix, stabilization or page-specific primitive CSS.
- [x] Themeable design-system values use semantic tokens.
- [x] Shared primitives include applicable hover, focus, active, disabled, loading, error and keyboard behavior.
- [x] Desktop, medium, mobile and reduced-motion rules are present.
- [x] Shell controls use the canonical custom Select and circular IconButton.
- [x] Static contracts reject duplicate primitive use and visual regression patterns.
- [x] Full CI, production build, server smoke, syntax and dependency audit pass.

## Manual QA target

Run the production application, not Branding Lab:

```text
http://localhost:5173/
```

The production contract covers desktop, medium width with navigation open, and mobile width. Any later feature-specific visual defect is handled in that feature's migration stage without reopening the Stage 3 foundation.

## Defects found and fixed

- native white Select popup in production topbar;
- oval icon controls under flex compression;
- stage-numbered CSS layers outranking the new system;
- incomplete production primitive inventory;
- missing modal focus trap and focus restoration;
- missing keyboard navigation for Tabs and full Select traversal;
- missing semantic motion, breakpoint and z-index tokens;
- tests that required the removed native Select implementation;
- numbered vertical breadcrumbs;
- purple starfield and cinematic prototype leaking across every route;
- poster-sized legacy page titles;
- flat purple cards and forms surviving under the new shell;
- compatibility buttons overriding the approved Primary Button;
- stretched archive KPI cards and unstable medium-width grids.

## Stage boundary

Stage 3 owns the production foundation, shared primitives, shell visual contract and compatibility composition. Campaign Home product composition begins in Stage 4. Archive feature migration begins in Stage 5. Historical feature CSS is removed route by route and purged in Stage 9.

Closure gate: draft PR #31, final Stage 3 production composition, green architecture contracts, production build, server smoke, feature contracts, syntax checks and production dependency audit.
