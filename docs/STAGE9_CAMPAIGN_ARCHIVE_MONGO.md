# Stage 9 — Campaign Archive Mongo Alignment

Branch: `stage9-campaign-archive-mongo`

## Goal

Make the Campaign Archive behave as SaaS campaign data, not as a local vault-only view.

The archive must be the central campaign workspace model:

```text
Workspace -> Campaign -> Archive -> Entries / Maps / Timeline / Sessions / Handouts / Characters / Notes
```

## Product rules

- Campaign scope comes from the active campaign membership.
- GM/owner sees public, revealed and private campaign material.
- Player sees only public/revealed/player-visible material.
- Player must not see GM-only archive actions.
- Empty states must explain what to create next.
- Archive page must be useful before billing, landing, or SaaS admin work starts.

## Patch 9.1 — Archive page alignment

Status: started.

Changed:

- `apps/web/src/pages/CampaignArchivePage.jsx`

What changed:

- Localized the archive page to Russian.
- Reframed `/archive` as the active campaign Mongo archive.
- Added manager/player visibility explanation.
- Replaced raw section names with product labels.
- Added section cards linked to real routes.
- Added useful manager empty states and quick actions.
- Kept API contract unchanged for this patch.

## Codex QA for Patch 9.1

Run after pulling this branch:

```bash
git checkout stage9-campaign-archive-mongo
git pull --ff-only origin stage9-campaign-archive-mongo
npm run build
npm run dev
```

Check:

1. `/archive` renders for owner/GM.
2. `/archive` renders for player.
3. Counts render as cards.
4. Empty state is understandable when archive is empty.
5. GM sees create actions.
6. Player does not see create actions.
7. Links from archive cards do not 404.
8. No duplicate portal shell appears.

## Next patches

Patch 9.2 — Create Article UX polish:

- One button system.
- Russian labels.
- Clear visibility controls.
- World/country/city hierarchy cleanup.

Patch 9.3 — Handouts / Reveal cleanup:

- Explain handouts in UI.
- GM sees reveal status.
- Player sees only released material.
- Remove raw developer copy.

Patch 9.4 — API visibility audit:

- Confirm all archive content endpoints use active membership.
- Confirm player filtering is strict.
- Confirm no campaign id trust from unsafe query sources where membership is missing.
