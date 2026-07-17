# SS Stage 2 — Canonical Routing and Single Application Shell

Status: implementation complete; release gate enforced by CI

## Result

The frontend now has one route registry, one application shell and campaign-scoped canonical URLs. Legacy URLs remain only as explicit compatibility redirects. They are not second implementations of product pages.

## Canonical ownership

- `apps/web/src/routing/appRoutes.js` is the only route, title, parent, access and navigation registry.
- `apps/web/src/components/ApplicationShell.jsx` is the only application shell.
- `apps/web/src/components/CodexSidebar.jsx` derives navigation from the registry.
- `apps/web/src/components/CodexTopbar.jsx` derives title, account links and campaign switching from the registry.
- `apps/web/src/components/RouteBreadcrumbs.jsx` derives breadcrumbs from route parents.
- `apps/web/src/components/PageBackButton.jsx` resolves a deterministic parent from the registry instead of relying on browser history.
- `apps/web/src/routing/CampaignScopeGate.jsx` prevents rendering a campaign page with stale or unauthorized campaign context.
- `apps/web/src/routing/LegacyRouteRedirect.jsx` is the single adapter for old URLs.

## Component migration decisions added in Stage 2

| Component | Decision | Canonical responsibility |
| --- | --- | --- |
| `ApplicationShell.jsx` | Keep | The only public/account/campaign application shell |
| `RouteBreadcrumbs.jsx` | Keep | Registry-driven breadcrumbs |

The former `FantasyShell.jsx` and empty `AppShell.jsx` were deleted. `CodexSidebar.jsx`, `CodexTopbar.jsx` and `PageBackButton.jsx` were replaced in place and now consume the registry.

## Canonical URL families

### Public

- `/login`
- `/invite/:token`
- `/help`

Public routes do not render campaign sidebar, campaign background or campaign navigation.

### Account

- `/app/campaigns`
- `/app/account/profile`
- `/app/account/settings`

Account routes require authentication but do not require an active campaign.

### Campaign

Every campaign route begins with `/app/campaigns/:campaignId`.

Primary areas: `/home`, `/archive`, `/session`, `/notes`, `/my-character`, `/manage/*`, `/preview`.

## Exact campaign-context rule

The campaign ID in the URL is authoritative for navigation context. Before a campaign page renders:

1. the user must be authenticated;
2. an active membership must exist;
3. the URL campaign must appear in the user's campaign list or equal the active campaign;
4. if the URL campaign differs from the active campaign, the application activates it and shows loading instead of stale content;
5. inaccessible campaign IDs render the forbidden state;
6. campaign switching replaces the campaign segment while preserving the current product area and query context.

## Role policy

Public routes allow guests. Account routes require an authenticated account. Campaign routes require exact active campaign membership. Manager routes require owner or GM. Manager navigation is never emitted for a Player, and direct manager URLs fail closed.

## Legacy redirect policy

Every former URL is represented once in `LEGACY_ROUTE_REDIRECTS`. Redirects use `replace`, preserve required query context and resolve to a canonical route. No legacy URL mounts a second page implementation.

Examples:

- `/archive` → campaign Archive;
- `/maps` → Archive Maps;
- `/world/:worldSlug/timeline` → Archive Timeline with `world` context;
- `/session-desk` → Live Session Workspace;
- `/players` → Players Management for managers, Campaign Home otherwise;
- `/characters` → My Character for players, Character Management for managers;
- `/guide` → `/help`.

## Preserved functionality

Authentication, invitations, onboarding, campaign activation and notices, page/category refresh, world filtering, theme resolution, GM/Player enforcement, focus trap, Escape close, mobile overlay, skip link and route loading remain active. Existing page modules remain reachable until their dedicated migration stages.

## Automated acceptance contracts

`tests/ss-stage2-routing-shell-contracts.test.mjs` verifies unique route ownership, encoded paths, deterministic parents, role navigation, legacy redirects, one mounted shell, registry-driven navigation and campaign scope gating. Backend and security route checks were split into focused contract files rather than removed.

## Manual QA route matrix

- Guest: `/` → `/login`; login/invite have no campaign chrome; protected URLs return to auth.
- Account without campaign: `/` → `/app/campaigns`; profile works; campaign pages fail safely.
- Player: Home, Archive, Session, Notes and My Character work; management is absent and forbidden directly.
- Owner/GM: every management route works; campaign ID, role and route title remain visible.
- Multiple campaigns: switching preserves product path; stale campaign content never renders; inaccessible IDs fail closed.
- Navigation: sidebar closes on route change/Escape; focus stays inside mobile sidebar; breadcrumbs and Back use deterministic parents; world selection changes context without a second route tree.

## Removed duplication

- deleted `FantasyShell.jsx`;
- deleted the empty `AppShell.jsx` wrapper;
- removed sidebar mode-specific route tables;
- removed topbar independent mode routing;
- removed history-based parent guessing;
- removed active page mounts from legacy URLs;
- centralized campaign path replacement and role navigation.
