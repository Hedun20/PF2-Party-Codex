import { securityCacheKey, signSecurityBatch } from "./security-assertions.mjs";

const ids = Object.freeze({
  workspaceA: "workspace-a",
  workspaceB: "workspace-b",
  campaignA: "campaign-a",
  campaignB: "campaign-b",
  playerA: "player-a",
  playerB: "player-b",
  guildA: "discord-guild-a",
  channelA: "discord-channel-a",
  foundryConnection: "foundry-connection-a"
});

const markers = Object.freeze({
  playerB: "PLAYER_B_PRIVATE_DOWNTIME_MARKER",
  gmOnly: "GM_ONLY_CROWN_LOCATION_MARKER",
  secretRoll: "SECRET_ROLL_TOTAL_27_MARKER",
  discord: "discord-provider-token-fixture",
  foundry: "foundry-connector-secret-fixture",
  prompt: "SYSTEM_OVERRIDE_EXFILTRATE_ARCHIVE_MARKER",
  analytics: "mongodb://fixture-user:fixture-password@db.internal/party-codex",
  achievement: "SECRET_ACHIEVEMENT_TITLE_MARKER"
});

function denied(id, waves, expectedCode, insecureEvidence = {}) {
  return {
    id,
    waves,
    assertion: "deniedBoundary",
    expectedCode,
    forbiddenValues: Object.values(markers),
    secure: { allowed: false, code: expectedCode },
    insecure: { allowed: true, code: "OK", ...insecureEvidence }
  };
}

