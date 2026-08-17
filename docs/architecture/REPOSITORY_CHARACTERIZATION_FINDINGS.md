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

## Non-decisions

- These tests do not select a cookie/session library.
- They do not normalize visibility values or change serializers.
- They do not migrate Mongo data or exercise a production/shared database.
- They do not claim that the current dual archive read model is canonical.
