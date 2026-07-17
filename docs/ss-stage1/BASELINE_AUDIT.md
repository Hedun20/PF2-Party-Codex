# SS Stage 1 — Baseline Audit

Status: complete inventory baseline
Branch: `refactor/ss-ui-ia-rebuild`
Baseline commit: `372f88fc070313c351ddce830647c355db8a39b7`

## Measured frontend state

The deterministic audit script `scripts/audit-frontend-architecture.mjs` scans the real frontend tree on CI. The Stage 1 baseline contains:

| Area | Count |
| --- | ---: |
| Source files scanned | 106 |
| Page modules | 34 |
| Component modules | 34 |
| Stylesheets | 21 |
| Runtime routes | 37 |
| Route families | 31 |
| CSS imports from the root stylesheet | 20 |
| Stage/hotfix/stabilization stylesheets | 9 |
| CSS class names declared in more than one stylesheet | 156 |
| Files containing inline styles | 4 |
| Inline-style occurrences | 12 |
| Files using browser storage | 1 |

## Confirmed structural defects

### Competing home surfaces

- `DashboardPage.jsx` derives product counts from the legacy `pages` collection.
- `GmHomePage.jsx` and `PlayerHomePage.jsx` both wrap `CampaignPortalHome.jsx`.
- `CampaignPortalHome.jsx` gets its summary from `api.campaignArchive`.
- `WorldDashboardPage.jsx` acts as another dashboard inside the world route tree.

Decision: one role-aware campaign home, backed by the campaign archive aggregate. Legacy page-derived dashboard counts are removed.

### Parallel route trees

Maps and timeline exist both globally and below `/world/:worldSlug`. Session, reveal and player portal routes also have world-scoped variants. The same page component is reachable through different structural meanings.

Decision: campaign-scoped canonical routes. World becomes archive context, filter and theme, not another application root.

### Competing session surfaces

- `SessionsPage.jsx`
- `SessionDeskPage.jsx`
- `SessionModePage.jsx`

Decision: one live session workspace plus one campaign session-management area. Player-safe recaps live in Campaign Archive.

### Competing editor surfaces

- `EditorPage.jsx`
- `RawEditorPage.jsx`
- `ArticleVisualEditor.jsx`
- `QuickArticleTypeFields.jsx`

Decision: one canonical archive entry editor. Raw editing is an advanced mode inside that editor, not a competing primary route.

### Overlapping account, workspace and settings surfaces

- `ProfilePage.jsx`
- `MyWorkspacePage.jsx`
- `SettingsPage.jsx`
- `OnboardingPage.jsx`

Decision: campaign selection, account settings and campaign/workspace settings are separate canonical areas.

### Shell duplication

- `FantasyShell.jsx` owns the visible shell composition.
- `AppShell.jsx` is a second wrapper with no meaningful ownership.
- `CodexSidebar.jsx` and `CodexTopbar.jsx` each contain independent route knowledge.
- `PageShell.jsx` is a page layout primitive, not an application shell.

Decision: one application shell driven by one route/navigation registry. `PageShell` remains only as a page layout primitive if it survives the final design-system migration.

## CSS debt confirmed by measurement

The current CSS root loads 20 stylesheets in sequence. The largest sources are:

| File | Lines | Selectors | `!important` | Hard-coded colors |
| --- | ---: | ---: | ---: | ---: |
| `components.css` | 6720 | 1373 | 16 | 689 |
| `codex-design.css` | 1627 | 356 | 49 | 189 |
| `stabilization.css` | 948 | 184 | 4 | 96 |
| `stage17-content-polish.css` | 793 | 145 | 1 | 68 |
| `fantasy.css` | 693 | 156 | 2 | 148 |
| `content-cards.css` | 651 | 116 | 12 | 55 |
| `stage18-editor-inspector-selects.css` | 609 | 105 | 15 | 63 |

The class `.codex-button` is declared in nine stylesheets. `.is-active` is declared in seven. `.codex-field` is declared in six. This confirms that the problem is not one isolated regression; cascade ownership is structurally undefined.

Decision: all current stylesheets are migration sources, not permanent parallel layers. The final runtime loads one design-system package and theme engine.

## Inline and local state findings

Inline styles occur in:

- `FantasyShell.jsx`
- `PageMap.jsx`
- `CinematicWorldBackground.jsx`
- `CharactersPage.jsx`

Browser storage is used only by `apps/web/src/api/client.js`, where campaign/session continuity must be reviewed separately from visual migration.

## Data ownership defects

| Data or action | Current competing surfaces | Canonical owner |
| --- | --- | --- |
| Campaign summary | Dashboard legacy page counts; Campaign Portal archive aggregate; World dashboard | Campaign Home using archive aggregate |
| Archive entries | Archive overview; category pages; page view; world dashboard | Campaign Archive |
| Entry editing | Visual editor; raw editor; quick fields | Archive Entry Editor |
| Maps | Global maps route; world maps route; archive shortcuts | Archive → Maps |
| Timeline | Global timeline route; world timeline route; world atlas shortcut | Archive → Timeline |
| Sessions | Sessions list; session desk; session mode; world session | Session Management + Live Session Workspace |
| Reveal | Handouts; player reveal; session mode; map/timeline reveal actions | Contextual reveal action with Visibility policy |
| Players and roles | Players page; profile/workspace summaries; character assignment | Campaign Management → Players |
| Characters | Shared characters page; assignment panel; editor view | GM Character Roster / Player My Character |
| Account and campaign settings | Profile; My Workspace; Settings; Campaign selector | Separate Account and Campaign Management owners |

## Stage 1 conclusion

No runtime behavior is changed by Stage 1. The baseline is recoverable, every current route/page/component/style source is assigned a migration decision, and the next stage can replace routing and shell ownership without guessing.
