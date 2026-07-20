# Silverleaf Dark Branding Lab

This folder is an isolated, backend-free JSX prototype for the approved PF2 Party Codex visual system.

## Run

From the repository root:

```bash
npm run dev --workspace apps/web
```

Open:

```text
http://localhost:5173/branding/
```

The lab uses hash routing so every prototype page remains directly reloadable without changing the production server routing contract.

## Pages

- Foundations and component states
- Character dossier
- Dice workspace
- Players and invitations

## Migration rule

Nothing in this folder is a production component until it is reviewed, moved into the canonical design-system location, covered by production tests, and the corresponding legacy implementation is removed.

The lab may import shared third-party packages already used by `apps/web`, but it must not import current production components or production CSS. This keeps the brochure honest and prevents accidental dependence on the legacy cascade.

## Approved theme contract

- Theme: `Silverleaf Dark`
- Product family: `Royal Archive`
- Atmosphere: noble, ancient, organized, mysterious, trustworthy
- Fantasy intensity: 7/10
- One layout system with expanded, collapsed and mobile navigation states
- World themes may change tokens, assets, ornament and atmosphere only
- Shared component dimensions, behavior, accessibility and page structure remain stable
