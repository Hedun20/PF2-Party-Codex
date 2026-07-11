# Stage 13 — Architecture and UI Unification

Status: implemented on `codex/stage11-15-integration`.

## Runtime architecture

- Express application construction now lives in `apps/server/src/app.js` as `createApp()`.
- Database/index initialization, HTTP listening, and shutdown handling remain in `apps/server/src/index.js`.
- Importing the application no longer starts a listening process, which makes integration testing and future serverless/container adapters practical.
- Mongo-disconnected mode is explicitly diagnostic. Authentication no longer falls back to a writable `users.json` store.
- Liveness (`/api/health`) and readiness (`/api/health/db`) are now distinct: the process can be alive while Mongo readiness is false.

## Source-tree consolidation

- Removed stale root copies of the frontend, server, repositories, import service, and reveal route.
- Removed unreachable components, an abandoned editor implementation, unused audio controls, placeholder pages, and unused server modules.
- Folded all `*V2` page implementations into their canonical page filenames.
- Added a reachability regression test so orphan runtime modules and versioned page implementations cannot quietly return.

## UI and CSS structure

- The frontend has one CSS entrypoint: `apps/web/src/styles/index.css`.
- Cascade order is explicit through named layers: theme, fantasy, components, design, buttons, stabilization, shell, blocks, and campaign.
- Removed more than six hundred lines of unreachable ambience, World Sound, legacy button, mode-toggle, and command-search CSS.
- Replaced the last legacy auth button with the shared `CodexButton` component.
- Renamed UI copy and internal models from “legacy vault fallback” to entry-backed views where the data already comes from campaign-scoped Mongo entries.
- Renamed Vault Health to Campaign Health because the audit now operates on the active campaign and its scoped assets.

## Automated evidence

- Web and server runtime graphs have no unreachable JavaScript modules.
- No versioned `V2` page implementation files remain.
- Stale root duplicates are asserted absent.
- Route inventory, access boundaries, tenant serialization, server startup, production build, syntax checks, and dependency audit continue to pass.

Manual visual regression review remains deferred to the final Stage 15 release pass.
