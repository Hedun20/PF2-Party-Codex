# PF2 Party Codex

PF2 Party Codex is a local-first Pathfinder 2e campaign wiki for a GM laptop and players on the same local network. Markdown files in `vault/` are the source of truth. The web UI watches and indexes those files, but the GM can keep editing raw `.md` files directly.

## Install

```bash
npm install
```

## Start For Development

```bash
npm run dev
```

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

The current starter vault includes a Russian world timeline:

- `vault/worlds/` contains 8 major worlds and 1 shared small-worlds page.
- `vault/images/world-map.png` is served as the clickable map image.
- `vault/_templates/city.md` and `vault/_templates/country.md` are Russian templates for new cities and countries.
- `related: [...]` frontmatter and `[[wiki links]]` generate visible related links and backlinks in page view.

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
