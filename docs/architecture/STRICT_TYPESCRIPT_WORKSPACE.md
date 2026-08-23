# Strict TypeScript target workspace bootstrap

- **Task:** HED-16
- **Status:** buildable target scaffold only; Express/Vite still owns runtime traffic and rollback
- **Architecture prerequisite:** [`MODULAR_MONOLITH_BOUNDARIES.md`](./MODULAR_MONOLITH_BOUNDARIES.md)
- **Security prerequisite:** [`CAMPAIGN_POLICY_PORT.md`](./CAMPAIGN_POLICY_PORT.md)
- **Migration prerequisite:** [`MONGO_MIGRATION_CONTRACT.md`](./MONGO_MIGRATION_CONTRACT.md)

## Frozen workspace

| Workspace | Runtime/build boundary | Imports at bootstrap | Forbidden |
|---|---|---|---|
| `apps/web-next` | Next.js App Router server/client build | Public contracts/core; server config only behind `server-only` | Legacy CSS/source import, direct Mongo, worker loop, connector secret in client chunks |
| `apps/worker` | Node.js ESM background process | Config, contracts, core; application adapters arrive in later slices | Interactive HTTP/session runtime, Next/React, connector role impersonation |
| `apps/discord-bot` | Node.js ESM external connector process | Connector contracts and server-only bot config | Mongo/core policy replacement, web sessions, raw internal repositories |
| `apps/foundry-module` | Browser ESM module artifact | Public Foundry config and connector contracts | `process.env`, Mongo/auth/service secrets, internal application implementation |
| `packages/contracts` | Framework/storage-neutral ESM declarations/runtime parsers | Validation helpers only | Next, React, Mongo, Node/browser globals, provider SDKs |
| `packages/core` | Framework/storage-neutral domain policy | Contracts | Frameworks, storage, queues, provider SDKs |
| `packages/config` | Three explicit exports: `public`, `server`, `foundry` | Runtime-free validation | Root catch-all export; secret values in error messages |

All packages are private ESM workspaces. They inherit `tsconfig.base.json`, including strict mode, exact optional properties, unchecked-index protection, isolated modules/declarations and NodeNext defaults. Browser/Next overrides are local and may not weaken the safety flags.

Experimental typed-route generation remains disabled in this bootstrap: Next 16.3.2 emits an unqualified global `JSX` reference that is incompatible with the pinned React 19 type namespace. Route inputs still compile under strict TypeScript; HED-98 may enable typed routes only after the patched framework/type combination passes a clean generated-type build without a global compatibility shim.

## Version and lock decision

The target scaffold pins Node 24, npm 11.9.0, TypeScript 7.0.2 and exact package versions in lockfile v3. Next.js is pinned to **16.3.2**, the current stable release and the first available line that clears the high-severity production audit findings present in 16.2.11, with React/ReactDOM 19.2.8.

Next.js announced a critical security release for August 26, 2026 for the 16.3 and 15.5 lines. Therefore:

1. this scaffold receives no traffic and creates no deployment artifact for alpha;
2. the scaffold may compile on 16.3.2, but it must not receive traffic or produce a promoted deployment before the announced 16.3.3 patch and advisory are reviewed;
3. HED-98 must refresh the pin to 16.3.3 or a later reviewed patched release, run `npm ci`, full verification and production audit, and record the advisory disposition before deployment;
4. dependency ranges are not used for the new runtime packages, so a lock refresh is an explicit reviewable change.

References: [Next.js releases](https://github.com/vercel/next.js/releases), [July 2026 security release](https://nextjs.org/blog/july-2026-security-release), [August 2026 advance notice](https://nextjs.org/blog/upcoming-nextjs-security-release-august-2026), and [installation requirements](https://nextjs.org/docs/app/getting-started/installation).

## Environment and secret boundary

`packages/config` validates environment input without logging values:

- `public` reads `NEXT_PUBLIC_APP_ORIGIN` through a direct statically analyzable Next expression and accepts only a canonical parsed HTTPS origin or an explicit loopback development origin with a valid TCP port;
- `server` has separate web, worker and Discord shapes with required Mongo/auth/service/provider credentials, stable IDs and bounded numeric settings;
- `foundry` accepts public connector origin and system ID only.

The server config has no root export. Next server access begins with `import "server-only"`. Client/static and Foundry artifacts are scanned for server config imports, secret-key markers and legacy source/CSS paths. Raw secret examples remain commented placeholders; no credential is committed.

## Commands

| Command | Purpose |
|---|---|
| `npm run lint` | Biome recommended-rule gate for target workspaces |
| `npm run format` / `format:check` | Deterministic Biome write/check for target files |
| `npm run typecheck:target` | Strict checks for config, worker, bot, Foundry and Next type generation |
| `npm run build:target` | Ordered contracts/core/config/runtime builds plus Next production build |
| `npm run test:workspace` | Build plus environment, package-lock, secret-boundary and cross-package runtime tests |
| `npm run verify:target` | Lint, format check, typecheck, build and workspace tests |
| `npm run verify` | Target verification followed by every existing rollback-runtime gate |

The existing `npm run build`, `start`, `dev` and production route remain Express/Vite. HED-16 does not silently repoint them to Next.js.

## Cross-package proof

The minimal runtime test sends the same branded campaign ID through worker, Discord and Foundry package exports. Worker code consumes the framework-free core policy. Connector probes prove `mongoAccess: "none"`; the Foundry artifact imports only its public config subpath. This is a compile/runtime boundary proof, not a connector implementation.

## CI and deterministic install

Both CI jobs install and verify npm 11.9.0 after setup-node and before their first `npm ci`; the setup-node npm cache remains enabled. The main job then runs `verify:target` before existing contract/security/runtime/build/audit gates. The committed lockfile contains every workspace and exact new dependency. No CI step runs a worker, bot, connector, migration or index command.

## Exit and rollback

HED-16 is complete when clean checkout + Node 24 + npm 11.9 can run the target verification and every existing gate. It does not authorize traffic, data access, credentials, connector installation or deployment. Removing the target scaffold is a code rollback only; no data repair is required because the scaffold performs no writes and starts no process in CI.
