# Identity / Onboarding v2

PF2 Party Codex now follows the Architecture Contract v2 identity model.

## Source of truth

- MongoDB is the source of truth for users, workspaces, campaigns, memberships, invitations, and campaign content.
- Markdown vault remains an import/export/backup/compatibility layer.

## User lifecycle

Normal registration creates a global `user` account only.

It must not automatically create:

- a workspace
- a campaign
- a campaign membership

A user can exist without an active campaign membership.

## GM onboarding

A signed-in, email-verified user creates their first playable context explicitly through:

```txt
POST /api/onboarding/workspace
```

The route creates:

- a workspace owned by the user
- a campaign inside that workspace
- an `owner` membership for that campaign

This is the only normal product path for becoming a GM/owner.

## Player onboarding

A player gets campaign access only by accepting an invitation:

```txt
POST /api/invitations/accept
```

Invitation acceptance must:

- require login
- verify that the token is pending and not expired
- verify that the invitation email matches the signed-in user email
- create or activate the exact campaign membership

## Legacy dev seed

The old first-user/second-user automatic campaign bootstrap is no longer part of normal registration.

A legacy helper may remain only as an explicit local development or migration seed. It must not run automatically for every registration.

## Frontend behavior

If a signed-in user has no active campaign membership, the UI should show a no-campaign onboarding state instead of pretending that GM Portal or Player Portal is ready.

Campaign permissions must come from `activeMembership.role` / exact campaign membership, not from a global user role or frontend-only mode switch.
