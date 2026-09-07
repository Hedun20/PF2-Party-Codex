# UI Foundation Reset

Status: active stabilization work.

## Goal

Use one neutral application design while the core Campaign Archive workflows are repaired. World-specific visual theming is deferred. World selection and campaign scoping remain functional; only dynamic visual theming is being removed from the application shell.

## Rules

- Preserve routes, permissions, campaign/world scope and backend behavior.
- Prefer structural readability over premium effects.
- Keep one neutral dark foundation during lifecycle work.
- Do not add new world-specific colors, particles, animated backgrounds or theme branches.
- Accessibility behavior must remain intact.
- Remove patch-on-patch CSS gradually; do not replace functional layout with an untested visual rewrite.
- After core lifecycle completion, visual themes may return as isolated optional patches/modules.

## Stage 1

- Remove runtime world theme resolution from `FantasyShell`.
- Remove cinematic world background rendering.
- Reduce `fantasy.css` to structural shell/layout rules only.
- Keep world scope in navigation and URLs unchanged.

## Next CSS consolidation stage

The current CSS entrypoint still imports many historical stage/hotfix stylesheets. They should be consolidated by responsibility and then physically merged only after coverage is verified. Target end-state:

1. one neutral token/foundation stylesheet;
2. one application/component stylesheet during migration;
3. eventually a single compiled application stylesheet with no stage-numbered patches.

Deleting all current CSS files immediately is intentionally avoided because many pages still depend on class-specific layout rules. The correct migration is to remove conflicting theme behavior first, then collapse style ownership while preserving page usability.
