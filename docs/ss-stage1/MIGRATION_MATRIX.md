# SS Stage 1 — Route, Page and Component Migration Matrix

## Current route decisions

| Current route | Decision | Canonical target / ownership |
| --- | --- | --- |
| `/login` | Keep and restyle | `/login`; public auth shell only |
| `/invite/:token` | Keep and restyle | `/invite/:token`; public invitation flow |
| `/campaigns` | Move | `/app/campaigns` |
| `/` | Redirect | Active campaign home, campaign selector or login |
| `/gm` | Merge and redirect | Role-aware `/app/campaigns/:campaignId/home` |
| `/player` | Merge and redirect | Role-aware `/app/campaigns/:campaignId/home` |
| `/archive` | Move and rebuild | `/app/campaigns/:campaignId/archive` |
| `/players` | Move | `/app/campaigns/:campaignId/manage/players` |
| `/profile` | Move | `/app/account/profile` |
| `/world/:worldSlug` | Merge | `/app/campaigns/:campaignId/archive/worlds/:worldSlug` |
| `/world/:worldSlug/category/:category/*` | Merge | World-filtered canonical Archive section |
| `/world/:worldSlug/timeline` | Redirect | Archive Timeline with world context |
| `/world/:worldSlug/maps` | Redirect | Archive Maps with world context |
| `/world/:worldSlug/session` | Redirect | Live Session Workspace with world context |
| `/world/:worldSlug/reveal` | Merge | Contextual reveal actions and Visibility Management |
| `/world/:worldSlug/player` | Remove as application route | Campaign Home, Archive and Preview as Player |
| `/category/:category/*` | Merge | Canonical Archive section |
| `/page/:path` | Move | `/app/campaigns/:campaignId/archive/entries/:entryId` |
| `/editor` | Move and merge | `/app/campaigns/:campaignId/archive/entries/new` |
| `/edit/:path` | Merge | Advanced mode inside canonical Entry Editor |
| `/missing` | Move | `/app/campaigns/:campaignId/manage/archive-health` |
| `/timeline` | Move | `/app/campaigns/:campaignId/archive/timeline` |
| `/maps` | Move | `/app/campaigns/:campaignId/archive/maps` |
| `/my` | Remove and redirect | Account Profile, Campaign selector or Campaign Settings |
| `/notes` | Move | `/app/campaigns/:campaignId/notes` |
| `/characters` | Split by responsibility | Player My Character / GM Character Management |
| `/handouts` | Move | `/app/campaigns/:campaignId/archive/handouts` |
| `/sessions` | Split by responsibility | GM Session Management / player Archive Recaps |
| `/settings` | Split | Account Settings or Campaign Management Settings |
| `/gm-tools` | Dissolve | Contextual management actions and Help |
| `/health` | Move | `/app/campaigns/:campaignId/manage/archive-health` |
| `/player-safety` | Move and rename | `/app/campaigns/:campaignId/manage/visibility` |
| `/session-desk` | Move and merge | `/app/campaigns/:campaignId/session` |
| `/dice` | Move | `/app/campaigns/:campaignId/session/dice` |
| `/guide` | Move and restyle | `/help` |
| `/foundry` | Move | `/app/campaigns/:campaignId/manage/imports` |
| `*` | Keep and rebuild | Context-aware Not Found state |

## Page module decisions

| Current page module | Decision | Canonical responsibility |
| --- | --- | --- |
| `AccessDeniedPage.jsx` | Replace with shared state | Forbidden state inside correct shell |
| `AuthPage.jsx` | Keep and migrate | Public auth and password recovery |
| `CampaignArchivePage.jsx` | Rebuild | Archive overview and section navigation |
| `CampaignHealthPage.jsx` | Move and rebuild | Archive diagnostics in Management |
| `CategoryPage.jsx` | Merge | Canonical Archive Section page |
| `CharactersPage.jsx` | Split | GM Character Roster and Player My Character |
| `DashboardPage.jsx` | Merge then remove | Campaign Home |
| `DiceTrayPage.jsx` | Keep and migrate | Live Session Dice |
| `EditorPage.jsx` | Merge then remove | Canonical Archive Entry Editor |
| `FoundryImportExportPage.jsx` | Move and rebuild | Import/Export Management |
| `GMToolsPage.jsx` | Remove as standalone page | Contextual tools |
| `GmHomePage.jsx` | Merge then remove | Campaign Home GM composition |
| `GuidePage.jsx` | Keep and migrate | Public Help |
| `HandoutsPage.jsx` | Merge | Archive Handouts |
| `InviteAcceptPage.jsx` | Keep and migrate | Public invitation acceptance |
| `MapsPage.jsx` | Keep ownership, move route | Archive Maps |
| `MissingLinksPage.jsx` | Merge | Archive Health diagnostics |
| `MyWorkspacePage.jsx` | Remove | Campaign selector and settings owners |
| `NotFoundPage.jsx` | Keep and rebuild | Context-aware fallback |
| `NotesPage.jsx` | Keep and rebuild | Campaign Notes |
| `OnboardingPage.jsx` | Keep responsibility, move | Campaign selector/create flow |
| `PageView.jsx` | Replace | Archive Entry Detail |
| `PlayerHomePage.jsx` | Merge then remove | Campaign Home player composition |
| `PlayerRevealPage.jsx` | Split and remove | Contextual reveal + Preview as Player |
| `PlayerSafetyPage.jsx` | Move and rebuild | Visibility Management |
| `PlayersPage.jsx` | Keep ownership, rebuild | Players, roles and invitations |
| `ProfilePage.jsx` | Keep ownership, move | Account Profile |
| `RawEditorPage.jsx` | Merge then remove | Advanced mode in Entry Editor |
| `SessionDeskPage.jsx` | Merge | Live Session Workspace |
| `SessionModePage.jsx` | Split and merge | Session Management + Live Workspace |
| `SessionsPage.jsx` | Keep ownership, rebuild | Session Management / Recap publication |
| `SettingsPage.jsx` | Split and replace | Account and Campaign Settings |
| `TimelinePage.jsx` | Keep ownership, move route | Archive Timeline |
| `WorldDashboardPage.jsx` | Merge and remove | Archive World Overview |

