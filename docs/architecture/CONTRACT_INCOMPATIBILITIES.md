# HED-103 contract compatibility record

## Scope and safety boundary

HED-103 adds framework-free TypeScript contracts and policy helpers only. It does not import them into the Express/Vite runtime, change routes, mutate MongoDB, install Next.js, or cut over authentication. The existing implementation remains the rollback path.

The target rule is stricter than the current serializer: a player response must not contain GM-only keys at any depth, even when their values are empty or `undefined`. Backend policy must construct an allowlisted player DTO; frontend hiding is not a security control.

## Current entry compatibility

| Surface | Current repository evidence | HED-103 contract | Compatibility result | Required follow-up |
| --- | --- | --- | --- | --- |
| GM entry JSON | `apps/server/src/repositories/entriesRepository.js` `publicEntry()` emits `id`, campaign/world IDs, content, status, visibility, tags, aliases, metadata, source, actor IDs and timestamps. | `GmArchiveEntryDto` preserves that serialized field set and validates all five current entry visibility values. | The redacted synthetic fixture validates. Existing records with missing/non-string timestamps or non-JSON metadata will fail validation. | A future adapter must report invalid historical records; it must not invent or persist replacements during read. |
| Player entry JSON | `playerSafeEntry()` spreads the GM object, sets `gmContent: ""`, and assigns `undefined` to `source`, `createdBy`, and `updatedBy`. JSON serialization drops the `undefined` keys but retains the empty `gmContent` key. | `PlayerArchiveEntryDto` does not define any GM field and rejects forbidden keys recursively. | Intentionally incompatible: `current-player-entry.json` is rejected at `entry.gmContent`. | The archive read adapter must build the target DTO with `toPlayerArchiveEntryDto()` instead of spreading the GM serializer result. Do not change the legacy route in HED-103. |
| Player metadata | `playerSafeMetadata()` in `entriesRepository.js` allowlists public metadata/frontmatter fields and public/revealed pins and map objects. | Target parsing uses the same top-level/frontmatter allowlist, rejects private nested records and credential keys at any depth, and the core sanitizer constructs a new object without unknown fields. Credential matching is case/separator-insensitive so variants such as `reset_token` and `invitation-token` fail closed without blocking public image fields such as `tokenImage`. | Compatible for serialized allowlisted values. Unknown, private, or credential-bearing nested fields fail closed or are removed by the policy mapper. | Characterize additional genuinely public metadata before expanding the allowlist. |
| Entry status | Current `publicEntry()` defaults missing status to `active`; player queries exclude `draft` and `archived`. | Contract accepts only `active`, `draft`, `archived`; player DTO accepts only `active`. | Compatible after current serialization. An unexpected stored status is rejected. | Keep status normalization in an adapter; do not broaden the target union silently. |

All fixtures under `tests/contracts/fixtures/` are synthetic and redacted. They contain no production campaign data.

## Approved visibility mapping

| Current entry visibility | Editorial state | Audience | Release state | Player read |
| --- | --- | --- | --- | --- |
| `public` | `active` | `party` | `public` | allowed for active entries |
| `revealed` | `active` | `party` | `revealed` | allowed for active entries |
| `gmOnly` | `active` | `gmOnly` | `hidden` | denied |
| `hidden` | `active` | `gmOnly` | `hidden` | denied |
| `needsReview` | `needsReview` | `gmOnly` | `hidden` | denied |

Any other value is invalid and denied. `partyVisible` and `specificPlayers` are current handout/note visibility values (`apps/server/src/repositories/worldSystemsRepository.js`, `apps/server/src/repositories/notesRepository.js`); they are not silently accepted as entry visibility. The vault compatibility value `gm` must be translated by a future vault adapter, not admitted into core.

## Identity contract gaps

The new `User`, `SessionPrincipal`, `Workspace`, `Campaign`, and `Membership` contracts are target boundaries rather than claims that every current payload already matches them.

