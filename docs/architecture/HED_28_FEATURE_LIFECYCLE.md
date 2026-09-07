# HED-28 — Evidence Retrieval Feature Lifecycle

Status: implementation checklist for `agent/hed-28-evidence-retrieval`.

This document applies the mandatory PF2 feature-lifecycle standard to campaign evidence retrieval. A successful HTTP request alone is not considered feature completion.

## Purpose

Allow an authenticated campaign member to search campaign knowledge without bypassing campaign, membership, character, visibility, retention, revocation, or raw-evidence policy.

The capability serves three request modes:

- `sourceList` — inspect authorized supporting sources;
- `groundedAnswer` — request a model-safe grounded evidence bundle;
- `authoringEvidenceBundle` — prepare authorized context for GM authoring/review.

HED-28 retrieves evidence. It does not approve canon, mutate evidence, call a model provider, or publish player content.

## Actors

### Player

- must have a live active campaign membership;
- may optionally scope the request to one of the characters currently assigned to that membership;
- may retrieve approved canon only;
- may never retrieve raw Foundry, Discord, transcript, private/manual-review, GM-only, hidden, revoked, deleted, expired, or cross-campaign evidence.

### Owner / GM

- must have a live active campaign membership in the exact campaign;
- may retrieve approved canon and reviewable raw evidence allowed by the current campaign policy;
- raw manager-only evidence is allowed for source review but is blocked from model-context modes.

### Server

- resolves user, membership, role, campaign and current assigned-character grants from Mongo immediately before search;
- treats caller-supplied identity as a requested scope that must match server-resolved identity, never as authority;
- applies pre-query tenant/source filters and a second post-query policy gate.

## Entry points

Primary API entry point:

`POST /api/campaigns/:campaignId/evidence/search`

Required middleware:

- authenticated session via normal application auth;
- `requireCampaignMember`;
- server-side campaign identity resolution before retrieval.

The route is registered in the central backend route inventory and is covered by the route contract suite.

## Preconditions

The request must provide the exact `hed28-evidence-search-request-v1` schema including:

- workspace ID;
- campaign ID;
- membership ID;
- optional character ID;
- non-empty bounded natural-language query;
- request mode;
- explicit filters object;
- bounded result limit;
- bounded UTF-8 context budget;
- canonical UTC request timestamp.

Server-resolved membership must:

- exist for the current authenticated user;
- match exact workspace and campaign;
- have role `owner`, `gm`, or `player`;
- be active and not expired.

A player-supplied character ID must currently belong to that membership.

## Happy paths

### Player approved-canon search

1. Player sends a campaign-scoped request.
2. Server resolves current membership and character grants.
3. Requested identity must match server identity.
4. Search plan is reduced to approved canon.
5. Mongo query is campaign-scoped and player-safe before candidate loading.
6. Each candidate is policy-checked again after retrieval.
7. Result snippets exclude GM content and raw provider payloads.
8. Results are ranked deterministically and constrained by item/byte budgets.
9. Response reports `ok`, `ambiguous`, or `notFound` explicitly.
10. Safe audit metadata records the search outcome without recording query/evidence content.

### GM source review

1. GM sends a campaign-scoped request.
2. Server resolves current manager membership.
3. Approved canon, authorized raw provider evidence, transcripts, and GM-visible manual notes are searched according to requested source kinds.
4. Raw Mongo projections explicitly exclude original provider payload bytes/secrets.
5. Revoked, deleted and expired records are excluded before and after retrieval.
6. Source IDs, provider references, speakers/timestamps and approval state are preserved where available.
7. Response is budgeted, deterministic and audited with payload-free metadata.

## Alternative paths

- Empty source-kind filter selects all manager-authorized kinds for a GM and approved canon only for a player.
- Session, entity and time filters narrow retrieval before result construction.
- A query with no authorized matches returns `notFound`, not a fabricated answer.
- Two similarly ranked top matches for different entities in a non-source-list mode return `ambiguous` with `MULTIPLE_TOP_MATCHES`.
- Context-budget exhaustion returns the best-fitting subset with `budget.truncated=true`.
- Transcript documents are expanded into bounded timestamp/speaker-aware searchable segments.

## Failure paths and recovery

### Authentication / membership failures

- missing login → normal auth rejection;
- missing campaign membership → 403;
- removed/inactive membership → 403;
- expired membership → 403;
- wrong campaign/workspace/membership identity → 403.

Recovery: user must return to a campaign they currently belong to, re-authenticate if necessary, or obtain a new invitation/membership. The search endpoint never repairs authorization itself.

### Character-scope failure

A player requesting a character not currently assigned to their membership receives a controlled 403.

Recovery: select an assigned character or ask the GM to correct the character assignment through the identity/character lifecycle.

### Raw-evidence denial

A player explicitly requesting Foundry, Discord, transcript, or manual raw evidence receives a controlled 403 rather than silently receiving a partially privileged result.

Recovery: use approved-canon search. Raw review requires a current GM/owner membership.

### Invalid request

Unknown fields, malformed IDs, duplicate filters, unsupported source kinds/modes, invalid time ranges, excessive query size, or invalid context budgets fail closed with a controlled 400.

Recovery: client corrects the request and retries. No server state is changed.

### Storage unavailable

Mongo unavailable returns a controlled service-unavailable error. No file/browser fallback is permitted.

Recovery: retry after database service restoration.

## States and transitions

Search itself is read-only and has no persistent lifecycle state.

Source lifecycle state still changes retrieval eligibility:

