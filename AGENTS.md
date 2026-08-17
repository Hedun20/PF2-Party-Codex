# PF2 Party Codex repository instructions

## Start safely

- Read `docs/architecture/CURRENT_STATE_AUDIT.md`, `REUSE_ADAPT_REWRITE_RETIRE.md`, and `NEXTJS_MIGRATION_SEQUENCE.md` before architecture or migration work.
- Before editing, inspect `git status`, current branch, remotes, and `origin/main`. Stop if the worktree is dirty in an unexpected way or the requested baseline is ambiguous.
- Use `origin/main` as the baseline unless the task explicitly names another reviewed commit. Draft PR branches are not baseline inputs.
- Keep each task on its own branch and PR. Never merge or deploy unless the task explicitly authorizes it.

## Architecture invariants

- Campaign Archive is the product core. GM Portal, Player Portal, and platform admin are interfaces to the same platform, not separate data products.
- MongoDB is the source of truth for domain data. Markdown/vault/Foundry files are import, export, backup, or compatibility artifacts only.
- Roles are per exact campaign membership: `owner`, `gm`, `player`. `platformAdmin` is separate and never implies campaign access.
- Backend policy must filter every player response. Hiding a field or route in the frontend is not authorization.
- Keep the core system-neutral. PF2e, Pathbuilder, Foundry, email, storage, billing, and AI behavior belong behind explicit adapters/ports.
- Target direction is Next.js App Router plus strict TypeScript, but migration is vertical and gated. Do not scaffold or broadly rewrite before the current audit and prerequisite contracts are approved.
- Preserve the Express/Vite implementation as a rollback path until each migrated slice passes behavior, security, data, and operational gates.

## Data and security safety

- Never use production MongoDB for implementation, tests, first-run scripts, or migration rehearsal.
- Do not run destructive database/file commands without explicit task scope, a resolved target, dry-run evidence, a verified backup, and a rollback/forward-repair plan.
- Every campaign query and mutation must receive a server-verified campaign context; never trust a client-supplied campaign ID or role by itself.
- Never log or expose passwords, session/invitation/reset tokens, raw private imports, GM-only content, or secret environment values.
- New import/event handlers must be idempotent and default untrusted content to review-required, not public.
- Do not add or redistribute game-system/reference datasets without recorded source, version, license, and provenance review.

## Change discipline

- Prefer one end-to-end vertical slice over cross-repository rewrites.
- Extract contracts and characterize behavior before changing storage, auth, visibility, or public payloads.
- Keep domain policy out of Express/Next handlers and React components. Keep Mongo documents and browser DTOs behind adapters.
- Do not copy the full legacy CSS cascade into a new app. Reuse curated tokens/visual intent and rebuild component ownership with visual/accessibility checks.
- Treat `apps/server/src/services/vaultService.js`, PF2 character/rules code, session runner/dice surfaces, and stage/hotfix CSS as scoped compatibility or deferred modules, not automatic migration inputs.
- When a current inconsistency is found, document and test it; do not silently normalize production behavior.

## Validation

- Use the Node version in `.nvmrc` and install from `package-lock.json` with `npm ci` in an approved environment.
- Existing baseline gates are `npm test`, `npm run build`, `npm run check:syntax`, and `npm run audit:production` (or `npm run verify`). Do not remove a legacy gate while the legacy runtime is a rollback target.
- Add strict typecheck, runtime-contract tests, disposable-Mongo integration tests, access-matrix tests, and browser/accessibility checks as the migration reaches those layers.
- Report commands and exact results. Missing dependencies or blocked infrastructure are “not verified,” never “passed.”
- Documentation-only tasks must not change runtime files, dependency manifests, lockfiles, generated build output, or database state.
