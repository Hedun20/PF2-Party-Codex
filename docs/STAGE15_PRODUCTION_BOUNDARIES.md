# Stage 15 — Production Boundaries and Release Gates

Status: implemented on `codex/stage11-15-integration`.

## Platform administration

- Platform access is evaluated independently from campaign memberships.
- `owner` and `gm` remain campaign-scoped roles and never grant platform administration.
- A verified user becomes a platform administrator only through `PLATFORM_ADMIN_EMAILS` or a protected Mongo `platformRoles: ["admin"]` assignment.
- Detailed identity health, release readiness, email-outbox inspection, and delivery retry routes require platform-admin access.

## Workspace plans and billing boundary

- Workspace plan codes resolve through one backend entitlement catalog.
- Campaign creation, invitation seats, and uploaded asset bytes are checked on the server before mutation.
- `/api/subscription` exposes the active workspace plan, enforced limits, measured usage, and billing mode to campaign members.
- Billing supports only `disabled` and `manual` boundaries. Party Codex does not fabricate checkout, payment success, provider IDs, or self-service billing.
- Historical `local-dev` workspaces normalize to the explicit `development` plan; newly created user workspaces start on `free`.

## Durable email delivery

- Verification and invitation messages are written to the Mongo `emailOutbox` before delivery.
- `EMAIL_MODE=outbox` remains a local inspection mode.
- `EMAIL_MODE=webhook` delivers a provider-neutral, authenticated event with an idempotency key.
- Transient failures retain status and retry metadata; a background worker processes due retries, and platform admins can retry an item explicitly.
- Successful delivery removes message bodies from the outbox and schedules the remaining delivery metadata for TTL cleanup.
- Registration reports queued versus sent state accurately, and users can request a fresh verification message without revealing whether an account exists.

## Runtime and security hardening

- Production startup validates the signing secret, Mongo requirement, public URL, explicit CORS origins, email delivery, sender, and supported billing mode in one fail-fast report.
- Production refuses to start in Mongo diagnostic mode.
- Trust-proxy behavior is explicit instead of assumed.
- API responses receive request IDs, a shared rate limit, bounded JSON bodies, and centralized error shaping; internal 5xx details are hidden in production.
- Session tokens contain no email or campaign role, use timing-safe signature comparison, and carry a server-side session version so logout invalidates issued tokens.
- Graceful shutdown stops the email worker, drains HTTP requests, closes idle connections, and closes Mongo with a bounded fallback.
- Audit events use Mongo only; the obsolete writable JSON runtime store was removed.

## Delivery automation

- `.github/workflows/ci.yml` runs locked dependency installation, 97-endpoint route/access contracts, server smoke tests, the budgeted production build, syntax checks, and a production dependency audit.
- The multi-stage `Dockerfile` builds the verified frontend, installs runtime dependencies, runs as a non-root user, and checks overall database/email readiness.
- `.dockerignore` excludes credentials, local data, generated output, and repository metadata from the build context.

## Release classification

The repository is **code-complete for the Stage 15 stabilization baseline**. It is not declared publicly production-ready until the environment-dependent checks in `STAGE15_RELEASE_RUNBOOK.md` have evidence and sign-off. In particular, the repository cannot prove real Mongo role behavior, external email delivery, DNS/TLS/proxy configuration, browser rendering, or backup restoration without the target environment.
