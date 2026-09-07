# HED-33 — Campaign Identity & Access Lifecycle

Status: implementation contract for `agent/hed-33-identity-access-lifecycle`.

This document applies the mandatory PF2 feature-lifecycle standard to campaign identity, invitations, membership management, campaign exit, ownership transfer, and Discord identity linking. A working endpoint is not feature completion unless the surrounding user journey, recovery path, authorization boundary, and repeated/concurrent action behavior are also defined.

## Purpose

Give a Party Codex account a predictable, recoverable way to enter, use, manage, and leave a campaign while preserving one authority rule:

> Campaign membership is the authorization source. Email invitations and Discord identities may prove or connect identity, but they never grant campaign authority independently.

HED-33 covers:

- accepting and operating invitation-based access;
- listing and managing exact campaign memberships;
- owner-managed GM/player role changes;
- manager removal of other members;
- self-service campaign leave;
- owner transfer before exit;
- Discord identity pair/status/unlink as a subordinate external identity;
- cleanup of character assignments, active-campaign pointers, pending Discord challenges, and Discord links when membership ends.

HED-33 does not implement Discord message capture, session ingestion, subscription billing, or platform-admin user impersonation.

## Actors

### Account without campaign membership

- may inspect a valid invitation preview;
- may accept only an invitation addressed to the account's verified email;
- may not access campaign content or campaign-management endpoints.

### Player

- may use an active membership in an exact campaign;
- may leave the campaign;
- may pair/unpair their own Discord identity when the connector is configured;
- may not change roles, remove other members, transfer ownership, or use manager recovery actions.

### GM

- has all applicable member capabilities;
- may invite players;
- may remove players but not the owner or another GM;
- may perform manager Discord unlink recovery for players;
- may not transfer ownership or change membership roles.

### Owner

- has all applicable GM capabilities;
- may promote/demote non-owner memberships between `player` and `gm`;
- may remove non-owner members;
- may transfer campaign ownership to another active linked member;
- may not leave while still owner.

### Discord connector service

- has no campaign membership of its own;
- may submit a verified Discord identity proof only through the internal service-authenticated confirmation endpoint;
- cannot create memberships or choose campaign roles.

## Entry Points

- invitation link `/invite/:token`;
- campaign management `/players`;
- campaign/account settings `/settings`;
- account profile `/profile` for Discord identity;
- API membership/invitation routes under `/api/campaigns/:campaignId/...`;
- internal Discord confirmation route `/api/internal/discord/identity/confirm`.

## Preconditions

### Invitations

- inviter has active exact campaign membership with `owner` or `gm` role;
- workspace member-seat capacity allows a pending invite;
- invited email is valid;
- invitation acceptance account email matches the invitation email;
- invitation remains pending and unexpired.

### Membership management

- actor is authenticated;
- actor and target belong to the exact requested campaign;
- actor role is resolved server-side from current membership;
- target membership is active where the action requires active membership.

### Campaign leave

- caller has an active membership in the exact campaign;
- owner must first transfer ownership.

### Ownership transfer

- caller is the current owner in both membership and campaign ownership state;
- target is another active membership with a linked user account.

### Discord identity

- caller has active exact campaign membership;
- `DISCORD_IDENTITY_LINK_ENABLED=true` for new pairing challenges;
- service confirmation requires a separately configured `DISCORD_SERVICE_CREDENTIAL`;
- proof campaign/workspace must match the challenge and live membership;
- proof is recent and structurally valid.

## Happy Path

### Invitation acceptance

1. GM/owner creates invitation for a player email.
2. Party Codex stores a hashed invitation token and queues delivery.
3. Recipient opens the link and sees campaign/workspace context without exposing unrestricted campaign data.
4. Authenticated recipient with matching email accepts.
5. Membership is activated safely and the campaign becomes active for the user.
6. User lands inside the campaign with server-resolved role.

### Role management

1. Owner opens Players.
2. Owner chooses `player` or `gm` for an active non-owner member.
3. Server rechecks actor and target campaign scope.
4. Membership role changes and audit is recorded.
5. Refreshed UI shows the authoritative role.

### Manager removal

1. Authorized owner/GM selects an allowed target.
2. UI requires explicit destructive confirmation.
3. Server revokes subordinate Discord identity state before membership authorization disappears.
4. Target membership becomes `removed`.
5. Assigned characters are detached.
6. Target user's active-campaign pointer is cleared if it points at this campaign.
7. Audit is recorded.

### Self leave

