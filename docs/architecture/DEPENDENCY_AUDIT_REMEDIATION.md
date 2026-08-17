# Production dependency audit remediation

- **Task:** HED-104
- **Date:** 2026-08-17
- **Baseline:** HED-103 (`7773dbea9c932faa17c6cebe1e8ff38a2bc05437`)
- **Runtime:** Node.js 24, npm 11
- **Scope:** supported lockfile-only patch updates; no manifest, runtime, route, UI, database, or deployment changes

## Result

`npm audit --omit=dev --audit-level=high` now passes. The lockfile was refreshed by npm on GitHub Actions rather than edited by hand. The production dependency graph changed only at the following transitive packages:

| Dependency path | Before | After | Reason |
|---|---:|---:|---|
| `express -> body-parser` | 1.20.5 | 1.20.6 | Includes the patched body-parser release. |
| `gray-matter -> js-yaml` | 3.15.0 | 3.15.1 | Includes the patched js-yaml release. |
| `apps/server -> sanitize-html -> postcss` | 8.5.15 | 8.5.26 | Includes the patched PostCSS release. |
| `apps/server -> sanitize-html -> postcss -> nanoid` | 3.3.13 | 3.3.18 | Includes both current nanoid security patches in the 3.x line. |

The root and workspace `package.json` files are unchanged. Vite is dev-only and shares the deduplicated PostCSS/Nano ID resolution, but `sanitize-html` is their production server dependency path. No `npm audit fix --force`, audit suppression, or major dependency upgrade was used.

## Reproduction and evidence

The one-time lock refresh used:

```sh
npm update body-parser js-yaml postcss nanoid --package-lock-only --ignore-scripts
npm audit --omit=dev --audit-level=high
```

GitHub Actions run `32029048060` completed successfully on Node.js 24. It verified that every package manifest was unchanged, asserted the four resolved versions above, ran the production high-severity audit gate, and committed the generated lockfile as `4f7848bed9c6acecf507116bff18e7aa1643dd9c`.

## Residual moderate findings

The production audit still reports two vulnerable package records through `react-router-dom 6.30.4 -> react-router 6.30.4`. Those records cover three moderate advisories:

- [`GHSA-jjmj-jmhj-qwj2`](https://github.com/advisories/GHSA-jjmj-jmhj-qwj2): open redirect leading to XSS in `react-router-dom` 6.30.2 through 6.30.4; there is no patched 6.x release;
- [`GHSA-wrjc-x8rr-h8h6`](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6): a separate backslash redirect bypass in `<Link>` and `useNavigate`;
- [`GHSA-337j-9hxr-rhxg`](https://github.com/advisories/GHSA-337j-9hxr-rhxg): constructor injection in React Router SSR hydration. The advisory explicitly excludes Declarative Mode, which is the current SPA mode.

The available patched line is React Router 7.18 or newer. That is a major router migration, while the current application uses React Router 6 in declarative SPA mode. Upgrading it inside a lockfile-remediation task would mix security remediation with route behavior changes and would violate the task's rollback boundary.

These moderate findings are therefore recorded, not suppressed. They must be handled by a separately reviewed router migration with route-contract and browser regression coverage. Until then, navigation targets derived from untrusted input must be validated as same-origin application paths, and the legacy SPA must not adopt React Router SSR hydration.

## Verification gate

The permanent CI command remains:

```sh
npm run audit:production
```

It fails on high or critical production findings. The full pull-request CI must also pass install, strict TypeScript contracts, runtime/compatibility tests, production build, and syntax checks before HED-104 can leave review.
