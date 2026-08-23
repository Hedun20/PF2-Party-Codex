# Repository characterization findings

- **Task:** HED-105
- **Date:** 2026-08-17
- **Stack base:** HED-104
- **Scope:** existing Express/Mongo campaign membership and one archive-entry read/write path

## Executable access matrix

`tests/integration/repository-characterization.test.mjs` runs the current HTTP and repository implementation against an isolated, uniquely named Mongo database. The harness refuses non-loopback Mongo hosts, credentials, and database names outside the `pf2_party_codex_test_*` namespace, and drops only that disposable database during setup and teardown.

The suite characterizes:

- owner, GM, player, non-member, removed-member, unauthenticated, and platform-admin-without-membership reads;
- owner/GM writes and player/non-member/removed-member/platform-admin denials;
- player allowlisting of entry JSON, including nested metadata pins and complete source removal;
- exclusion of hidden, needs-review, draft, archived, and other-campaign entries;
- route campaign identity when a legacy `X-Campaign-Id` header disagrees.

## Compatibility finding: route/header disagreement

The current archive route treats `/api/campaigns/:campaignId` as authoritative and ignores a conflicting `X-Campaign-Id` value. This is tenant-safe in the characterized cases: membership is revalidated for the route campaign, a member of only the header campaign receives `403`, and a valid route-campaign member receives only the route campaign.

It does not satisfy the target HED-20 session contract, which requires explicit rejection when route and compatibility header disagree. HED-105 records and tests the current behavior without changing the rollback runtime. HED-23 must define the error contract, and the later session compatibility adapter must reject disagreement before any Next.js cutover.

The executable assertion covers both the serialized campaign metadata and the archive query results: the player response contains only campaign A entry identifiers and never the uniquely seeded campaign B entry. At the HED-105 baseline, the campaign A archive result included three compact entries because of the separate archived-entry inconsistency below.

## Player-safety finding: archive summary includes archived metadata

The player-safe entry list and entry-by-id repository paths exclude `status: archived`, but the HED-105 baseline archive summary exposed an archived entry's compact metadata and included it in `counts.entries`. Its player query excluded only `draft` status. HED-105 asserted and documented that result without normalizing it.

HED-107 resolves the inconsistency by excluding both `draft` and `archived` statuses from the shared player archive query used by counts and recent data. Owner and GM queries remain unchanged and retain their full archive view. The real-Mongo assertion now requires exactly the published/revealed campaign entries and rejects archived and cross-campaign markers from the complete response JSON.

## Storage finding: repeated native creates collide

The real-Mongo run also exposed a separate current storage defect. The first native entry create in a campaign succeeds, but a second native create fails with MongoDB error `11000` because the unique sparse compound index on `(campaignId, source.originalPath)` indexes the missing `source.originalPath` as `null`. Native Party Codex entries set `source.kind` without an `originalPath`, so repeated creates in the same campaign collide.

HED-106 tracks the index/data-contract correction. HED-105 does not change the runtime index: its access matrix isolates authorization by exercising an owner update of an existing entry and a GM create, then proving that player, non-member, removed-member, and platform-admin-without-membership creates are rejected before storage. The defect must be fixed with its own disposable-Mongo regression coverage before migration work relies on native entry creation.

HED-106 keeps the legacy unique sparse index intact so ordinary startup performs no destructive schema change and the rollback runtime can still start. New native entries receive bounded, structurally separated source keys: `partyCodex:live:<sha256-normalized-path>`, while archived native records move to `partyCodex:archived:<entry-id>`. Imported entries retain their vault-relative source paths. The `partyCodex:` prefix is reserved: dry-run reports every colliding vault path as a fatal validation error, commit validates one stable page snapshot before it creates an import job or writes an entry, and the repository rejects the prefix again before any individual import lookup/write. Live-path input cannot reproduce an archived key because raw paths are never concatenated into either source-key namespace. The existing per-campaign unique index can therefore distinguish multiple native entries without colliding with archive or import paths. Import updates exclude immutable `_id` and preserve the original `createdAt` instead of mixing `$set` and `$setOnInsert` for the same path. The disposable-Mongo suite starts from the legacy index plus one existing native entry, runs index ensure twice, creates multiple native entries, proves archive-and-recreate behavior and disjoint live/archive namespaces, proves pre-commit reserved-path rejection, proves same-campaign import upsert/uniqueness, and proves that the same imported source path is independent across campaigns.

This follows MongoDB's documented [sparse compound index behavior](https://www.mongodb.com/docs/manual/core/index-sparse/#sparse-compound-indexes) while avoiding an automatic index drop or data rewrite.

## Non-decisions

- These tests do not select a cookie/session library.
- They do not normalize visibility values or change serializers.
- They do not migrate Mongo data or exercise a production/shared database.
- HED-105 itself did not repair the repeated native-create index collision; HED-106 applies the rollback-compatible source-key correction described above.
- HED-105 itself did not repair the archived-entry archive-summary leak; HED-107 applies the isolated correction described above.
- They do not claim that the current dual archive read model is canonical.