1. Player/GM opens Settings and chooses Leave campaign.
2. UI explains consequence and requires confirmation.
3. Server revokes Discord identity/pending pairing first.
4. Membership becomes `removed` with reason `left`.
5. Character assignments are detached and stale active-campaign pointer is cleared.
6. Session context resolves a remaining campaign when available, otherwise no active campaign.
7. User is sent to a safe campaign-selection/account destination.

### Ownership transfer

1. Owner selects another active member.
2. UI requires explicit transfer confirmation.
3. Server promotes target membership to owner using compare-and-set semantics.
4. Campaign owner pointer changes to target user.
5. Previous owner becomes GM.
6. Transfer metadata is stored so an identical retry can reconcile idempotently.
7. Audit is recorded.

### Discord pairing

1. Member opens Profile and chooses Link Discord.
2. Server creates a short-lived one-time challenge and returns the plain pairing code once.
3. Only the code hash is stored.
4. User submits the code through the configured Discord connector interaction.
5. Connector verifies Discord identity and calls internal confirmation with service credential.
6. Server re-resolves exact live membership and challenge scope.
7. One active Discord link is stored for that membership/user in that campaign.
8. Profile polling changes to linked state.

### Discord unlink

1. User chooses Disconnect Discord, or authorized manager uses recovery unlink for an allowed member.
2. UI requires explicit confirmation for self-service unlink/recovery action.
3. Server marks the active link revoked and revokes pending challenges for that membership.
4. Campaign membership remains unchanged.

## Alternative Paths

- A user can belong to multiple campaigns; active campaign is a navigation/context choice, not a global role.
- Re-sending an invitation creates a new usable token and invalidates the previous pending token.
- A previously accepted invitation may resolve idempotently when the same user still has active campaign membership.
- After leave/removal, another active membership can become the user's selected campaign.
- Owner may transfer ownership and remain as GM instead of leaving.
- Discord is optional; campaign access works without any Discord link.
- If Discord pairing is disabled/not configured, Profile shows an unavailable/recovery state instead of accepting manual Discord IDs.

## Failure Paths

- invalid/expired/revoked invitation;
- invitation email mismatch;
- exhausted workspace seat entitlement;
- missing/inactive/cross-campaign membership;
- GM tries to manage owner/another GM;
- non-owner tries to change roles or transfer ownership;
- owner attempts to leave before transfer;
- target changes concurrently during remove/role/transfer;
- Discord pairing disabled;
- missing/invalid service credential;
- invalid, expired, reused, or cross-campaign Discord pairing proof;
- membership already has active Discord identity;
- Discord user is already actively linked to another membership in the same campaign;
- storage/network failure during any mutation.

Failures return explicit 4xx/5xx states and must not silently create partial authorization.

## Recovery

- invitation creation/delivery failures expose retry/resend state;
- invitation links can be revoked and recreated;
- stale active-campaign pointers are repaired by session/campaign resolution;
- membership mutations return refresh-and-retry conflict messages on compare-and-set failure;
- ownership transfer records the completed transfer so an identical retry can reconcile safely;
- failed/lost Discord pairing code is replaced by a new challenge; old pending challenge is revoked;
- Profile supports manual status refresh and polling while pairing is pending;
- self/manager Discord unlink is idempotent and can clear stale external identity without removing campaign membership;
- membership termination defensively revokes both active Discord links and stale pending challenges.

## States

### Invitation

`pending → accepted`

`pending → revoked`

`pending → expired`

A resend replaces the usable secret for a still-pending invitation.

### Membership

Core HED-33 authorization states:

- `active`
- `removed`

Removal reason distinguishes at least manager removal from self leave.

Roles while active:

- `owner`
- `gm`
- `player`

### Ownership transfer

Conceptual states:

- `notStarted`
- `targetPromoted`
- `campaignOwnerMoved`
- `previousOwnerDemoted`
- `complete`
- `reconcileRequired` only when a partial external interruption is detected.

Persisted `ownershipTransferLast` identifies a completed transfer for idempotent retry/reconciliation.

### Discord challenge

- `pending`
- `consumed`
- `revoked`
- `expired` (derived/persisted through expiry handling)

### Discord link

- `active`
- `revoked`

Only `active` can authorize Discord-to-account identity resolution, and even then campaign permission still requires live membership.

## Transitions

- invitation acceptance: `pending → accepted` only once;
- invitation revoke: `pending → revoked`;
- invitation expiry: `pending → expired`;
- role change: `player ↔ gm`, owner role is protected except ownership transfer;
- manager removal/self leave: `active membership → removed`;
- ownership transfer: target `player|gm → owner`, previous owner `owner → gm`;
- Discord pairing: `pending challenge → consumed` + create `active link`;
- Discord unlink/member termination: `active link → revoked`, pending challenges → `revoked`.

All transitions are campaign-scoped and server-authorized.

