import assert from "node:assert/strict";
import test from "node:test";

import {
  ContractValidationError,
  parseSessionAudioUploadContract,
  parseSessionIngestionPolicyContract,
  parseSessionTranscriptEvidenceContract
} from "../../packages/contracts/dist/index.js";
import { evaluateSessionIngestionExposure } from "../../packages/core/dist/index.js";

const scope = {
  workspaceId: "workspace-redacted-001",
  campaignId: "campaign-redacted-001",
  sessionId: "session-redacted-001"
};
const managerId = "user-redacted-manager-001";

function source(kind, overrides = {}) {
  const explicit = kind !== "manualNote";
  const providerConnection = explicit ? `connection-redacted-${kind}` : null;
  const retentionClass = kind === "audioUpload"
    ? "rawAudioEphemeral"
    : kind === "pastedTranscript"
      ? "transcriptEvidence30d"
      : "rawEvidence30d";
  return {
    sourceId: `source-${kind}-001`,
    kind,
    connectionId: providerConnection,
    stream: `${kind}.session`,
    state: "active",
    consentState: explicit ? "granted" : "notRequired",
    consentNoticeVersion: explicit ? "alpha-consent-v1" : null,
    consentedByUserId: explicit ? managerId : null,
    visibility: kind === "discord" ? "participantScoped" : "restricted",
    retentionClass,
    startedAt: "2026-09-07T10:00:00.000Z",
    endedAt: null,
    rawEvidenceExpiresAt: null,
    revokedAt: null,
    deletedAt: null,
    ...overrides
  };
}

function policy(overrides = {}) {
  return {
    schemaVersion: "hed26-session-ingestion-policy-v1",
    ...scope,
    consentNoticeVersion: "alpha-consent-v1",
    rawEvidenceRetentionDays: 30,
    rawAudioDeleteAfterTranscriptHours: 24,
    rawAudioFailureDeleteAfterHours: 168,
    approvedCanonPersistsAfterRawExpiry: true,
    sources: [
      source("foundry"),
      source("discord", {
        state: "ended",
        endedAt: "2026-09-07T12:00:00.000Z",
        rawEvidenceExpiresAt: "2026-10-07T12:00:00.000Z"
      }),
      source("manualNote", {
        state: "ended",
        endedAt: "2026-09-07T12:00:00.000Z",
        rawEvidenceExpiresAt: "2026-09-21T12:00:00.000Z"
      }),
      source("pastedTranscript"),
      source("audioUpload")
    ],
    createdAt: "2026-09-07T09:59:00.000Z",
    updatedAt: "2026-09-07T12:00:00.000Z",
    ...overrides
  };
}

function audio(overrides = {}) {
  return {
    schemaVersion: "hed26-session-audio-upload-v1",
    ...scope,
    sourceId: "source-audioUpload-001",
    uploaderUserId: managerId,
    consentNoticeVersion: "alpha-consent-v1",
    consentAcceptedAt: "2026-09-07T09:59:30.000Z",
    filename: "session-42.webm",
    mediaType: "audio/webm",
    sizeBytes: 42 * 1024 * 1024,
    durationMs: 3_600_000,
    sha256: "a".repeat(64),
    malwareScanStatus: "clean",
    malwareScannerVersion: "scanner-v1",
    malwareScannedAt: "2026-09-07T10:01:00.000Z",
    uploadedAt: "2026-09-07T10:00:00.000Z",
    ...overrides
  };
}

function segment(id, startMs, endMs, overrides = {}) {
  return {
    segmentId: id,
    startMs,
    endMs,
    text: `Transcript segment ${id}`,
    suggestedSpeakerId: `speaker-suggested-${id}`,
    suggestedSpeakerLabel: `Speaker ${id}`,
    correctedSpeakerId: null,
    correctedByUserId: null,
    correctedAt: null,
    ...overrides
  };
}

function transcript(overrides = {}) {
  return {
    schemaVersion: "hed26-session-transcript-evidence-v1",
    ...scope,
    sourceId: "source-audioUpload-001",
    sourceAudioSha256: "a".repeat(64),
    transcriptionProviderVersion: "transcriber-v1",
    segments: [
      segment("001", 0, 15_000),
      segment("002", 15_000, 32_000, {
        correctedSpeakerId: "character-redacted-001",
        correctedByUserId: managerId,
        correctedAt: "2026-09-07T11:05:00.000Z"
      })
    ],
    transcribedAt: "2026-09-07T11:00:00.000Z",
    rawAudioDeleteAt: "2026-09-08T10:59:59.000Z",
    ...overrides
  };
}

test("unified ingestion policy freezes alpha sources, consent and retention defaults", () => {
  const parsed = parseSessionIngestionPolicyContract(policy());
  assert.equal(parsed.rawEvidenceRetentionDays, 30);
  assert.equal(parsed.rawAudioDeleteAfterTranscriptHours, 24);
  assert.equal(parsed.rawAudioFailureDeleteAfterHours, 168);
  assert.equal(parsed.approvedCanonPersistsAfterRawExpiry, true);
  assert.deepEqual(parsed.sources.map((item) => item.kind), [
    "foundry",
    "discord",
    "manualNote",
    "pastedTranscript",
    "audioUpload"
  ]);
});

