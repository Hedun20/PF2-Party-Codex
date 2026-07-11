# Party Codex

Party Codex is an archive-first collaborative campaign workspace for tabletop RPG groups. A GM curates the campaign archive and live-table tools; players receive a membership-scoped portal containing only content the backend allows them to see.

The repository name still reflects the original single-system prototype. The product architecture is system-agnostic: game-system adapters and character renderers sit on top of the shared campaign platform.

## Architecture at a glance

- MongoDB is the application source of truth for users, workspaces, campaigns, memberships, invitations, entries, maps, timeline events, sessions, handouts, notes, characters, and imports.
- A registered account has no permanent GM/player role. Access comes from an active membership in the exact requested campaign.
- Creating a workspace explicitly creates its first campaign and an owner membership.
- Players join campaigns only through invitations.
- The Markdown vault is a compatibility, import, export, and readable-backup layer. It is not the target multi-tenant database.
- Player visibility is enforced on the backend. Hiding controls in React is never treated as a security boundary.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB or MongoDB Atlas for the complete identity and campaign workflow

## Install

```bash
npm ci
```

Copy `.env.example` to `.env`, then configure at least:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/pf2_party_codex?retryWrites=true&w=majority
MONGO_DB_NAME=pf2_party_codex
AUTH_SECRET=replace-with-a-long-random-secret
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3050
PUBLIC_APP_URL=http://localhost:5173
EMAIL_MODE=outbox
```

Generate a local signing secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit real credentials or local `.env` files.

## Run locally

```bash
npm run dev:clean
```

- Web: `http://localhost:5173`
- API: `http://localhost:3050`
- Health: `http://localhost:3050/api/health`
- Database health: `http://localhost:3050/api/health/db`

The server can boot with `MONGO_DISABLED=true` for legacy vault compatibility and diagnostics. That mode is not a complete product mode: workspace onboarding and Mongo-backed campaign modules intentionally return `503`. Use MongoDB for identity, membership, and role QA.

## Verify

```bash
npm test
npm run build
```

The stabilization tests cover:

- frontend route and mode contracts;
- world-scope query preservation;
- timeline API response compatibility;
- server startup when LAN interfaces cannot be enumerated;
- guest access boundaries for campaign content;
- Identity v2 registration copy;
- dev owner seed safety.

## Identity flow

1. Registration creates a global user only.
2. The user confirms their email.
3. A future owner creates a workspace and campaign through onboarding, or a player accepts an invitation.
4. Backend routes resolve the active membership for the requested campaign.
5. Only `owner` and `gm` memberships receive management permissions.

Unknown `/api/*` routes always return JSON `404`; they never fall through to the SPA.

## Optional local owner seed

The seed is explicit, environment-driven, disabled in production, and preserves an existing user's ID and unrelated memberships.

```env
DEV_OWNER_EMAIL=owner@example.com
DEV_OWNER_PASSWORD=replace-with-a-unique-12-plus-character-password
DEV_OWNER_NAME=Local Owner
DEV_WORKSPACE_NAME=Party Codex Dev Workspace
DEV_CAMPAIGN_NAME=Party Codex Dev Campaign
DEV_OWNER_SEED_CONFIRM=CREATE_OR_UPDATE_LOCAL_OWNER
```

```bash
npm run dev:create-owner --workspace apps/server
```

## MongoDB utilities

Safe connectivity smoke test:

```bash
npm run mongo:smoke --workspace apps/server
```

Identity migration from legacy JSON:

```bash
npm run mongo:migrate:auth --workspace apps/server
```

Vault import:

```bash
npm run vault:dry-run --workspace apps/server
npm run vault:commit --workspace apps/server
```

Always run the dry run first and keep a backup before migration.

## Project structure

```text
apps/server   Express API, Mongo repositories, visibility and compatibility services
apps/web      React + Vite GM/player workspace
docs          Architecture checkpoints, delivery notes, and QA checklists
scripts       Local development helpers
tests         Route, security-boundary, and startup smoke tests
vault         Optional legacy Markdown compatibility data (local/imported)
```

## Current release gates

The application is still in stabilization and is not ready for public multi-tenant exposure until these gates are closed:

- migrate remaining player-facing legacy vault reads to campaign-scoped Mongo entries;
- complete authenticated owner/GM/player browser QA against a real Mongo test database;
- consolidate the legacy CSS layers into the shared UI-block system;
- finish product naming, responsive visual QA, accessibility, production email, observability, and deployment hardening.

See `docs/STAGE10_QA_CHECKLIST.md` for the current manual route sweep.
