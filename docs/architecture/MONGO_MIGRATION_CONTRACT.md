# Mongo migration, evidence/canon, compatibility, and rollback contract

- **Task:** HED-19
- **Status:** target contract only; no database migration or production/shared database access
- **Stack:** HED-21 exact campaign policy on the HED-24/HED-106 safety baseline
- **Command contract:** `packages/contracts/src/migration.ts`
- **Mongo source of truth:** preserved

## Frozen decisions

1. MongoDB remains the only live domain source of truth. Markdown, Foundry payloads, Discord messages and generated packages are import/export/evidence artifacts.
2. Raw provider evidence and approved canon are different records with different retention, visibility and mutation rules. Approval never turns the raw record itself into a player-facing document.
3. Narrative `entries` remain the canonical current heads. Every approved change also creates an immutable `entryRevisions` record. Dedicated maps, map objects, timeline events, sessions, handouts, notes and characters remain dedicated aggregates.
4. The migration is additive. It preserves existing `_id` values where the target collection is the same and uses explicit legacy-to-target references when a new collection is introduced.
5. A dry-run writes neither the source nor target database. It emits a redacted manifest/report artifact whose stable plan section is SHA-256 hashed.
6. Commit is impossible without the exact approved manifest hash and a verified backup restore reference. Batches are resumable and idempotent.
7. There is one active application writer per aggregate. “Dual write” means one command atomically maintains the canonical record and its compatibility projection/outbox; it never means two independent applications racing to own the same record.
8. Normal rollback switches routing and writer ownership back to the legacy profile and preserves migrated/new data. Destructive down-migration is not the rollback mechanism.
9. Player/GM policy reconciliation is an exit gate, not a sampling nicety. Cross-campaign, removed-member, raw evidence, secret check, character knowledge and hidden-achievement cases must all agree before cutover.
10. Production MongoDB is never the first place a migration version runs.

## Repository evidence

| Current behavior | Evidence | Migration consequence |
|---|---|---|
| Mongo is required for campaign APIs; Markdown is compatibility/diagnostic only | `apps/server/src/db/mongo.js` | No file-system authority fallback is permitted during cutover or rollback. |
| Startup index setup currently calls a domain backfill | `apps/server/src/repositories/identityRepository.js` (`ensureIdentityIndexes`, `backfillWorkspaceIds`) | Move every data rewrite behind the explicit migration command. Web startup may verify/create approved indexes but may not rewrite domain documents. |
| Current archive summary prefers entry-backed data and otherwise falls back to dedicated collections | `apps/server/src/routes/archive.js`, `docs/architecture/CURRENT_STATE_AUDIT.md` | Characterize both representations, classify duplicates and choose one owner before any writer changes. No permanent “whichever has data” read. |
| Native/import source keys share a rollback-sensitive unique index | `apps/server/src/repositories/entriesRepository.js`, `docs/architecture/REPOSITORY_CHARACTERIZATION_FINDINGS.md` | Preserve the HED-106 `partyCodex:live:` / `partyCodex:archived:` boundary and imported-path reservation throughout migration. |
| Current import rollback deletes all records carrying an import job ID | `apps/server/src/repositories/entriesRepository.js` (`rollbackImportJob`) | That behavior remains legacy import rollback only. It must not be reused to roll back approved canon or records edited after import. |
| Entry, map, timeline, session and handout serializers contain different legacy visibility values | `apps/server/src/repositories/entriesRepository.js`, `apps/server/src/repositories/worldSystemsRepository.js` | Normalize into editorial/audience/release/content-class policy dimensions and reconcile both query and serializer output. |
| No event evidence ledger, connection cursor or replay ledger exists | `docs/architecture/CURRENT_STATE_AUDIT.md` | Add separate evidence, connection, cursor and receipt collections before live connector ingestion. |
| Existing planned indexes omit the target evidence/canon/migration collections | `apps/server/src/db/indexes.js` | Introduce versioned index manifests and verify them in disposable Mongo before commit. |

## Collection ownership and mapping