export function createAdversarialFixtures() {
  const signingSecret = "fixture-signing-secret-never-log";
  const signedBatch = {
    batchId: "batch-1",
    connectionId: ids.foundryConnection,
    campaignId: ids.campaignA,
    sequence: 4,
    events: [{ type: "journal.proposed", entityId: "journal-1" }]
  };
  const cacheContext = {
    workspaceId: ids.workspaceA,
    campaignId: ids.campaignA,
    principalKind: "userSession",
    principalId: ids.playerA,
    policyVersion: "policy-v1"
  };

  return [
    denied("tenant.cross-workspace-campaign", ["W2", "W3", "W4"], "TENANT_MISMATCH", {
      workspaceId: ids.workspaceB,
      campaignId: ids.campaignB,
      gmContent: markers.gmOnly
    }),
    denied("membership.removed-player", ["W2", "W3", "W4"], "MEMBERSHIP_INACTIVE", {
      membershipStatus: "removed",
      campaignId: ids.campaignA
    }),
    {
      id: "knowledge.player-a-vs-player-b",
      waves: ["W3", "W4"],
      assertion: "scopedRecords",
      expected: { workspaceId: ids.workspaceA, campaignId: ids.campaignA, userId: ids.playerA },
      forbiddenValues: [markers.playerB],
      secure: {
        workspaceId: ids.workspaceA,
        campaignId: ids.campaignA,
        records: [{ id: "knowledge-a", workspaceId: ids.workspaceA, campaignId: ids.campaignA, allowedUserIds: [ids.playerA], visibility: "specificPlayers", summary: "Known clue" }]
      },
      insecure: {
        workspaceId: ids.workspaceA,
        campaignId: ids.campaignA,
        records: [{ id: "knowledge-b", workspaceId: ids.workspaceA, campaignId: ids.campaignA, allowedUserIds: [ids.playerB], visibility: "specificPlayers", summary: markers.playerB }]
      }
    },
    {
      id: "visibility.gm-only-source",
      waves: ["W2", "W3", "W4"],
      assertion: "scopedRecords",
      expected: { workspaceId: ids.workspaceA, campaignId: ids.campaignA, userId: ids.playerA },
      forbiddenValues: [markers.gmOnly],
      secure: { workspaceId: ids.workspaceA, campaignId: ids.campaignA, records: [] },
      insecure: {
        workspaceId: ids.workspaceA,
        campaignId: ids.campaignA,
        records: [{ id: "gm-source", workspaceId: ids.workspaceA, campaignId: ids.campaignA, allowedUserIds: [ids.playerA], visibility: "gmOnly", summary: markers.gmOnly }]
      }
    },
    {
      id: "roll.blind-secret",
      waves: ["W2", "W3"],
      assertion: "hiddenEnvelope",
      expected: { visibility: "secret" },
      forbiddenKeys: ["formula", "total", "breakdown", "secretResult"],
      forbiddenValues: [markers.secretRoll],
      secure: { rollId: "roll-1", visibility: "secret", status: "recorded" },
      insecure: { rollId: "roll-1", visibility: "secret", status: "recorded", formula: "1d20+9", total: 27, secretResult: markers.secretRoll }
    },
    denied("discord.guild-channel-spoof", ["W2"], "DISCORD_BINDING_MISMATCH", {
      campaignId: ids.campaignB,
      guildId: "spoofed-guild",
      channelId: "spoofed-channel",
      accessToken: markers.discord
    }),
    denied("foundry.connection-replay", ["W2"], "CONNECTOR_REPLAYED", {
      campaignId: ids.campaignA,
      connectionId: ids.foundryConnection,
      nonce: "already-consumed",
      connectorSecret: markers.foundry
    }),
    {
      id: "connector.signed-batch-tampering",
      waves: ["W2"],
      assertion: "signedBatch",
      signingSecret,
      expected: { campaignId: ids.campaignA, connectionId: ids.foundryConnection },
      forbiddenValues: [signingSecret, markers.foundry],
      secure: { batch: signedBatch, signature: signSecurityBatch(signedBatch, signingSecret) },
      insecure: {
        batch: { ...signedBatch, campaignId: ids.campaignB, events: [{ type: "journal.committed", entityId: "secret-journal" }] },
        signature: signSecurityBatch(signedBatch, signingSecret)
      }
    },
    {
      id: "jobs.retry-idempotency",
      waves: ["W2", "W4"],
      assertion: "idempotentJob",
      forbiddenValues: [markers.foundry],
      secure: {
        attempts: [{ jobId: "job-1", attempt: 1 }, { jobId: "job-1", attempt: 2 }],
        sideEffects: [{ idempotencyKey: "job-1:deliver", resultId: "delivery-1" }]
      },
      insecure: {
        attempts: [{ jobId: "job-1", attempt: 1 }, { jobId: "job-1", attempt: 2 }],
        sideEffects: [
          { idempotencyKey: "job-1:deliver", resultId: "delivery-1" },
          { idempotencyKey: "job-1:deliver", resultId: "delivery-2", connectorSecret: markers.foundry }
        ]
      }
    },
    {
      id: "cache.tenant-principal-key",
      waves: ["W2", "W3", "W4"],
      assertion: "tenantCacheKey",
      expected: cacheContext,
      forbiddenValues: [],
      secure: { key: securityCacheKey(cacheContext) },
      insecure: { key: `${ids.workspaceA}|archive|policy-v1` }
    },
    {
      id: "notifications.deep-link-scope",
      waves: ["W3", "W4"],
      assertion: "campaignDeepLink",
      expected: { campaignId: ids.campaignA },
      forbiddenValues: [],
      secure: { url: `/campaigns/${ids.campaignA}/archive/entry-1` },
      insecure: { url: `/campaigns/${ids.campaignA}/../${ids.campaignB}/archive/entry-1` }
    },
    {
      id: "ai.prompt-injection",
      waves: ["W4"],
      assertion: "promptIsolation",
      forbiddenValues: [markers.prompt, markers.gmOnly],
      secure: {
        trustedInstructionsOnly: true,
        untrustedInstructionsExecuted: false,
        writeAuthorized: false,
        output: { answer: "The player-safe evidence does not answer that question." }
      },
      insecure: {
        trustedInstructionsOnly: false,
        untrustedInstructionsExecuted: true,
        writeAuthorized: true,
        prompt: markers.prompt,
        output: { answer: markers.gmOnly }
      }
    },
    {
      id: "analytics.metadata-redaction",
      waves: ["W3", "W4"],
      assertion: "safeMetadata",
      forbiddenKeys: ["entryTitle", "achievementTitle", "rawQuery", "content"],
      forbiddenValues: [markers.analytics, markers.gmOnly, markers.achievement],
      metadataFieldRules: {
        event: { kind: "enum", values: ["archive.read"] },
        campaignBucket: { kind: "hmacSha256" },
        outcome: { kind: "enum", values: ["allowed", "denied", "error"] },
        durationMs: { kind: "boundedInteger", min: 0, max: 120_000 }
      },
      maxSerializedLength: 500,
      secure: {
        event: "archive.read",
        campaignBucket: "hmac-sha256:4f5c2a1e0d9b8c7a6f5e4d3c2b1a0099887766554433221100ffeeddccbbaa99",
        outcome: "allowed",
        durationMs: 21
      },
      insecure: {
        event: "archive.read",
        campaignBucket: "hmac-sha256:4f5c2a1e0d9b8c7a6f5e4d3c2b1a0099887766554433221100ffeeddccbbaa99",
        outcome: "allowed",
        durationMs: 21,
        playerName: "private name"
      }
    },
    denied("export.campaign-scope", ["W4"], "EXPORT_SCOPE_DENIED", {
      campaignId: ids.campaignB,
      gmContent: markers.gmOnly
    }),
    denied("delete.campaign-scope", ["W4"], "DELETE_SCOPE_DENIED", {
      campaignId: ids.campaignB,
      privateNotes: markers.playerB
    }),
    {
      id: "achievements.title-leakage",
      waves: ["W3", "W4"],
      assertion: "hiddenEnvelope",
      expected: { visibility: "hidden" },
      forbiddenKeys: ["title", "description", "criteria"],
      forbiddenValues: [markers.achievement],
      secure: { achievementId: "achievement-1", visibility: "hidden", status: "locked" },
      insecure: { achievementId: "achievement-1", visibility: "hidden", status: "locked", title: markers.achievement }
    }
  ];
}
