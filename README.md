# PF2 Party Codex

PF2 Party Codex is becoming a MongoDB-backed Pathfinder 2e campaign workspace. During the migration, the existing Markdown vault and JSON files remain the legacy source of truth so current routes keep working while Mongo foundations are added.

## Install

```bash
npm install
```

## Start For Development

```bash
npm run dev
```
Copy `.env.example` to `.env` when you want local environment overrides. MongoDB is optional in Stage 1:

```env
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=pf2_party_codex
```

Without `MONGO_URI`, the server starts in legacy Markdown/JSON mode and `/api/health/db` reports Mongo as unconfigured.

The backend listens on `0.0.0.0:3050` and prints:

- `http://localhost:3050`
- `http://<your-local-ip>:3050`

Vite runs the frontend during development. For a production-style local run:

```bash
npm run build
npm run start
```

On Windows, double-click:

```txt
scripts/start-wiki.bat
```

## Players Connecting Over LAN

The GM runs the app on their laptop. Players open the printed LAN URL in a browser while connected to the same network. Do not expose this app directly to the public internet in V1.


## Mongo Atlas Local Development

The server loads environment variables from both places, in this order:

- project root `.env`
- `apps/server/.env`

Keep real Atlas credentials only in ignored local env files. Do not place real passwords in `.env.example`, README, source files, or committed scripts.

For Atlas, paste a URI like this into `.env`:

```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster-host>/pf2_party_codex?retryWrites=true&w=majority&appName=Cluster0
MONGO_DB_NAME=pf2_party_codex
```

Legacy mode is still supported. To run without Mongo, omit `MONGO_URI` or set `MONGO_DISABLED=true`:

```bash
npm run start --workspace apps/server
```

Mongo mode uses the same command after `MONGO_URI` is present:

```bash
npm run start --workspace apps/server
```

For an explicit health check port during local verification, set `PORT=4000` before starting the server, then call:

```txt
GET http://localhost:4000/api/health/db
```

Run the safe Atlas smoke test with:

```bash
npm run mongo:smoke --workspace apps/server
```

The smoke test touches only `system_smoke_tests`: it inserts one temporary document, reads it back, and deletes it.


## Identity Foundation

In Mongo mode, auth uses Mongo collections for global users, campaigns, memberships, and audit logs. The first registered Mongo user creates the default campaign `PF2 Party Codex` and receives an `owner` membership. Later local-dev registrations join that default campaign as `player` members.

Legacy mode still uses the existing JSON auth store when `MONGO_URI` is absent or `MONGO_DISABLED=true`.

Dev-safe identity health check:

```txt
GET http://localhost:4000/api/health/identity
```

Migrate existing JSON auth users into Mongo with:

```bash
npm run mongo:migrate:auth --workspace apps/server
```

The auth migration is idempotent. It creates missing Mongo users by normalized email, ensures the default campaign, and creates missing memberships without touching notes, characters, vault pages, maps, timeline, reveal, handouts, or assets.
## Markdown Vault

All campaign content lives in `vault/`. Any `.md` file with YAML frontmatter is indexed automatically.

Example:

```md
---
visibility: public
type: npc
tags: [ally, absalom]
---

# Captain Varos

Known contact in [[Black Harbor]].

## GM Secrets

Hidden notes for the GM.
```

Wiki links use:

- `[[Page Name]]`
- `[[Page Name|Visible Label]]`

To create pages manually, copy a template from `vault/_templates/` into the right folder, rename it, and edit the frontmatter and Markdown body.

The current starter vault uses a Russian onion / Niagara structure:

- `vault/worlds/` contains 8 major worlds and 1 shared small-worlds page.
- `vault/images/world-map.png` is served as the clickable map image.
- `vault/countries/` and `vault/cities/` contain nested examples for the world `Арка Ночи`.
- `vault/_templates/world.md`, `country.md`, and `city.md` are Russian templates with `mapImage`, `pins`, and hierarchy fields.
- `world`, `country`, `city`, `parent`, `related`, and `[[wiki links]]` generate child layers, related links, and backlinks.
- PNG maps stay local in `vault/images`; pings/pins are stored in Markdown frontmatter as percentage coordinates.

## GM Mode And Player Mode

The frontend toggle is for convenience, but redaction also happens server-side through `mode=player`.

Player mode hides:

- files with `visibility: gm`
- files with `visibility: draft`
- `## GM Secrets` sections
- `:::gm ... :::` blocks

GM mode includes the full local vault.

## Foundry Journal Import

Open `Foundry Import/Export`, upload one or more Foundry JSON exports, review the preview, choose conflict handling, then write Markdown files into the vault.

The importer defensively handles common Foundry v13-style `JournalEntry` and `JournalEntryPage` shapes, older content fields, arrays, and compendium-like JSON structures. Foundry HTML is converted to Markdown with `turndown`, and obvious Foundry links are converted into wiki links when possible.

## Foundry Journal Export

The export tool converts selected Markdown pages or categories into Foundry-style Journal JSON. It can create a single JSON file, per-page JSON files, or a basic module skeleton in `foundry-export/`.

Download the generated single JSON at:

```txt
/api/foundry/export/download
```

## Foundry Backup Warning

Foundry versions may change journal schema. Some UUID links may not resolve outside Foundry, and image paths may need manual adjustment. Always test imports in a copied world first, and never overwrite a real Foundry world without a backup.

## Project Structure

```txt
apps/server   Express API, Markdown vault services, Foundry import/export
apps/web      React + Vite frontend
vault         Markdown campaign source of truth
scripts       Windows startup helper
```

## Roadmap

- Validate Foundry adapters against real world exports.
- Add richer entity-specific editors.
- Add optional static export for read-only sessions.
- Add stronger local GM controls if the app is ever exposed beyond trusted LAN.
- Explore direct Foundry sync only after sample data validation.