| Legacy/current collection | Target authority | Migration rule |
|---|---|---|
| `users`, `profiles` | Same collections | Keep `_id`; add only versioned fields. Auth/session secrets stay outside migration reports. Invalid duplicate normalized emails are fatal quarantine items, never auto-merged. |
| `workspaces`, `campaigns`, `memberships` | Same collections | Explicitly backfill exact workspace/campaign links. An orphan or ambiguous membership is quarantined; it is never attached to a convenient default campaign in a production migration. |
| `entries` | `entries` current head + `entryRevisions` durable history | Preserve entry `_id`. Normalize policy dimensions additively. Create revision 1 from the verified legacy head, then advance through optimistic versioned writes. |
| Imported `entries.source`, future Foundry/Discord/AI payloads | `evidenceRecords` | Copy raw/restricted provider evidence into immutable records with content hash, visibility, retention class and `purgeAt`. Canon stores evidence references/digests, not raw payload bytes. |
| `entryRelations` | Same collection as persisted projection | Rebuild from the approved relation derivation version; store derivation/version/source references. Reads do not invent an alternative authority. |
| Map/session/timeline-shaped entries plus `maps`, `mapObjects`, `timelineEvents`, `sessions`, `handouts` | Dedicated collections remain canonical; entries may be narrative projections | Inventory classifies `duplicate`, `narrativeProjection`, `dedicatedOnly` or `ambiguous`. Ambiguous pairs block commit. No automatic destructive fold into `entries`. |
| `notes`, `characters` | Same dedicated collections | Preserve ownership. Move player/user/character knowledge to explicit grants; do not infer access from presentation fields alone. |
| Implicit character knowledge | `characterKnowledgeGrants` | One exact campaign + resource + user/character grant with source policy version, status and update version. |
| Future achievement definitions/progress embedded in content | `achievementDefinitions`, `achievementAwards` | Definitions and hidden criteria are manager-only; awards/progress carry exact subject visibility and source event IDs. |
| Current batch imports and future connectors | `integrationConnections`, `ingestionCursors`, `ingestionReceipts` | Connections own exact campaign/provider/instance scope. Cursors are per stream. Receipts own idempotency and replay evidence independently of raw payload retention. |
| `importJobs` | Keep for legacy import compatibility; new jobs also use migration/ingestion contracts | Do not rewrite completed/rolled-back history. New ingestion jobs reference connection, cursor, receipt and evidence IDs. |
| Migration execution state | `migrationRuns`, `migrationItems`, `migrationReports` | Only commit and later phases write control state. Inventory/dry-run reports are external immutable artifacts. |

## Raw evidence and approved canon

### `evidenceRecords`

An evidence record is immutable after ingestion except for retention/legal-hold metadata maintained by a separately authorized retention command.

Required fields:

- `_id`, `schemaVersion`, exact `workspaceId` and `campaignId`;
- `provider` (`legacyVault`, `foundry`, `discord`, `manualImport`, `aiProposal`), `connectionId`, stream, stable provider object ID and unique provider event/version ID;
- `sessionId` when applicable, provider occurrence timestamp, ingestion timestamp and adapter version;
- normalized visibility/audience and content class; blind/whisper/GM material defaults to restricted evidence;
- encrypted/restricted raw payload or object-store reference, byte length, media type and SHA-256 content hash;
- normalized non-authoritative projection used for review;
- `retentionClass`, `purgeAt` and hold metadata when approved;
- idempotency receipt ID, correlation ID and safe audit actor.

Rules:

- Evidence is never returned by player archive serializers and never selected by player predicates.
- Evidence cannot mutate canon directly. It may create a proposal. An owner/GM policy decision approves a separately validated canon revision.
- The TTL index is `{ purgeAt: 1 }` with `expireAfterSeconds: 0`. It is a single-field cleanup index; expiration is asynchronous, so every read also checks `purgeAt` and deletion state.
- Alpha default retention is 30 days. Allowed policy classes are 7, 30 and 90 days. Longer/indefinite retention requires a separately approved hold with `purgeAt` omitted, not set to an invalid/non-date value.
- Evidence deletion never cascade-deletes approved canon. The durable revision keeps provider/source IDs, content hash, approval fact and a redacted provenance summary sufficient to explain origin after raw bytes expire.
- A retention audit/deletion receipt lives outside the expiring evidence document in the safe audit/receipt ledger and contains only its ID, content digest, policy/hold decision, deletion time and safe actor. It never copies the deleted payload.

### `entryRevisions`

An approved canon revision is append-only and has no TTL:

- exact `workspaceId`, `campaignId`, `entryId`, monotonically increasing `revision` and unique revision ID;
- complete approved public/GM content snapshot and normalized editorial/audience/release/content-class policy;
- explicit user/character grants or grant-version reference;
- evidence IDs plus durable evidence digests/provenance summaries;
- approval actor, approval policy version, created timestamp, prior revision ID and content hash;
- optional correction/revocation reference; never an in-place rewrite of history.

The `entries` head stores `currentRevisionId`, `currentRevision`, `version`, current policy/query fields and compatibility fields required by Express. Advancing the head and inserting the revision occur in one transaction when the deployment supports transactions; otherwise the application uses an idempotent saga whose incomplete state is unreadable and repairable. A raw evidence TTL deletion is never part of this transaction.

## Integration, cursor and idempotency boundary

| Collection | Identity | Required behavior |
|---|---|---|
| `integrationConnections` | `connectionId`; exact campaign/provider/external instance | Status, scopes, separate credential-record/version reference, retention policy, last-seen and revoke metadata. No plaintext provider credential or credential payload is embedded in the connection document. |
| `ingestionCursors` | exact `{ connectionId, stream }` | Monotonic adapter-defined cursor plus version and compare-and-swap update. Cursor advancement occurs only after durable receipt/evidence acceptance. |
| `ingestionReceipts` | exact `{ connectionId, idempotencyKey }` | Request hash, result IDs, status and replay count. Same key + different request hash is a conflict; same key + same hash returns the prior result. Compact receipts outlive raw evidence long enough to prevent re-ingestion. |

Provider object IDs, provider event/version IDs and idempotency keys are separate. An edit/delete keeps the stable object ID but appends a new immutable evidence occurrence with a unique event/version ID and a supersedes reference; transport/job retries use the idempotency key. Neither identity is allowed to cross a connection or campaign.

## Command and report contract

`parseMigrationCommandRequest`, `parseVerifiedMigrationCommandRequest`, `parseMigrationManifest`, `parseMigrationRestoreDrill` and `parseMigrationReport` make the operational boundary executable. The ordinary request parser accepts only `inventory`/`dryRun`; commit, verify and rollback must use the verified parser with the actual manifest, restore-drill record, trusted evaluation time and a server-supplied SHA-256 implementation.

Commands:

| Command | Database writes | Gate |
|---|---|---|
| `inventory` | None | Explicit workspace/campaign/collection scope and source snapshot ID. |
| `dryRun` | None | Runs normalization/classification against the snapshot and emits a deterministic plan/report. It cannot accept a manifest hash, restore reference or write confirmation. |
| `commit` | Target domain and migration-control collections only | Exact approved manifest hash, verified restore reference and `COMMIT:<migrationId>:<manifestHash>`. |
| `verify` | Domain data read-only; a bounded control/report status update is allowed | Same manifest and restore reference; no write confirmation. |
| `rollback` | Routing/writer control and audit only | `ROLLBACK_ROUTING:<migrationId>:<manifestHash>`; the report must prove `dataDeleted=false`. |

The verified parser recomputes the canonical manifest hash and binds it to the exact migration/version, source snapshot, source/target fingerprints and normalized scope. It then loads the referenced restore record and requires the same migration/snapshot/source fingerprint/manifest, successful non-fatal invariants, completion before the trusted evaluation instant and an unexpired `validUntil`. A nonempty caller string is not restore evidence.

The request contains only non-secret database fingerprints. It rejects Mongo URIs, credentials and extra fields. The user-visible report contains collection counts, bounded invariant results and aggregate checkpoint progress only. Inventory/dry-run reports reject every nonzero write count. A successful/rolled-back terminal report rejects fatal issues, failed invariants/items and incomplete checkpoints; a successful commit must account for every planned item. Raw records, titles, emails, provider payloads, tokens and per-item error evidence stay out of the report and logs.

## Inventory and deterministic manifest

Inventory runs on a point-in-time snapshot or isolated restored database and records:

- count per collection and exact workspace/campaign distribution;
- distinct status/role/visibility/source/provider values;
- missing/null/wrong-type fields and non-canonical timestamps;
- orphan/ambiguous workspace, campaign, user, entry, world, session and relation references;
- duplicate normalized emails, memberships, source paths, slugs and semantic archive records;
- entry/dedicated-aggregate overlap classification;
- raw payload byte distribution and proposed retention class;
- import job state, source namespace, relation/map side effects and post-import edits;
- indexes, validators, server feature compatibility and database-tool versions;
- redacted representative fixtures identified only by synthetic fixture ID/content hash.

The `hed19-manifest-v1` stable plan includes migration ID/version, full code commit, source snapshot ID, database fingerprints, explicit scope, collection mapping version, normalization/policy versions, zero-based batch sequence/IDs/boundaries, expected counts, source-range hashes, fatal/warning issue codes and required indexes. `generatedAt`, run ID, operator and output path are rejected from this schema and remain outside the hash.

`canonicalizeMigrationManifest` runtime-parses first, sorts set-like scope/index/issue-code fields, orders batches by their explicit contiguous sequence, recursively sorts object keys and emits whitespace-free canonical JSON with safe integers only. `computeMigrationManifestHash` hashes those exact UTF-8 bytes through a trusted injected SHA-256 port and validates the returned lowercase digest. Input array/object ordering therefore cannot change the digest where order is not semantic, while any policy/count/range/snapshot change does. The commit confirmation is derived only after this recomputation. Same code + snapshot + scope + policy must produce the same manifest hash.

Fatal issues include tenant ambiguity, duplicate identity, unclassifiable canonical owner, invalid/secret-leaking visibility, source-key collision, unsupported BSON/JSON needed for canon, missing backup gate, and any count/hash nondeterminism. Warnings may be explicitly dispositioned into a new signed/hashed manifest; a commit never overrides the old manifest in place.

## Batch/checkpoint semantics

Each `migrationItems` checkpoint uses:

- `runId`, stable `batchId`, source collection and source ID;
- exact target collection/ID, source and target content hashes;
- `planned`, `written`, `verified`, `skipped`, `quarantined` or `failed` status;
- attempt count, versioned error code and redacted evidence reference;
- `startedAt`, `updatedAt` and completion timestamp.

Unique `{ runId, sourceCollection, sourceId }` prevents duplicate work inside a run. Target writes use a stable migration source key/version so a new run of the same manifest finds and verifies the prior target instead of inserting a duplicate. A crashed batch resumes after the last durable item; it does not trust only an in-memory count.

## Legacy dates, JSON and BSON

- Canonical timestamps are strict UTC `YYYY-MM-DDTHH:mm:ss.sssZ`.
- Valid BSON `Date` values convert to canonical UTC. Canonical strings round-trip exactly.
- Missing dates remain `null` with an anomaly code when the target field is optional. A required unknown date quarantines the item.
- Locale/ambiguous strings, numeric strings such as `"0"`, impossible dates and out-of-range values are never guessed. The restricted evidence/anomaly record may preserve the original representation and hash; public/canon fields receive no fabricated time.
- JSON must be finite JSON data. BSON types use an explicit versioned Extended JSON mapping where approved. `undefined`, functions, symbols, non-finite numbers, cyclic structures and unsupported binary/custom objects quarantine the item rather than being silently stringified or dropped.
- Unknown object keys remain only in a restricted versioned `legacyUnknown` evidence object after forbidden-key scanning. They never enter player DTOs or analytics/log reports.
- ObjectId/string IDs are normalized through per-collection adapters. Existing target `_id` values are preserved; cross-type equality is explicit and never inferred by loose string coercion during tenant checks.

## Index manifest

Indexes are created/verified before related writes and are versioned separately from web startup.

