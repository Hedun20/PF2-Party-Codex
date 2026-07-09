# Stage 9 — Campaign Archive Mongo Alignment

Branch: `stage9-campaign-archive-mongo`

Status: **implementation complete, waiting for Codex build/browser QA**

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

Status: implemented.

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

Status: implemented.

Changed:

- `apps/web/src/pages/EditorPageV2.jsx`
- `apps/web/src/pages/EditorPage.jsx`

What changed:

- Replaced the old editor route with a polished create article page.
- Removed visible MD/Markdown wording from the create flow.
- Replaced old localhost/player-mode copy with membership-based GM access copy.
- Localized the page in Russian.
- Reframed create flow as campaign material creation.
- Added clear visibility controls: Public, GM private, Draft.
- Added world/country/city hierarchy logic.
- Separated public text from GM secrets.
- Kept creation through existing `api.createPage` contract.

## Patch 9.3 — Handouts / Reveal cleanup

Status: implemented.

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

Status: implementation-side audit complete, needs Codex verification.

Finding:

- `apps/server/src/routes/archive.js` already uses `identityContextForCampaign(req.user, campaignId)` before reading archive data.
- GM roles are limited to `owner` and `gm`.
- Non-GM archive queries restrict entries/maps/timeline/sessions to public/revealed style visibility and exclude drafts.
- Handouts, characters and notes have separate role-aware queries.
- No backend API contract was changed in this stage, reducing risk before QA.

Needs Codex QA:

- Confirm player archive does not expose GM-only entries.
- Confirm `/api/campaigns/:campaignId/archive` rejects users without membership.
- Confirm query campaign ids cannot bypass membership.

## Codex QA for complete Stage 9

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
8. `/editor` renders the new create article page.
9. `/editor` access-denied copy is membership-based, not localhost-based.
10. Create article page can create at least one public article.
11. Create article page can create at least one GM private article.
12. `/handouts` renders the new Handouts / Reveal page.
13. GM and participant empty states are understandable.
14. Player does not see GM-only archive actions.
15. No duplicate portal shell appears.

If build fails, fix only the smallest build/runtime blocker. Do not add billing, landing, pricing, SaaS admin, or broad redesign.

## MD note

`MD` means Markdown. In this project, docs such as this file are `.md` files. They are project checkpoints and task contracts for humans/Codex. They do not change app behavior unless code files are also changed.
