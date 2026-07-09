# Stage 9 — Campaign Archive Mongo Alignment

Branch: `stage9-campaign-archive-mongo`

Status: **Green after Codex build/browser QA**

## Validation result

- `npm run build` passed with only the existing Vite chunk-size warning.
- `/archive` renders for owner/GM and player.
- Archive count cards render.
- Empty archive states are understandable for GM and player.
- GM sees archive create actions; player does not.
- Archive card links checked: no 404.
- `/editor` renders the new create article page for GM.
- `/editor` player denial copy is membership-based.
- Public article creation passed.
- GM-private article creation passed.
- `/handouts` renders the new Handouts / Reveal page.
- GM/player handout empty states are understandable.
- Duplicate `.portal-nav` count is `0`.
- `/api/campaigns/:campaignId/archive` rejects no-membership user with `403`.
- Player archive does not expose GM-only Mongo entries.
- Working tree was clean on `stage9-campaign-archive-mongo` after QA.

Note: dev server used web port `5174` because an existing port was busy; live API was on `3050`. This does not block readiness.

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

Status: Green.

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

Status: Green.

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

Status: Green.

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

Status: Green.

Finding:

- `apps/server/src/routes/archive.js` uses `identityContextForCampaign(req.user, campaignId)` before reading archive data.
- GM roles are limited to `owner` and `gm`.
- Non-GM archive queries restrict entries/maps/timeline/sessions to public/revealed style visibility and exclude drafts.
- Handouts, characters and notes have separate role-aware queries.
- No backend API contract was changed in this stage, reducing risk before QA.
- Codex confirmed no-membership archive access returns `403`.
- Codex confirmed player archive does not expose GM-only Mongo entries.

## Merge rule

This branch is eligible to merge into `main`.

Suggested merge flow:

```bash
git checkout stage9-campaign-archive-mongo
git pull --ff-only origin stage9-campaign-archive-mongo
git status -sb

git checkout main
git pull --ff-only origin main
git merge --no-ff stage9-campaign-archive-mongo
npm run build
git push origin main
```

After merge, create Stage 10 branch:

```bash
git checkout -b stage10-playtest-core-polish
git push -u origin stage10-playtest-core-polish
```

## MD note

`MD` means Markdown. In this project, docs such as this file are `.md` files. They are project checkpoints and task contracts for humans/Codex. They do not change app behavior unless code files are also changed.
