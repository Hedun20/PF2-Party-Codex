# SS Stage 3 — Production Design System Foundation

Status: **complete**

The production frontend now has one canonical Silverleaf Dark design-system module and one controlled stylesheet entrypoint. Branding Lab remains a visual reference only and is not imported by production code.

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

## Removed duplication in Stage 3 scope

- production topbar no longer uses browser-native campaign/world selects;
- migrated shell code does not use `MagicSelectLayer`, `LoreDropdown`, `CodexButton` or `CodexCard`;
- new production code imports the canonical Silverleaf module only;
- all historical CSS remains below one explicitly named temporary `legacy` layer and cannot override the final Silverleaf layers accidentally;
- Branding Lab and production design-system implementations are isolated from each other.

Legacy page adapters remain temporarily available only for pages scheduled for Stages 4–7. Their existence is allowed by the Stage 3 bounded-compatibility rule; no new code may depend on them. They are deleted in Stage 9 after all page migrations complete.

## Preserved functionality

- authentication and invitation continuity;
- exact campaign membership and role access;
- campaign switching and campaign-scoped routes;
- archive, character, dice, editor and player-management source contracts;
- server production-bundle fallback and smoke behavior;
- existing legacy pages through the bounded compatibility layer.

## Acceptance-gate checklist

- [x] Semantic reset, tokens, typography, spacing, surfaces, borders, radii, shadows, motion, breakpoints, z-index, focus and accessibility rules exist.
- [x] Ancient fantasy archive visual direction is established in production.
- [x] Every Stage 3 shared primitive has one canonical production implementation.
- [x] Temporary legacy compatibility is explicitly bounded below the canonical layers.
- [x] Migrated production code does not import stage-numbered, hotfix, stabilization or page-specific primitive CSS.
- [x] Themeable design-system values use semantic tokens.
- [x] Shared primitives include applicable hover, focus, active, disabled, loading, error and keyboard behavior.
- [x] Desktop, medium, mobile and reduced-motion rules are present.
- [x] Shell controls use the canonical custom Select and circular IconButton.
- [x] Static contracts reject duplicate primitive use inside migrated shell code.
- [x] Full CI, production build, server smoke, syntax and dependency audit are required before the stage is reported complete.

## Manual QA scenarios

Run the production application, not Branding Lab:

```text
http://localhost:5173/
```

Verify at desktop, medium width with navigation open, and mobile width:

1. Open and close the sidebar; content must not collapse into unreadable columns.
2. Open campaign and world Select controls using mouse, Enter and Space.
3. Navigate Select options using arrows, Home and End; close with Escape.
4. Tab through topbar, sidebar and page actions; focus must remain visible.
5. Confirm settings, account and other circular controls remain circular.
6. Confirm Loading, Empty, Error and Forbidden states use the same Silverleaf surface grammar when reached by product routes.
7. Confirm reduced-motion mode removes nonessential movement.

## Defects found and fixed

- native white Select popup in production topbar;
- oval icon controls under flex compression;
- stage-numbered CSS layers outranking the new system;
- incomplete production primitive inventory;
- missing modal focus trap and focus restoration;
- missing keyboard navigation for Tabs and full Select traversal;
- missing semantic motion, breakpoint and z-index tokens;
- tests that required the removed native Select implementation.

## Stage boundary

Stage 3 owns the foundation and primitives only. Campaign Home composition begins in Stage 4. Archive migration begins in Stage 5. The remaining temporary compatibility layer is intentionally removed only after those feature migrations, with final purge enforced in Stage 9.

Closure commit: the commit containing this document and the green Stage 3 CI gate on draft PR #31.