## Component module decisions

| Current component module | Decision | Target ownership |
| --- | --- | --- |
| `AppErrorBoundary.jsx` | Keep and restyle | Application error boundary |
| `AppShell.jsx` | Replace | One canonical application shell |
| `ArticleFactsPanel.jsx` | Keep and migrate | Entry Editor facts section |
| `ArticleVisualEditor.jsx` | Merge | Canonical Entry Editor |
| `CampaignPortalHome.jsx` | Use as migration basis | Campaign Home composition |
| `CharacterAssignmentPanel.jsx` | Keep and migrate | Character Management |
| `CharacterEditorView.jsx` | Keep and migrate | Canonical Character Editor |
| `CodexSidebar.jsx` | Replace | Registry-driven sidebar |
| `CodexTopbar.jsx` | Replace | Registry-driven topbar |
| `DiceIcon.jsx` | Keep | Dice visual primitive |
| `EntityCard.jsx` | Replace through design system | Shared entity presentation |
| `EntityDetailPanel.jsx` | Keep concept, rebuild | Shared entity detail pattern |
| `FantasyShell.jsx` | Remove | Replaced by canonical App Shell + theme engine |
| `FoundryExportPanel.jsx` | Keep and migrate | Import/Export Management |
| `FoundryImportPanel.jsx` | Keep and migrate | Import/Export Management |
| `HierarchyPanel.jsx` | Keep and migrate | Archive hierarchy/relations |
| `HoverPreviewCard.jsx` | Keep concept, rebuild | Shared preview pattern |
| `LoreDropdown.jsx` | Remove | Standard Select primitive |
| `MarkdownViewer.jsx` | Keep | Sanitized content renderer |
| `PageBackButton.jsx` | Keep and standardize | Unified deep-page back control |
| `PageMap.jsx` | Keep functionality, rebuild | Archive Map Editor; remove inline styles |
| `QuickArticleTypeFields.jsx` | Merge | Entry schema sections |
| `RollToast.jsx` | Keep and migrate | Live Session feedback |
| `RouteLoading.jsx` | Replace | Shared Loading State |
| `WorldAtlas.jsx` | Merge | Archive Worlds overview |
| `ActionRow.jsx` | Replace | Shared action layout primitive |
| `CodexButton.jsx` | Replace | Final Button primitive |
| `CodexCard.jsx` | Replace | Final Card primitive |
| `EmptyState.jsx` | Replace | Final Empty State primitive |
| `PageHero.jsx` | Replace | Final Page Header/Hero primitive |
| `PageShell.jsx` | Replace | Final page layout primitive |
| `SectionHeader.jsx` | Replace | Final Section Header primitive |
| `StatusMessage.jsx` | Replace | Final Notice/Status primitive |
| `components/ui/index.js` | Replace exports | Final design-system barrel |
| `Silverleaf.jsx` | Keep as canonical production implementation | Button, IconButton, Input, Select, Textarea, Field, Panel, Chip, Tabs, Dialog, Notice and shared states |
| `CinematicWorldBackground.jsx` | Keep concept, rebuild | Theme/atmosphere engine; remove inline styles |

## Migration rule

A `Merge`, `Split`, `Replace` or `Remove` item is not complete when the new page merely exists. Completion requires removal of the old primary navigation, old editor ownership, obsolete route and obsolete style dependencies.
