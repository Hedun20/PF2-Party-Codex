# Stages 11–12 — Campaign Context and Tenant Isolation

Status: implemented on `codex/stage11-15-integration`.

## Stage 11 — explicit campaign context

- One account can belong to multiple campaigns.
- The selected campaign is persisted on the user and sent as `X-Campaign-Id` by the web client.
- Every protected request resolves permissions from the membership for that exact campaign.
- The top bar, sidebar, onboarding, and profile expose the active campaign and campaign manager.
- Creating another campaign no longer conflicts with an existing membership.
- Accepting an invitation activates the invited campaign.

## Stage 12 — Mongo-only live campaign data

- MongoDB is the only live application store for campaign content.
- Markdown is restricted to explicit import/export and compatibility diagnostics.
- Articles, search, categories, metadata, safety review, assets, audit logs, Foundry exchange, notes, characters, maps, timeline, sessions, handouts, and reveal state are campaign-scoped.
- Asset files are stored below a campaign-specific directory and player downloads are limited to assets referenced by player-visible entries.
- Reveal state is persisted as campaign handouts instead of process memory.
- Session Desk drafts are persisted as GM-only campaign sessions instead of browser `localStorage`.
- Note and character CRUD operations include `campaignId` in database filters.
- Player entry serialization uses an allowlist and removes GM content, source metadata, actor IDs, hidden pins, and hidden map objects.
- Audit-log reads filter by campaign.

## Enforced invariants

1. A campaign content request without an active membership returns `401` or `403`.
2. A membership in campaign A cannot authorize a read or mutation in campaign B.
3. Owner/GM capability is membership-scoped, not a global user role.
4. Player responses never contain `gmContent`, GM frontmatter, hidden pins, or hidden map objects.
5. A missing Mongo connection does not silently switch the application to a second writable store.

## Automated evidence

The root test suite verifies route inventory, literal frontend transitions, campaign header propagation, guest access boundaries, player-safe entry serialization, Mongo-only live stores, startup safety, and centralized async error handling.

Manual owner/GM/player browser QA against a real Mongo test database remains a final release gate and is intentionally deferred until Stage 15 is complete.
