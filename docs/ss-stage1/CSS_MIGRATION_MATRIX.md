# SS Stage 1 — CSS Migration Matrix

## Final runtime package

The final frontend loads one root stylesheet: `styles/index.css`. That root imports only the following design-system layers:

- `foundation/reset.css`
- `foundation/tokens.css`
- `foundation/base.css`
- `foundation/typography.css`
- `foundation/accessibility.css`
- `foundation/motion.css`
- `layout/app-shell.css`
- `layout/page-layout.css`
- `primitives/*.css`
- `features/*.css`
- `themes/archive-fantasy.css`
- additional world-theme token/asset presets

Feature files may style feature composition, but may not redefine shared primitives. World themes may change tokens, assets and atmosphere only.

## Current stylesheet decisions

| Current stylesheet | Decision | Migration target |
| --- | --- | --- |
| `accessibility.css` | Extract then delete | `foundation/accessibility.css` and primitive focus states |
| `campaign-context.css` | Extract then delete | App shell campaign switcher and campaign states |
| `codex-buttons.css` | Replace then delete | One Button/IconButton primitive implementation |
| `codex-design.css` | Extract then delete | Tokens, primitives and feature compositions |
| `components.css` | Decompose completely then delete | Design-system primitives and bounded feature files |
| `content-cards.css` | Replace then delete | Card/Entity/Character feature styles |
| `fantasy.css` | Replace then delete | `themes/archive-fantasy.css` plus shell layout |
| `index.css` | Replace contents | Single controlled import manifest |
| `magic-select.css` | Delete | Native/final Select primitive only |
| `shell-context.css` | Replace then delete | `layout/app-shell.css` |
| `stabilization.css` | Migrate valid rules then delete | Correct owning primitive/feature file |
| `stage16a-ui.css` | Migrate valid rules then delete | Correct owning primitive/feature file |
| `stage16b-navigation.css` | Migrate valid rules then delete | App shell/navigation |
| `stage17-content-polish.css` | Migrate valid rules then delete | Archive/editor bounded feature files |
| `stage18-editor-inspector-selects.css` | Migrate valid rules then delete | Entry Editor + Select primitive |
| `stage19-select-archive-hotfix.css` | Delete after replacement | Select primitive + Archive layout |
| `stage20-native-selects.css` | Merge then delete | Final Select primitive |
| `stage21-character-dossier.css` | Migrate then delete | Character dossier feature stylesheet |
| `stage25-player-management.css` | Migrate then delete | Players Management feature stylesheet |
| `theme.css` | Replace then delete | Semantic `foundation/tokens.css` |
| `ui-blocks.css` | Merge then delete | Final primitives |

## Prohibited final-state patterns

- stylesheet names containing `stage`, `hotfix`, `stabilization` or `legacy`;
- multiple declarations of the same shared primitive class across feature files;
- page-specific redefinitions of Button, Card, Input, Select, Dialog or navigation;
- theme files that change grid, component dimensions, route behavior or DOM assumptions;
- untracked `!important` escalation;
- themeable hard-coded colors outside tokens and approved asset effects;
- inline layout/style objects except measured runtime values that cannot be expressed by state classes or custom properties.

## Replacement order

1. Introduce foundation and tokens.
2. Build final primitives.
3. Build final application shell.
4. Migrate one canonical product area at a time.
5. Remove the corresponding legacy imports immediately after the area passes tests.
6. Delete all compatibility files before Stage 10.

The compatibility boundary is temporary and measurable. It is not an accepted final architecture.