- active/ended raw evidence may be reviewable;
- revoked raw evidence is not returned;
- deleted raw evidence is not returned;
- expired raw evidence is not returned even if asynchronous TTL cleanup has not physically deleted the document yet;
- approved canon remains durable independently of raw-evidence expiry.

The response state is one of:

- `ok`;
- `ambiguous`;
- `notFound`.

## Modification

N/A for HED-28. Search does not modify evidence, canon, memberships, characters, or campaign data.

Mutations belong to their owning feature lifecycles.

## Cancel / revoke / delete

Search requests are ordinary bounded synchronous requests and have no persisted cancel operation.

Revocation/deletion applies to source records:

- revoked/deleted evidence disappears from subsequent searches;
- physical TTL lag cannot make an expired record searchable;
- approved canon is not cascade-deleted when source evidence expires.

## Time behavior

- request timestamps and evaluation timestamps use canonical UTC instants;
- source time filters support current legacy ISO timestamps and target BSON `Date` storage;
- raw `purgeAt` is enforced during query selection and post-retrieval validation rather than relying only on Mongo TTL timing;
- requested time ranges must be ordered and bounded by the strict contract.

## Permissions

Authorization is server-side only.

Player:

- approved canon only;
- active, released, audience-authorized content only;
- exact assigned-character knowledge only.

GM/owner:

- manager-visible canon;
- raw review evidence only when current policy permits it;
- no cross-workspace or cross-campaign retrieval.

No caller field can elevate a role.

## Notifications

N/A. Search has no notification side effect.

## Status visibility

The response always exposes an explicit result state (`ok`, `ambiguous`, `notFound`) and explicit budget usage/truncation.

Authorization and validation failures use machine-readable error codes through the central Express error handler.

## Audit

Every successful HTTP search emits `evidence.search` audit metadata containing only safe operational facts:

- mode;
- result status;
- result count;
- used UTF-8 bytes;
- truncation flag;
- whether character scope was requested.

The natural-language query, snippets, raw evidence, credentials, provider payloads, emails and secrets are not copied into the audit event.

## Idempotency

Search is read-only. Repeating the same request against unchanged source/policy state produces a deterministic ordering and equivalent result set.

No idempotency receipt is required because the operation has no write side effect.

## Concurrency

Search does not acquire mutation locks.

Authorization and source validity are resolved from current Mongo state at request time. Pre-query filtering is followed by a post-query policy/source-state gate to narrow the race window around role/visibility/revocation changes.

A later policy/revocation change affects subsequent requests immediately; HED-28 does not persist a result cache.

## Security

Required controls:

- exact workspace + campaign + membership scope;
- no role authority from request body;
- no player access to raw evidence;
- no raw provider payload in Mongo projections;
- prompt-origin text returned as `dataOnlyUntrusted`;
- model-context mode applies a stricter second gate;
- safe internal deep links only;
- bounded query, filters, items, snippets and total context bytes;
- no cross-tenant results;
- no revoked/deleted/expired evidence;
- `Cache-Control: no-store` through the API boundary;
- audit events remain payload-free.

## UX / accessibility

HED-28 currently defines the backend capability consumed by Story Pulse, Ask Campaign and GM review UI.

The API is intentionally explicit about:

- not found;
- ambiguity;
- truncation;
- permission failure;
- invalid character scope;
- unavailable storage.

Frontend search presentation is owned by the consuming feature tasks and must preserve these states rather than replacing them with generic loading/error text.

## Success destination

N/A at the backend layer.

Consumers receive an `EvidenceBundle` and decide the user-visible destination:

- source review;
- grounded Ask Campaign answer;
- GM authoring/review workflow.

No automatic navigation or publication occurs in HED-28.

## Ownership

- contracts: `packages/contracts/src/evidenceSearch.ts`;
- policy boundary: `packages/core/src/evidenceRetrievalPolicy.ts`;
- runtime identity resolution: `apps/server/src/repositories/evidenceSearchIdentityRepository.js`;
- Mongo candidate selection: `apps/server/src/repositories/evidenceSearchRepository.js`;
- ranking/bundle construction: `apps/server/src/services/evidenceSearchService.js`;
- HTTP boundary/audit: `apps/server/src/routes/evidenceSearch.js`.

## Troubleshooting

When search returns no result:

1. confirm current campaign selection;
2. confirm membership is active;
3. if character-scoped, confirm character assignment;
4. confirm the source has not been revoked/deleted/expired;
5. confirm player-visible content is approved/released;
6. remove overly narrow session/entity/time/source filters;
7. inspect `budget.truncated` for context-limit behavior;
8. for GM raw review, use `sourceList` when manager-only raw evidence must remain outside model context.

## Explicit N/A decisions

- persistent search-job state — N/A, synchronous bounded read;
- search cancellation record — N/A, no durable job;
- notifications — N/A;
- mutation rollback — N/A, read-only;
- client-side authorization — prohibited, not applicable as an authority layer;
- model generation — owned by downstream Ask/Story Intelligence work;
- canon approval/publication — owned by HED-31 and related GM review lifecycle.

## Definition of Done

HED-28 is complete only when all of the following pass:

- strict request/bundle contract tests;
- player canon-only and character-scope policy tests;
- GM raw-review and model-context second-gate tests;
- prompt-injection/data-only boundary tests;
- context-budget and ambiguity/not-found tests;
- campaign-scoped HTTP route inventory/access contract;
- disposable-Mongo GM/player/cross-tenant/revoked fixtures;
- manual-note and transcript retrieval fixtures;
- no-cache response verification;
- full repository `verify` CI;
- disposable-Mongo characterization CI;
- PR description reflects the implemented lifecycle and remaining follow-up ownership.