| Collection | Index | Purpose |
|---|---|---|
| `migrationRuns` | unique `{ runId: 1 }`; lookup `{ migrationId: 1, migrationVersion: 1, sourceSnapshotId: 1, status: 1 }` | Run identity and operations lookup. |
| `migrationItems` | unique `{ runId: 1, sourceCollection: 1, sourceId: 1 }`; `{ runId: 1, status: 1, batchId: 1 }` | Idempotent resume and failure scan. |
| `evidenceRecords` | unique `{ connectionId: 1, stream: 1, providerEventId: 1 }`; `{ campaignId: 1, providerObjectId: 1, occurredAt: 1 }`; `{ campaignId: 1, sessionId: 1, occurredAt: 1, visibility: 1 }`; TTL `{ purgeAt: 1 }` | Event dedupe, immutable edit/delete lineage, exact-campaign review and retention cleanup. |
| `entryRevisions` | unique `{ campaignId: 1, entryId: 1, revision: 1 }`; `{ campaignId: 1, evidenceIds: 1 }` | Durable ordered canon and provenance lookup. |
| `integrationConnections` | unique `{ connectionId: 1 }`; unique `{ campaignId: 1, provider: 1, externalInstanceId: 1 }` | Exact installation binding. |
| `ingestionCursors` | unique `{ connectionId: 1, stream: 1 }` | One monotonic cursor per stream. |
| `ingestionReceipts` | unique `{ connectionId: 1, idempotencyKey: 1 }`; TTL `{ purgeAt: 1 }` when a bounded compact-receipt policy is approved | Retry identity and bounded cleanup. |
| `characterKnowledgeGrants` | unique `{ campaignId: 1, resourceId: 1, userId: 1, characterId: 1 }`; `{ campaignId: 1, userId: 1, status: 1 }` | Exact player/character knowledge. |
| `achievementDefinitions` | unique `{ campaignId: 1, definitionId: 1, version: 1 }`; `{ campaignId: 1, visibility: 1, status: 1 }` | Versioned hidden/public definitions. |
| `achievementAwards` | unique `{ campaignId: 1, definitionId: 1, subjectKind: 1, subjectId: 1, sourceEventId: 1 }`; `{ campaignId: 1, subjectId: 1, visibility: 1 }` | Idempotent award/progress evidence and subject reads. |

TTL indexes are always single-field. Compound query/dedupe indexes are separate. If a future deployment shards these collections, the index/shard-key design is re-reviewed before creation because unique-index enforcement has shard-key constraints.

## Backup and restore gate

Commit requires a non-secret `backupRestoreRef` that points to a completed drill record containing:

- source cluster/database fingerprint, Mongo server and database-tool versions;
- backup/snapshot ID, start/end time, encryption/key version and artifact checksum where applicable;
- consistent point-in-time/oplog boundary;
- isolated restore target fingerprint and restoration duration;
- restored collection/index counts and the same HED-19 invariants;
- operator/automation identity and expiration of the temporary restore;
- confirmation that no application or connector can route production traffic to the restore.

The executable `hed19-restore-drill-v1` record binds `restoreRef`, migration/version, source snapshot/fingerprint and canonical manifest hash; includes the backup artifact and isolated restored-database fingerprints, nonzero collection/index counts, at least one pass/warning invariant, start/completion and `validUntil`; and permits only `status=succeeded` with `fatalIssueCount=0`. `parseVerifiedMigrationCommandRequest` compares every binding and rejects future-completed or expired drills at the trusted server evaluation instant.

For a supported self-managed replica set, a `mongodump --oplog` / `mongorestore --oplogReplay` drill can establish a consistent dump boundary. Sharded or managed deployments use the provider's coordinated snapshot/point-in-time mechanism. `mongoexport` JSON/CSV is not a backup gate.

Restoring the backup over production is an incident-recovery action requiring separate approval. It is not the routine feature rollback.

## Dual-read and writer cutline

| Stage | Reader | Writer | Required evidence |
|---|---|---|---|
| 0. Legacy | Express legacy only | Legacy only | Current characterization green. |
| 1. Snapshot/backfill | Legacy response | Legacy only; migration replays snapshot/delta idempotently | Deterministic dry-run, backup restore and repeatable batch hashes. |
| 2. Shadow read | Legacy response; target read runs out-of-band | Legacy only | Exact count, normalized DTO hash and policy-decision comparisons; mismatch never silently changes the user response. |
| 3. Compatibility writer rehearsal | Legacy response plus target shadow | One new command writer maintaining target head/revision and old-readable compatibility fields/projection | Disposable/rehearsal database proves legacy Express reads every new record and retry produces one result. |
| 4. Final delta/fence | Legacy response | Writer fence pauses aggregate mutations, captures final watermark, drains delta and verifies | Zero unresolved fatal mismatch and no in-flight old writer. |
| 5. Target cutover | Target route by slice; legacy remains available | New writer only | Metrics, policy matrix, rollback browser/API path and old-readable writes pass. |
| 6. Rollback window | Per-slice flag may route to legacy | Atomic writer profile selects legacy or target, never both | New writes remain legacy-readable; rollback drill preserves target data. |
| 7. Retirement | Target | Target | Window elapsed, second backup, zero required legacy callers and approved deletion task. |

