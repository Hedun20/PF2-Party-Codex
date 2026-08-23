# Adversarial test foundation

HED-24 adds a framework-neutral Node test harness for security boundaries that are shared by the web app, workers, Discord, Foundry, AI retrieval, notifications, analytics, exports, and destructive operations.

The harness is a test contract, not runtime authorization. A feature must adapt its real response/decision into the relevant assertion and keep its own integration tests. UI hiding never satisfies a scenario.

## Mandatory scenarios

| Scenario | Gate | Required boundary |
|---|---|---|
| `tenant.cross-workspace-campaign` | W2/W3/W4 | Cross-workspace and cross-campaign identifiers fail closed |
| `membership.removed-player` | W2/W3/W4 | A removed membership cannot reuse an account session |
| `knowledge.player-a-vs-player-b` | W3/W4 | Character/player-specific knowledge is exact-subject scoped |
| `visibility.gm-only-source` | W2/W3/W4 | Raw or GM-only evidence never reaches player output |
| `roll.blind-secret` | W2/W3 | Blind/secret formula, result, and breakdown stay hidden |
| `discord.guild-channel-spoof` | W2 | Guild/channel/campaign binding cannot be substituted |
| `foundry.connection-replay` | W2 | Consumed/revoked connection evidence cannot be replayed |
| `connector.signed-batch-tampering` | W2 | Batch payload, connection, campaign, and signature are inseparable |
| `jobs.retry-idempotency` | W2/W4 | A retry does not duplicate an external or persistent side effect |
| `cache.tenant-principal-key` | W2/W3/W4 | Cache identity includes tenant, principal, and policy version |
| `notifications.deep-link-scope` | W3/W4 | Deep links are local and exact-campaign scoped |
| `ai.prompt-injection` | W4 | Campaign evidence is untrusted data and cannot authorize instructions/writes |
| `analytics.metadata-redaction` | W3/W4 | Analytics uses a bounded allowlist without content, PII, credentials, or secret titles |
| `export.campaign-scope` | W4 | Export is authorized against the exact campaign and audience |
| `delete.campaign-scope` | W4 | Delete is authorized against the exact campaign before mutation |
| `achievements.title-leakage` | W3/W4 | Hidden achievements do not leak title, criteria, or description |

## Reusable assertions

`tests/security/support/security-assertions.mjs` provides:

- exact denial and scoped-record assertions;
- hidden-envelope and forbidden-evidence checks;
- canonical HMAC batch signing/integrity verification for connector fixtures;
- job idempotency, tenant/principal cache-key, and campaign deep-link checks;
- prompt/evidence separation and explicit allowlisted, bounded analytics metadata checks;
- normalized-path campaign deep-link validation;
- recursive redaction of every evidence leaf and a controlled `SecurityAssertionError`.

Assertion failures contain the scenario ID and redacted evidence only. They must not attach raw `actual`/`expected` objects through Node's default assertion error because CI and uploaded diagnostics can otherwise retain credentials or private campaign text.

## Sensitivity proof

Every scenario contains both:

1. a secure control fixture that the reusable assertion accepts; and
2. an intentionally insecure fixture that the same assertion must reject.

The negative fixtures include cross-tenant IDs, inactive membership, another player's knowledge, GM-only markers, secret roll data, spoofed Discord binding, replayed Foundry evidence, a tampered signed batch, duplicate job effects, incomplete cache identity, a normalized-path campaign escape, prompt injection, non-allowlisted analytics metadata, cross-campaign export/delete, and a hidden achievement title. Focused controls also cover external deep links, encoded traversal, arbitrary PII/credential-like analytics keys, and nested analytics values.

If a future edit weakens an assertion so its insecure fixture passes, `tests/security/security-foundation.test.mjs` fails. `tests/security/hed-24-boundaries.mjs` is an independent required-ID and exact-wave specification, so removing a fixture and its local metadata cannot silently reduce coverage. Separate tests inspect controlled error messages and fail if any arbitrary evidence leaf, credential/private marker, Mongo username/password, Bearer value, email, or other forbidden evidence is present.

## Feature adoption rule

For each W2/W3/W4 feature:

1. import the closest reusable assertion;
2. create fixtures from the feature's real application-port or HTTP output;
3. include at least one cross-tenant/subject negative case and one secret-marker case;
4. verify backend denial or allowlisted serialization before testing UI state;
5. use disposable infrastructure for persistence, replay, retry, cache, and mutation evidence;
6. add the scenario and exact wave assignment to the independent `HED_24_BOUNDARY_SPEC` if it creates a new boundary;
7. never print raw failure objects or upload an unredacted diagnostic artifact.

Run locally with `npm run test:security`. The dedicated CI step and the default `npm test` command both include the gate.
