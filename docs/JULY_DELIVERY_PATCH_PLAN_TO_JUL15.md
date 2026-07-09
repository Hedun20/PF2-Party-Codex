# July Delivery Patch Plan — through July 15

Branch in active work: `fix/identity-onboarding-v2`

## Working model

Use two tracks in parallel:

1. **Assistant direct GitHub patches**
   - Product architecture decisions.
   - Focused code changes.
   - Documentation/checkpoint updates.
   - No merge to `main` until Green QA.

2. **Codex local runner**
   - Must always `git pull` first because GitHub is being patched directly.
   - Runs build, dev server, browser smoke, and reports regressions.
   - Fixes only small local blockers unless explicitly instructed.
   - Does not redesign, does not merge, does not add billing/landing before current stage is Green.

## Codex first command

```bash
git status -sb
git checkout fix/identity-onboarding-v2
git fetch origin --prune
git pull --ff-only origin fix/identity-onboarding-v2
npm install
npm run build
npm run dev
```

If there are local changes:

```bash
git status
# If the changes are disposable, ask before resetting.
# If they must be preserved:
git stash push -m "local work before stage 8 pull"
git pull --ff-only origin fix/identity-onboarding-v2
```

## Today — Stage 8 Green QA

Goal: the current app must become test-ready.

### Patch type A — blocking build fixes

- Fix import errors.
- Fix missing routes.
- Fix JSX syntax errors.
- Fix API method mismatch.
- Do not change product architecture unless required to build.

### Patch type B — portal UX blockers

- `/players` must render and invite only players.
- `/my` must render workspace overview.
- `/profile` must render profile overview.
- `/settings` must render localized settings.
- `/dice` must not 404; placeholder is acceptable.
- Sidebar/topbar must not show GM/player toggle.
- No duplicate portal nav inside dashboard.

### Patch type C — identity smoke blockers

- New user after registration has no campaign membership.
- No-campaign user sees onboarding.
- Onboarding creates workspace/campaign/owner membership.
- Owner/GM can access `/players`, `/editor`, `/gm-tools`, `/health`.
- Player cannot access GM-only routes.
- Invite acceptance creates player membership only.

Exit criteria: build passes + browser smoke passes.

## July 10–11 — Merge Identity + Portal UX to main

Only after Stage 8 Green:

- Review diff.
- Merge `fix/identity-onboarding-v2` into `main`.
- Tag/checkpoint the merge.
- Create a new branch for Archive/Mongo alignment.

Suggested branch:

```bash
git checkout main
git pull --ff-only origin main
git checkout -b stage9-campaign-archive-mongo
```

## July 11–13 — Stage 9 Campaign Archive Mongo Alignment

Goal: make campaign content behave like SaaS product data, not legacy local vault only.

Patch set:

1. **Campaign Archive API audit**
   - Verify archive endpoints return campaign-scoped data.
   - Verify visibility filtering: GM sees private/public, player sees public/revealed only.
   - Ensure campaign id comes from active membership, not query trust.

2. **Archive frontend alignment**
   - `/archive` becomes real campaign archive overview.
   - Entries grouped by world/category/type.
   - Empty states explain what GM should create next.
   - Player archive has no GM-only controls.

3. **Create Article UX polish**
   - One button system.
   - Russian labels.
   - Clear visibility controls: Public / GM private / Reveal later.
   - World/country/city hierarchy must be understandable.

4. **Handouts / Reveal cleanup**
   - Explain handouts in UI.
   - GM can see what is revealed.
   - Player sees only revealed/public materials.
   - No raw “No handouts yet” developer copy.

Exit criteria: archive, create article, handouts are usable for playtest.

## July 13–15 — Stage 10 Playtest Core Polish

Goal: make the actual table-play experience feel coherent.

Patch set:

1. **GM Dashboard**
   - Campaign status.
   - Quick create.
   - Players/invites.
   - Recent archive changes.
   - Next session placeholder.
   - Handouts/reveal status.

2. **Player Dashboard**
   - Campaign intro.
   - Recent handouts.
   - Known lore.
   - Maps.
   - Character shortcut.
   - Notes shortcut.

3. **Dice tray MVP**
   - `/dice` page.
   - d20, d12, d10, d8, d6, d4.
   - Formula input such as `1d20+7`.
   - Local roll history.
   - No multiplayer sync yet unless trivial.

4. **Full Russian pass for core UX**
   - Sidebar.
   - Topbar.
   - Players.
   - Workspace.
   - Profile.
   - Settings.
   - Dashboard.
   - Handouts.
   - Create Article.

Exit criteria: GM can run a basic campaign session; player can join and use visible materials.

## After July 15

Start SaaS shell:

- Public landing.
- Pricing page.
- Registration funnel.
- Product onboarding polish.
- Payment provider in test mode only until legal receiver is decided.
- Production deployment path.

## Rule

Do not let Codex open broad refactors. Every patch must have a named stage and acceptance criteria.