Watermarks use the source adapter's stable ordering (`updatedAt` plus `_id` only where timestamp quality is verified). If the deployment supports a change stream and its resume-token retention is sufficient, the adapter may use it for delta capture, but the committed manifest still records the start token/watermark and verifies the drained range. A short explicit writer fence is required when no lossless delta mechanism is proven.

## Rollback and forward repair

The `rollback` command performs these steps in order:

1. stop new target traffic for the affected slice;
2. stop/drain the target writer and acquire the writer-profile fence;
3. verify that every post-cutover write has a legacy-readable compatibility shape;
4. atomically select `routingProfile=legacy` and `writerProfile=legacy`;
5. run legacy read/write smoke tests and the exact campaign/player-safety matrix;
6. record a rollback report with `dataDeleted=false`;
7. preserve target revisions/evidence/checkpoints for diagnosis and forward repair.

Rollback is blocked and escalated if the compatibility verification fails. It does not delete `entryRevisions`, raw evidence, new canon heads or migration checkpoints. A corrective migration produces a new version/manifest. Compatibility reads/fields are removed only by a later approved retirement task after the rollback window and second verified backup.

## Production-shaped rehearsal dataset

The committed rehearsal fixture is synthetic/redacted and runs only in a disposable database named with the existing `pf2_party_codex_test_*` safety prefix. It includes at minimum:

- two workspaces, three campaigns, owner/GM/player/removed memberships and one legacy missing-workspace case;
- duplicate normalized email and orphan/ambiguous membership quarantine cases;
- every legacy visibility/status value plus nested GM/source/auth keys;
- public/revealed/GM-only/raw/secret/hidden-achievement and player-A/player-B knowledge cases;
- native/import source keys, a reserved-path collision, partial/rolled-back import jobs and an import edited after commit;
- entries plus duplicate, narrative and ambiguous map/timeline/session representations;
- valid, missing and malformed dates; Extended JSON plus unsupported/non-finite/cyclic JSON fixtures;
- Foundry/Discord connection, cursor, retry, immutable edit/delete lineage and cross-campaign replay fixtures;
- raw evidence at each retention class and an approved canon revision whose evidence later expires;
- resumable multi-batch commit, forced crash, retry and route/writer rollback.

A production rehearsal uses an approved isolated restored copy or a formally sanitized equivalent. It emits only aggregate/redacted reports. No real campaign payload is committed to the repository or copied into CI fixtures.

## Verification matrix

Commit cannot advance to shadow read while any required invariant fails:

- exact source/target counts per scoped collection and quarantine disposition;
- no target record crosses workspace/campaign scope;
- current owner/GM/player/non-member/removed-member decisions match HED-21 policy;
- player queries and serializers contain no GM, raw evidence, secret check, hidden-achievement or other-player knowledge fields;
- every current entry head has exactly one current durable revision and matching content/policy hash;
- evidence/canon references are exact-campaign and evidence expiry leaves canon readable/explainable;
- dedicated aggregate ownership classification has no ambiguous item;
- connection/cursor/receipt keys reject cross-campaign replay and idempotency hash conflict;
- character and achievement grants are exact subject and hidden titles never leak;
- commit rerun makes zero duplicate domain effects; forced crash resumes at item checkpoint;
- the legacy API reads records written by the target compatibility writer;
- routing/writer rollback passes with `dataDeleted=false`;
- backup restore and rehearsal reports reference the exact code/manifest/snapshot under test.

## Deferred implementation

This contract does not create the target collections, change startup indexes, run a migration, enable a connector, add an AI pipeline, alter retention on current production data, cut an application writer or delete legacy fields. Those are separately reviewed implementation tasks. HED-18 still owns the broader module/worker deployment map; an implementation may not invent a conflicting dependency direction.

## References

- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/)
- [MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/)
- [MongoDB change streams](https://www.mongodb.com/docs/manual/changeStreams/)
- [MongoDB backup and restore tools](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/)
- [`mongorestore`](https://www.mongodb.com/docs/database-tools/mongorestore/)