## Modification

- member display/profile data is managed separately from campaign role;
- owner may change non-owner membership role;
- invitations are not edited after issuance; resend/revoke is used instead;
- Discord link identity is not manually edited. To change Discord account, unlink then pair again;
- ownership is not changed through generic role editing.

## Cancellation / Revocation / Deletion

- pending invitation can be revoked by campaign manager;
- Discord challenge can be superseded/revoked;
- Discord link is soft-revoked rather than hard-deleted so history remains auditable;
- membership is soft-removed rather than deleted;
- user account deletion is outside HED-33;
- campaign archival/retirement is outside HED-33 and handled by campaign-governance work.

## Time / Expiration

- invitation default TTL: 7 days;
- Discord pairing challenge default TTL: 10 minutes;
- expired/revoked secrets cannot be accepted;
- Discord challenge records have TTL/purge metadata for cleanup;
- membership and ownership do not expire automatically in HED-33.

## Permissions

| Capability | Player | GM | Owner | Discord service |
| --- | --- | --- | --- | --- |
| Accept own matching invitation | Yes | Yes | Yes | No |
| View own Discord status | Yes | Yes | Yes | No |
| Create own Discord challenge | Yes | Yes | Yes | No |
| Unlink own Discord identity | Yes | Yes | Yes | No |
| Confirm verified Discord proof | No | No | No | Service credential only |
| Invite player | No | Yes | Yes | No |
| Remove player | No | Yes | Yes | No |
| Remove GM | No | No | Yes | No |
| Change player/GM role | No | No | Yes | No |
| Transfer ownership | No | No | Yes | No |
| Leave campaign | Yes | Yes | Only after transfer | No |

Every permission is rechecked server-side against current exact membership. UI visibility is convenience only.

## Notifications

- invitation email communicates campaign and acceptance link;
- resend communicates a new link and invalidates the former one;
- current HED-33 does not require email on role change, removal, leave, ownership transfer, Discord pair, or unlink.

N/A decision: additional email/push notifications are deferred because no reliable notification-preference system exists yet. Audit and immediate UI status are the authoritative feedback for this release.

## Status Visibility

Users can see:

- invitation pending/delivery state in Players;
- current campaign role in shell/profile/Players;
- campaign leave/transfer errors in Settings;
- Discord unavailable, pending, linked, and unlink states in Profile;
- explicit success/failure messages after management operations.

Secrets are not status fields:

- raw invitation tokens are not listed after issuance;
- Discord pairing code is returned only for the challenge creation response and not persisted in plaintext;
- service credential is never exposed to browser responses.

## History / Audit

Audit events cover security-relevant actions including:

- invitation create/resend/revoke/accept;
- role changes;
- membership remove/leave;
- ownership transfer;
- Discord pairing challenge creation, link confirmation, and unlink/recovery.

Audit metadata must not contain raw invitation tokens, pairing codes, service credentials, or unnecessary provider payloads.

Membership/link records retain removal/revocation timestamps and reasons for operational reconstruction.

## Idempotency / Repeated Actions

- accepting an already accepted invitation by the same still-authorized user resolves safely where possible;
- repeated campaign leave after membership is already removed returns the removed membership as idempotent cleanup state;
- repeated ownership-transfer request for the same completed transfer reconciles to the same owner state;
- repeated Discord confirmation for the same completed challenge/link resolves to the current link where proof matches;
- repeated Discord unlink is idempotent;
- manager removal and role mutation use current-state predicates and return conflict when state changed instead of silently overwriting.

## Concurrency

- invitation acceptance uses safe state transition logic so one invitation cannot produce conflicting memberships;
- membership removal/role changes use active/current-state predicates;
- ownership transfer uses compare-and-set checks and completed-transfer reconciliation;
- Discord challenge consumption uses pending/unexpired state predicates;
- active Discord links have partial unique Mongo indexes:
  - one active link per `(campaignId, membershipId)`;
  - one active link per `(campaignId, discordUserId)`;
- duplicate-key races are translated into a deterministic Discord identity conflict instead of leaking Mongo errors.

## Security / Abuse

- membership is the sole campaign authorization authority;
- campaign ID from client never grants authority by itself;
- roles are resolved server-side, never trusted from request body;
- invitation and Discord pairing secrets are hashed at rest;
- Discord browser UI never accepts a raw manually typed Discord user ID as proof of identity;
- Discord confirmation requires a distinct service credential and constant-time comparison;
- verified Discord proof contains exact campaign/workspace scope and bounded timestamps;
- one Discord user cannot be actively linked to two memberships in the same campaign;
- membership termination revokes Discord identity before authorization is removed to avoid stale identity authority;
- cross-campaign operations fail closed;
- destructive user actions require explicit UI confirmation;
- audit avoids secrets.

