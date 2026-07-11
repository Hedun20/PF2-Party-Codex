# Stage 14 — Showcase, Performance, and Accessibility

Status: implemented on `codex/stage11-15-integration`.

## Loading and resilience

- Every route-level page is loaded through `React.lazy` behind a shared `Suspense` fallback.
- The application now has a top-level error boundary and a recoverable session-bootstrap error state instead of flashing the authentication screen while the API state is unknown.
- API calls tolerate unavailable browser storage, use a bounded request timeout, and surface actionable network errors.
- Route loading, full-application failure, and session recovery have stable, branded UI states.

## Production bundle

- React/router and the icon library are isolated into stable vendor chunks.
- Markdown rendering and sanitization are excluded from the initial route and load only on content views that need them.
- `scripts/check-web-bundle.mjs` reads the Vite manifest and fails the build when the initial payload exceeds its checked-in budgets.
- Current production result: **78.1 KiB initial JavaScript gzip** (budget: 110 KiB) and **32.7 KiB initial CSS gzip** (budget: 45 KiB).

## Accessibility baseline

- Added a keyboard skip link and a stable main-content focus target.
- Mobile navigation traps focus while open, closes on Escape, restores focus to its trigger, and locks background scrolling.
- Menus expose expanded state and controlled elements; buttons have explicit types and images have text alternatives.
- Form controls added in the stabilization path have accessible names.
- Focus-visible, reduced-motion, forced-colors, touch-target, and small-screen input rules are part of the final CSS layer.

## Public presentation

- Added a branded SVG favicon and installable web manifest.
- Added description, theme, and Open Graph metadata to the application shell.
- Removed backend/storage implementation language from prominent campaign, character, map, session, timeline, and settings views.

## Automated evidence

- Route and source contracts assert lazy page loading, `Suspense`, navigation accessibility hooks, reduced-motion support, explicit button types, image alternatives, and canonical source reachability.
- Production builds enforce the initial JavaScript and CSS budgets rather than recording advisory numbers only.
- Route contracts, tenant boundaries, server smoke checks, JavaScript syntax checks, dependency audit, and whitespace validation pass before the stage is committed.

Cross-browser visual review and assistive-technology spot checks remain in the final Stage 15 manual release pass.