- Current identity serializers and `/api/session` use compatibility aliases such as `membership`, `activeMembership`, `role`, `activeWorkspace`, and `activeCampaign` (`apps/server/src/app.js`, `apps/server/src/routes/auth.js`). The target `SessionPrincipalContract` intentionally contains no membership or campaign role. Its active workspace/campaign values are preferences only and are never authorization inputs.
- `resolveVerifiedCampaignContextContract()` derives role and membership only from an active membership whose user matches the session principal and whose campaign matches the exact branded campaign requested by the server adapter. The membership must come from the server-side source of truth; parsing a client-supplied role is not verification.
- Current records may omit target fields or use legacy names/defaults. The target validators reject extra fields and missing required values so drift is visible.
- Empty `worldId`, `createdBy`, and `updatedBy` remain accepted only in the GM entry compatibility DTO because current serialization deliberately emits empty strings. Other aggregate IDs are non-empty branded strings and cannot be mixed by TypeScript.

## Response-envelope gaps

Current Express routes return several unwrapped success shapes, for example `{ entries, campaignId, role }`, `{ entry }`, and `{ ok: true, ... }` (`apps/server/src/routes/entries.js`, `apps/server/src/routes/worldSystems.js`). Errors use `{ error, code?, requestId? }` (`apps/server/src/app.js`). The target envelope is `{ ok: true, data, meta? } | { ok: false, error }`.

`parseCompatibilityResponse()` distinguishes target envelopes by their complete discriminator shape. Legacy successes such as `{ ok: true, membership }`, `{ ok: true, indexes }`, and `{ ok: true }` reach the endpoint-specific legacy parser instead of being mistaken for target `{ ok: true, data }` envelopes. Known legacy codes (`EMAIL_UNVERIFIED`, `RATE_LIMITED`, `API_ROUTE_NOT_FOUND`, `ENTITLEMENT_LIMIT`, and the stable target codes) map deterministically; an unknown explicit legacy code maps to `INTERNAL_ERROR`.

Uncoded legacy errors require the adapter to pass the HTTP status in `CompatibilityResponseContext`. Stable status semantics map to application codes, including 401 `AUTH_REQUIRED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 429 `RATE_LIMITED`, and 503 `STORAGE_UNAVAILABLE`. Without a status, an uncoded legacy error remains `INTERNAL_ERROR`; the response body alone is insufficient to infer authorization or storage meaning.

## Dependency boundary

`packages/contracts` and `packages/core` may depend on TypeScript/JavaScript language features and on each other only in the `core -> contracts` direction. A recursive source scan fails if any top-level or nested module imports Express, Next.js, MongoDB, React, Foundry, Pathbuilder, or PF2e modules, or references browser globals. A nested fixture locks the recursive discovery behavior. This keeps campaign/archive policy reusable by the future web/API/worker adapters without starting the Next.js cutover.

## Validation record

GitHub Actions run `32028056913` on Node 24.19.0 and npm 11.17.0 passed `npm ci`, strict typecheck, all ten contract and recursive dependency-boundary tests, invitation/auth contracts, route/access contracts, server smoke tests, content/seed/character/select contracts, the production web build, and syntax checks. The ten contract tests include regressions for all six Codex review findings on commit `f381a7d15bad3ae1afc1b5d493bbb3f359f1f6e5`.

The unchanged `npm run audit:production` gate failed with six advisories: one low, two moderate, and three high. The high findings are in `js-yaml`, `nanoid`, and `postcss`; `body-parser` is also reported without a severity line in npm's output, and the moderate chain is `react-router`/`react-router-dom`. These exact dependency versions already exist in the approved HED-20 base commit `f5334cf0` and are not introduced by TypeScript or either new workspace package. HED-20 previously recorded a worse baseline of ten advisories (three low, three moderate, four high) in `CURRENT_STATE_AUDIT.md`.

HED-103 does not suppress the gate or apply a broad `npm audit fix`. Dependency remediation needs its own reviewed task because it changes the Express/Vite rollback implementation and can affect runtime behavior.