## Basic UX / Accessibility

- destructive actions use explicit confirmation rather than accidental single-click completion;
- buttons expose explicit `type` and existing focus-visible/reduced-motion contracts remain intact;
- success, warning, loading, and error states use semantic status components;
- Discord pairing explains that membership controls permissions;
- one-time code can be copied but is also visibly selectable if Clipboard API fails;
- pending Discord pairing automatically refreshes but also provides manual refresh;
- pairing-disabled state explains configuration instead of presenting a broken button;
- user always has a safe destination after leaving a campaign.

## Success Destination

- invitation acceptance → accepted campaign context;
- role/removal/invite management → refreshed Players page;
- self leave → another available campaign or campaign selection/no-campaign state;
- ownership transfer → Settings/Players with refreshed authoritative owner state;
- Discord pair/unlink → Profile with refreshed connection status.

## Ownership of Incomplete Processes

- email outbox owns invitation delivery retries;
- browser + server challenge state own pending Discord pairing until expiry/replacement;
- Discord connector owns verified interaction transport but not campaign authorization;
- server membership repository owns leave/removal/transfer state and cleanup;
- audit log owns operational reconstruction when a user reports an inconsistent result.

No incomplete authorization transition may be owned only by browser state.

## Troubleshooting

### Invitation cannot be accepted

Check, in order:

1. invitation status and expiry;
2. current account email matches invitation email;
3. invitation was not replaced/revoked;
4. membership already exists/was removed;
5. workspace entitlement and email-delivery state.

### User sees wrong campaign after leave/remove

1. re-read `/session`;
2. verify removed membership is not `active`;
3. verify `activeCampaignId` no longer points to removed campaign;
4. allow identity context reconciliation to choose another active membership or none.

### Owner cannot leave

This is expected. Transfer ownership to another active linked member first.

### Discord pair button unavailable

Check `DISCORD_IDENTITY_LINK_ENABLED`, connector deployment, and service credential configuration. Do not work around by manually storing a Discord user ID.

### Pairing code does not work

Create a new code. A code is short-lived, single-use, campaign/membership scoped, and only the latest pending challenge should be used.

### Discord account reports conflict

The Discord user is already actively linked to another membership in the same campaign. Use authorized unlink/recovery on the existing link before retrying.

### Removed member still appears linked

Membership removal/leave calls Discord revoke before authorization removal. Inspect audit plus `discordIdentityLinks`/`discordIdentityChallenges`; recovery unlink is idempotent, and stale pending challenges are revoked defensively.

## N/A Decisions

- **Password/login lifecycle:** N/A here; owned by authentication feature work.
- **Campaign archive/restore:** N/A here; owned by campaign-governance lifecycle.
- **Account deletion:** N/A here; not implemented by HED-33.
- **Discord capture/commands:** N/A here; HED-33 links identity only. Discord ingestion/command policy belongs to Discord integration tasks.
- **Billing/payment:** N/A here; membership entitlement is read, but payment lifecycle is separate.
- **Automatic role-change/removal emails:** N/A for this release; no notification preference/transaction policy exists yet.
- **Hard deletion of memberships/Discord links:** N/A intentionally; soft terminal states are required for audit/recovery.

## Definition of Done

HED-33 is complete only when all of the following hold:

- [x] exact campaign membership remains the authorization source;
- [x] invitation accept/resend/revoke/recovery lifecycle is explicit and concurrency-safe;
- [x] owner/GM membership-management permission differences are server-enforced;
- [x] dedicated self-leave exists and owner cannot leave without transfer;
- [x] ownership transfer has retry/concurrency reconciliation;
- [x] character assignments and active-campaign pointers are cleaned when access ends;
- [x] Discord identity uses one-time hashed challenge, never manual browser-entered Discord ID authority;
- [x] Discord service proof is separately authenticated;
- [x] Discord link is exact campaign/membership/user scoped;
- [x] Discord link/challenge are revoked before membership authorization ends;
- [x] active Discord-link race is protected by partial unique indexes;
- [x] Profile exposes usable pairing/status/unlink/recovery states;
- [ ] Players exposes manager-assisted Discord unlink recovery for authorized targets;
- [x] destructive user actions require confirmation where user-facing;
- [x] security-relevant state changes are audited without raw secrets;
- [x] disposable-Mongo tests cover invitation/membership and Discord identity concurrency/cleanup;
- [x] static contracts cover identity authority, route/UI/config boundaries;
- [ ] final branch CI is green after all HED-33 changes;
- [ ] PR is Ready for Review and Linear HED-33 is In Review.
