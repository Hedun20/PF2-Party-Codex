# Stage 15 — Final Release Runbook

Use this runbook only after the Stage 15 branch has passed `npm run verify`. Record links, screenshots, request IDs, and test account names in the release ticket; do not put credentials in the repository.

## 1. Staging environment

- Provision a dedicated Mongo database and a least-privilege application user.
- Set a unique `AUTH_SECRET` of at least 32 characters.
- Set the final HTTPS `PUBLIC_APP_URL` and explicit HTTPS `ALLOWED_ORIGINS`.
- Set `TRUST_PROXY` to the real proxy hop count; do not copy a value from another deployment blindly.
- Configure `EMAIL_MODE=webhook`, its HTTPS URL/token, and a verified `EMAIL_FROM`.
- Configure at least one verified `PLATFORM_ADMIN_EMAILS` account.
- Choose `BILLING_MODE=disabled` or `manual`; do not advertise paid checkout while it remains external.
- Start with `NODE_ENV=production` and confirm that an intentionally missing required value prevents startup.

## 2. Automated gate

```bash
npm ci
npm run verify
docker build -t party-codex:release-candidate .
```

Required evidence:

- all route/access and smoke tests pass;
- production build passes the 110 KiB initial JS and 45 KiB initial CSS gzip budgets;
- production dependency audit reports no high/critical vulnerability;
- container reports healthy only after database and email-delivery readiness are true;
- CI passes on the exact release commit.

## 3. Test identities

Create five separate verified accounts:

1. platform administrator without relying on a campaign role;
2. workspace owner;
3. GM member;
4. player member;
5. authenticated user with no membership in the target campaign.

Never reuse one account to represent multiple rows in the access matrix.

## 4. Access and tenant matrix

- Owner and GM can manage entries, pages, maps, timeline, sessions, handouts, notes, characters, imports, assets, memberships, and invitations in the selected campaign.
- Player can read only player-safe content and cannot reach GM metadata or mutation routes.
- Unaffiliated and anonymous users receive `401`/`403` for campaign data.
- Owner and GM receive `403` from `/api/platform/status` unless separately configured as platform admin.
- Platform admin can read platform status/outbox without acquiring implicit membership in any campaign.
- Change `X-Campaign-Id` to another campaign for every role and verify exact membership resolution; no data, asset, audit event, note, character, handout, map object, or session crosses tenants.
- Verify hidden pins/map objects, GM content, source metadata, actor IDs, and private frontmatter never appear in player JSON.
- Log out, replay the previous bearer token, and verify it is no longer authenticated.

## 5. Route and transition sweep

Exercise desktop and mobile navigation through all 37 frontend routes, including normalized legacy world routes and the wildcard 404. At minimum cover:

- login, registration, verification, resend, invitation acceptance, onboarding, campaign creation, and campaign switching;
- campaign dashboard, archive, category, article, world dashboard, editor, raw editor, missing links, and campaign health;
- session desk, sessions, dice, notes, handouts/reveal, maps, timeline, and characters;
- players/invitations, profile, settings/subscription, guide, GM tools, player safety, Foundry import/export, and not-found;
- direct reload and browser back/forward on every parameterized route;
- API failure, expired session, route chunk loading, and top-level recovery states.

No visible control may lead to an undeclared route, blank screen, endless loading state, or HTML response from an unknown `/api/*` path.

## 6. Email and entitlement checks

- Register a new account and confirm the outbox item transitions to `sent` with a provider message ID when supplied.
- Request resend and confirm the old verification token expires.
- Create and accept an invitation; confirm recipient matching and campaign activation.
- Force one webhook failure, confirm `retry` state/backoff, restore the provider, and confirm automatic or admin-triggered delivery succeeds without a duplicate message.
- On a disposable free workspace, reach each campaign/member/asset limit and verify the next mutation fails with `ENTITLEMENT_LIMIT` without partial data or files.
- Verify settings usage matches Mongo memberships/campaigns and bytes in campaign asset directories.

## 7. Browser, keyboard, and visual review

- Review current Chrome, Firefox, Safari, and Edge at 360, 768, 1024, and 1440 px widths.
- Complete the primary flows using keyboard only: skip link, sidebar focus trap/Escape/restore, menus, dialogs, forms, editor, and file upload.
- Check visible focus, 200% zoom, reduced motion, forced colors/high contrast, and screen-reader names for navigation and forms.
- Confirm no clipping, horizontal overflow, illegible contrast, layout jump, missing icon/font, untranslated implementation copy, or exposed backend terminology.
- Capture approved screenshots for dashboard, archive/article, session desk, player portal, maps, characters, onboarding, and settings.

## 8. Operations and rollback

- Confirm request IDs appear in responses and correlate with structured logs.
- Verify CORS rejects an unlisted origin and the API rate limit returns structured `429` JSON.
- Send `SIGTERM` during normal traffic and confirm requests drain before Mongo closes.
- Run a Mongo backup, restore it into a clean database, and verify counts plus representative assets/entries against the restored environment.
- Document the previous image/commit, database migration compatibility, rollback command, responsible operator, and escalation channel.

## 9. Sign-off

Release only when product, engineering, and operations agree that every failed item is either fixed or explicitly accepted with an owner and deadline. The final decision should name the exact commit, container digest, database, domain, email provider, backup evidence, and known limitations.