test("integration and upload sources cannot ingest without current explicit consent", () => {
  for (const kind of ["foundry", "discord", "pastedTranscript", "audioUpload"]) {
    assert.throws(
      () => parseSessionIngestionPolicyContract(policy({
        sources: [source(kind, { consentState: "pending", consentedByUserId: null })]
      })),
      ContractValidationError,
      `${kind} should require effective consent before becoming active`
    );
  }

  assert.throws(
    () => parseSessionIngestionPolicyContract(policy({
      sources: [source("discord", { consentNoticeVersion: "stale-notice-v0" })]
    })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionIngestionPolicyContract(policy({
      sources: [source("manualNote", { connectionId: "connection-forbidden" })]
    })),
    ContractValidationError
  );
});

test("revoked and ended sources fail closed on lifecycle and raw-evidence expiry", () => {
  assert.throws(
    () => parseSessionIngestionPolicyContract(policy({
      sources: [source("discord", { consentState: "revoked", state: "active" })]
    })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionIngestionPolicyContract(policy({
      sources: [source("foundry", {
        state: "ended",
        endedAt: "2026-09-07T12:00:00.000Z",
        rawEvidenceExpiresAt: null
      })]
    })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionIngestionPolicyContract(policy({
      sources: [source("foundry", {
        state: "ended",
        endedAt: "2026-09-07T12:00:00.000Z",
        rawEvidenceExpiresAt: "2026-10-08T12:00:00.000Z"
      })]
    })),
    ContractValidationError
  );
});

test("audio upload is explicit, bounded and malware-clean before transcription", () => {
  const parsed = parseSessionAudioUploadContract(audio());
  assert.equal(parsed.mediaType, "audio/webm");
  assert.equal(parsed.malwareScanStatus, "clean");

  for (const invalid of [
    audio({ sizeBytes: 501 * 1024 * 1024 }),
    audio({ durationMs: 4 * 60 * 60 * 1000 + 1 }),
    audio({ mediaType: "video/mp4" }),
    audio({ malwareScanStatus: "pending" }),
    audio({ filename: "../secret.webm" }),
    audio({ providerToken: "must-not-cross" })
  ]) {
    assert.throws(() => parseSessionAudioUploadContract(invalid), ContractValidationError);
  }
});

test("transcript preserves ordered timestamps, suggested speakers and accountable corrections", () => {
  const parsed = parseSessionTranscriptEvidenceContract(transcript());
  assert.equal(parsed.segments[0].startMs, 0);
  assert.equal(parsed.segments[1].correctedSpeakerId, "character-redacted-001");
  assert.equal(parsed.rawAudioDeleteAt, "2026-09-08T10:59:59.000Z");

  assert.throws(
    () => parseSessionTranscriptEvidenceContract(transcript({
      segments: [segment("001", 0, 15_000), segment("002", 14_000, 20_000)]
    })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionTranscriptEvidenceContract(transcript({
      segments: [segment("001", 0, 15_000, { correctedSpeakerId: "character-redacted-001" })]
    })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionTranscriptEvidenceContract(transcript({
      rawAudioDeleteAt: "2026-09-08T11:00:01.000Z"
    })),
    ContractValidationError
  );
});

test("privacy policy never exposes raw evidence to players, shared cache or analytics", () => {
  for (const destination of ["playerProjection", "cache", "analytics"]) {
    const decision = evaluateSessionIngestionExposure({
      dataClass: "rawEvidence",
      visibility: "restricted",
      destination,
      projection: "policyFiltered"
    });
    assert.equal(decision.allowed, false);
  }

  assert.deepEqual(
    evaluateSessionIngestionExposure({
      dataClass: "rawEvidence",
      visibility: "managerOnly",
      destination: "modelContext",
      projection: "policyFiltered"
    }),
    {
      allowed: false,
      code: "MANAGER_ONLY_MODEL_DENIED",
      policyVersion: "hed26-ingestion-privacy-v1"
    }
  );

  assert.equal(evaluateSessionIngestionExposure({
    dataClass: "transcriptEvidence",
    visibility: "participantScoped",
    destination: "modelContext",
    projection: "policyFiltered"
  }).allowed, true);
});

test("raw audio is restricted to scanning/transcription and approved canon uses explicit projections", () => {
  assert.equal(evaluateSessionIngestionExposure({
    dataClass: "rawAudio",
    visibility: "restricted",
    destination: "transcriptionProvider",
    projection: "raw"
  }).allowed, true);
  assert.equal(evaluateSessionIngestionExposure({
    dataClass: "rawAudio",
    visibility: "restricted",
    destination: "managerReview",
    projection: "raw"
  }).allowed, false);

  assert.equal(evaluateSessionIngestionExposure({
    dataClass: "approvedCanon",
    visibility: "public",
    destination: "playerProjection",
    projection: "approvedProjection"
  }).allowed, true);
  assert.equal(evaluateSessionIngestionExposure({
    dataClass: "approvedCanon",
    visibility: "restricted",
    destination: "playerProjection",
    projection: "approvedProjection"
  }).allowed, false);
});
