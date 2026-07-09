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

Status: implemented, awaiting Codex build/browser QA.

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

## Patch 9.2 — Create Article UX polish

Status: partial implementation, awaiting Codex build/browser QA.

Changed:

- `apps/web/src/pages/EditorPage.jsx`

What changed:

- Replaced old localhost/player-mode copy with membership-based GM access copy.
- Localized the editor page header.
- Reframed create flow as campaign material creation, not raw Markdown file creation.

Remaining after QA:

- Remove the last visible `Markdown` wording from the submit button/import wording inside `QuickEditor.jsx`.
- Normalize any remaining mixed English/Russian labels in advanced controls.

## Patch 9.3 — Handouts / Reveal cleanup

Status: implemented via V2 page, awaiting Codex build/browser QA.

Changed:

- `apps/web/src/pages/HandoutsPageV2.jsx`
- `apps/web/src/pages/HandoutsPage.jsx`

What changed:

- Added a clearer Handouts / Reveal page.
- Explained what Handouts and Reveal mean.
- GM/participant visibility is explained in the hero strip.
- Mongo handouts are used when available.
- Legacy vault public handouts are shown as compatibility fallback.
- Empty state now explains what GM or participant should expect next.

## Patch 9.4 — API visibility audit

Status: pending after UI QA.

Initial finding:

- `apps/server/src/routes/archive.js` already uses `identityContextForCampaign(req.user, campaignId)` before reading archive data.
- GM roles are limited to `owner` and `gm`.
- Non-GM archive queries restrict entries/maps/timeline/sessions to public/revealed style visibility and exclude drafts.
- Handouts, characters and notes have separate role-aware queries.

Needs Codex QA:

- Confirm player archive does not expose GM-only entries.
- Confirm `/api/campaigns/:campaignId/archive` rejects users without membership.
- Confirm query/body campaign ids cannot bypass membership.

## Codex QA for current Stage 9 patch set

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
5. GM sees archive create actions.
6. Player does not see archive create actions.
7. Links from archive cards do not 404.
8. `/editor` renders and the access-denied copy is membership-based, not localhost-based.
9. `/handouts` renders new Handouts / Reveal page.
10. GM and participant empty states are understandable.
11. No duplicate portal shell appears.

## MD note

`MD` means Markdown. In this project, docs such as this file are `.md` files. They are project checkpoints and task contracts for humans/Codex. They do not change app behavior unless code files are also changed.
