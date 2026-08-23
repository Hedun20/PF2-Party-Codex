# Exact campaign policy port

- **Task:** HED-21
- **Status:** framework-neutral policy contract; runtime adapters cut over in separately reviewed changes
- **Package:** `@pf2-party-codex/core`
- **Contracts:** `@pf2-party-codex/contracts`
- **Policy version:** `campaign-policy-v1`

## Boundary

The policy port is the single authorization vocabulary for web requests, jobs, Discord commands, Foundry ingestion, AI retrieval, notifications and exports. It is deliberately independent of Express, Next.js, MongoDB, Discord, Foundry, queues and PF2 rules.

Adapters authenticate a principal and load source-of-truth state. The policy decides whether that exact subject may perform an action or receive a resource. Repositories translate the returned read scope into storage predicates, and serializers still emit an allowlisted DTO. A policy allow never authorizes sending the original Mongo document.

UI visibility is not an authorization input and never satisfies this boundary.

## Exact human subject

`HumanCampaignPolicySubject` contains one user, workspace, campaign and membership plus current character grants. It is reconstructed from current storage before a protected operation.

- `owner` and `gm` are manager roles. Product copy may call another `gm` membership a co-GM; `coGm` is not a fourth stored role.
- `player` receives only player-safe decisions.
- `invited`, `removed` and `expired` states fail before role checks.
- An active membership with `membershipExpiresAt <= evaluatedAt` also fails as expired.
- Membership timestamps and `evaluatedAt` use canonical UTC instants (`YYYY-MM-DDTHH:mm:ss.sssZ`). Implementation-dependent `Date.parse` inputs such as `"0"` are invalid; adapters supply a fresh trusted server instant rather than request data.
- Workspace and campaign IDs must match both subject and request. A role from another campaign is irrelevant.
- Platform administration is not part of this subject and cannot imply campaign membership.

`membershipUpdatedAt`, `membershipState`, role, membership ID, assigned character IDs and `characterGrantVersion` participate in the policy cache key. Character and capability arrays use an unambiguous encoded array segment rather than delimiter-joining. For an expiring membership, the key also contains a current/expired discriminator derived from the fresh canonical evaluation instant, so the pre-expiry allow key cannot be read at or after the deadline. Removal, expiry, role change or character reassignment therefore produces a different discriminator immediately.

Every cache key also requires one exact typed operation discriminator. Human actions include channel, action and explicit nullable owner/character target. Machine checks include channel and capability. Resource decisions include server-derived resource ID plus a revision/policy version that changes with visibility or grants. Read-scope keys use their own kind. Unknown fields and subject/operation-kind disagreement are invalid; an adapter cannot reuse a subject-only prefix as a complete decision or response key.

This key caches only the matching authorization decision or derived policy scope. It is never sufficient for an archive/list/document payload cache. A data-response cache separately includes the exact resource or normalized query, data revision and audience serializer version, and may reuse a policy result only when its full typed discriminator matches.

## Human action matrix

| Channel | Allowed action family | Player restriction |
|---|---|---|
| `web` | campaign/resource/character management and reads | stored self-authorship and assigned-character operations only |
| `discord` | player/GM commands plus bounded resource/character reads | player command only; current exact membership still required |
| `ai` | resource retrieval and `character.ask` | Ask is bound to an assigned character |
| `export` | party or GM export request | players can request only party-safe export |

Owner alone may delete a campaign. Owner/GM may approve canon, read raw evidence, read secret checks and hidden achievement definitions, use GM Discord commands and request a GM export. Channel/action disagreement fails even when the role would otherwise be sufficient.

## Resource visibility

`CampaignResourcePolicy` keeps four independent dimensions:

| Dimension | Values | Player rule |
|---|---|---|
| Editorial | `draft`, `needsReview`, `active`, `archived` | only `active` |
| Audience | `gmOnly`, `party`, `specificPlayers` | party, or exact user/assigned-character grant |
| Release | `hidden`, `public`, `revealed` | only `public`/`revealed` |
| Content class | `approvedCanon`, `rawEvidence`, `secretCheck`, `hiddenAchievement` | only `approvedCanon` |

Managers may receive every valid combination inside their exact campaign. Players must pass every player column simultaneously.

Adapters normalize data before evaluation:

- imported/raw source records remain `rawEvidence` until an authorized approval creates approved canon;
- a blind or secret check remains `secretCheck`; a separately approved/revealed summary is `approvedCanon`;
- a locked achievement definition remains `hiddenAchievement`; an unlocked player-facing projection is `approvedCanon` with party or exact-player audience;
- private notes and assigned characters use `specificPlayers` with exact user/character grants;
- player A's assigned character never grants player B knowledge.

## Machine principals

Machine credentials never receive `owner`, `gm` or `player`. `MachineCampaignPolicySubject` carries an exact workspace, campaign, credential state/version and allowlisted capabilities.

| Channel | Capability examples |
|---|---|
| `job` | `job:execute`, bounded archive reads, bounded exports |
| `foundry` | `foundry:ingest`, `archive:read:party`, separately approved `archive:read:gm` |
| `notification` | `notification:deliver` plus the minimum archive audience needed |
| `export` | `export:create:party` or separately approved `export:create:gm` |

Connector credentials cannot execute jobs or notifications. Service credentials cannot impersonate a Foundry connector. A revoked/expired credential, missing capability, wrong channel or wrong tenant fails closed. `archive:read:gm` selects a dedicated GM connector/service allowlist; it never maps the machine to a GM membership or a generic GM serializer.

Notifications require two decisions: authorize the service delivery capability, then evaluate each resource as the recipient's current human subject. AI retrieval follows the same rule for the requesting user/character. Job attribution such as `initiatedByUserId` is audit context, not service authority.

## Storage and serialization adoption

`deriveCampaignReadScope` returns a storage-neutral exact read scope:

- manager: all valid editorial/audience/release/content classes inside the exact workspace/campaign;
- player: active + party/specific-player + public/revealed + approved-canon, with exact user and character grants.

A Mongo adapter must translate every field into the query so unauthorized records are not selected. It must then run the audience-specific allowlisted serializer. Nested GM fields, raw evidence, secret results, hidden achievement titles and source/auth metadata may not enter player JSON even if a query or future schema is wrong.

Action adapters derive `resourceOwnerUserId`, character assignment and visibility grants from stored records; they never trust a body/query claim for those fields.

All consumers use this sequence:

1. authenticate the human, connector or service credential kind;
2. load fresh exact campaign membership or machine scope;
3. call the channel-bound action/capability policy;
4. derive the exact read scope before repository access;
5. evaluate resource visibility where an item-level grant is required;
6. serialize to the player, manager or dedicated machine DTO;
7. cache only under `buildCampaignPolicyCacheKey` with a static allowlisted namespace, the exact typed action/capability/resource/read-scope discriminator, and the same fresh canonical server evaluation instant used by policy; targets and resource versions come from stored state, never request claims; never reuse an earlier request's instant, cap an expiring membership's entry TTL at its deadline as defence in depth, and invalidate source rows normally.

## Security proof

`tests/contracts/campaign-policy.test.mjs` exercises real policy output and reuses HED-24 controlled security assertions for cross-campaign and cross-subject denials. It covers removed/expired membership, owner/GM/player actions, co-GM semantics, raw-versus-canon, secret checks, hidden achievements, Discord, Foundry, jobs, notifications, exports, per-character Ask and cache-key invalidation.

This port does not itself cut over the current Express repositories. Each adapter migration must keep characterization tests and rollback independently; a framework or route must not copy the policy into local conditionals.
