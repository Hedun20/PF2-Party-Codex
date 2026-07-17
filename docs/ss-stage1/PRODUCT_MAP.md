# SS Stage 1 — Canonical Product Map

## Product rule

Campaign Archive is the product center. Live Session Workspace is the play-time surface. Campaign Management is the operational surface. GM and Player are role-aware views of the same campaign, not separate applications.

MongoDB remains the source of truth. Vault/page compatibility may remain behind adapters during migration, but no frontend page may become a second source of truth.

## Shell boundaries

### Public shell

Unauthenticated users never see the campaign shell, archive header or campaign navigation.

Canonical routes:

- `/login`
- `/invite/:token`
- `/help`

### Account shell

Authenticated account-level routes do not require an active campaign.

- `/app/campaigns`
- `/app/account/profile`
- `/app/account/settings`

### Campaign shell

All campaign work is scoped by exact campaign ID:

`/app/campaigns/:campaignId`

The shell must always show active campaign, current role, current product area and a deterministic way back.

## Canonical campaign navigation

### 1. Campaign Home

`/app/campaigns/:campaignId/home`

One role-aware page. GM and Player compositions may differ, but both use the same campaign archive aggregate and the same route.

Primary ownership:

- campaign identity;
- current role;
- recent material;
- next session summary;
- warnings and next actions;
- links into Archive, Session and Management.

### 2. Campaign Archive

`/app/campaigns/:campaignId/archive`

Sections:

- `/archive/worlds`
- `/archive/worlds/:worldSlug`
- `/archive/lore`
- `/archive/npcs`
- `/archive/locations`
- `/archive/factions`
- `/archive/quests`
- `/archive/maps`
- `/archive/timeline`
- `/archive/handouts`
- `/archive/recaps`
- `/archive/entries/:entryId`
- `/archive/entries/new`
- `/archive/entries/:entryId/edit`

World context may be expressed by nested archive route or query state. It may change filtering, banner, theme and atmosphere. It may not create a second sidebar, shell, maps module, timeline module or editor.

Primary ownership:

- lore and archive entries;
- relations and hierarchy;
- maps and map objects;
- timeline events;
- handouts;
- player-safe recaps;
- reveal state for archive content.

### 3. Live Session Workspace

`/app/campaigns/:campaignId/session`

Supporting routes:

- `/session/dice`
- `/session/notes`
- `/session/handouts`

Primary ownership:

- active session state;
- dice and temporary play tools;
- quick notes;
- currently presented handout;
- rapid links back to archive entities.

This workspace must not become another archive editor or session administration page.

### 4. Personal campaign area

- `/app/campaigns/:campaignId/my-character`
- `/app/campaigns/:campaignId/notes`

Primary ownership:

- assigned player character dossier;
- private/shared/party notes according to backend visibility.

### 5. Campaign Management

Manager-only navigation:

- `/app/campaigns/:campaignId/manage/sessions`
- `/app/campaigns/:campaignId/manage/players`
- `/app/campaigns/:campaignId/manage/characters`
- `/app/campaigns/:campaignId/manage/assets`
- `/app/campaigns/:campaignId/manage/imports`
- `/app/campaigns/:campaignId/manage/archive-health`
- `/app/campaigns/:campaignId/manage/visibility`
- `/app/campaigns/:campaignId/manage/settings`
- `/app/campaigns/:campaignId/preview`

Primary ownership:

- session preparation and recap publication;
- memberships, roles and invitations;
- character creation, import and assignment;
- campaign assets;
- import/export jobs;
- broken links and archive diagnostics;
- visibility audit and Preview as Player;
- campaign/workspace settings.

## One-editor rule

| Entity | Canonical primary editor |
| --- | --- |
| Archive entry | Archive Entry Editor |
| Map | Archive Map Editor |
| Timeline event | Archive Timeline Editor |
| Session | Session Management Editor |
| Handout | Archive Handout Editor |
| Note | Notes Editor |
| Character | Character Editor in Management; player edits only allowed fields in My Character |
| Membership/invitation | Players Management |
| Campaign configuration | Campaign Management Settings |
| Account/profile | Account Settings |

Summaries may appear elsewhere. A summary links to the canonical owner and never duplicates the full editor.

## Navigation groups

The final sidebar has three product groups and one account footer:

1. **Campaign** — Home, Archive, My Character, Notes.
2. **Live Session** — Session Workspace, Dice when relevant.
3. **Management** — Sessions, Players, Characters, Assets, Imports, Health, Visibility, Settings; manager-only.
4. **Account footer** — Campaign switcher, Profile, Account Settings, Help, Logout.

## Deep-page navigation

`PageBackButton` remains the unified back-control concept for deep pages. It is left-aligned inside the page header and resolves a deterministic parent route rather than depending only on browser history.

## State contract for every route

Every canonical page must implement:

- loading;
- loaded content;
- empty;
- recoverable error;
- forbidden;
- missing membership;
- not found where applicable.

A direct URL refresh must produce one of these states, never a blank shell.
