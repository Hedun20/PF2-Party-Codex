import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  canonicalizeJobRequest,
  computeJobRequestHash,
  ContractValidationError,
  parseJobCommandRequest,
  parseJobExecutionReport
} from "../../packages/contracts/dist/index.js";

const payloadHash = "a".repeat(64);
const outputHash = "b".repeat(64);
const leaseTokenHash = "c".repeat(64);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function campaignScope(overrides = {}) {
  return {
    kind: "campaign",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    ...overrides
  };
}

function jobRequestHashInput(value) {
  return {
    schemaVersion: value.schemaVersion,
    jobId: value.jobId,
    jobType: value.jobType,
    producer: value.producer,
    scope: value.scope,
    payloadRef: value.payloadRef,
    payloadHash: value.payloadHash,
    idempotencyKey: value.idempotencyKey,
    policyVersion: value.policyVersion,
    retryPolicyVersion: value.retryPolicyVersion,
    enqueuedAt: value.enqueuedAt,
    notBefore: value.notBefore,
    traceId: value.traceId,
    causationId: value.causationId
  };
}

const baseCommandInput = {
  schemaVersion: "hed18-job-v1",
  jobId: "job-redacted-001",
  jobType: "evidence.normalize",
  producer: "foundryApi",
  scope: campaignScope(),
  payloadRef: "job-payloads/job-redacted-001",
  payloadHash,
  idempotencyKey: "connection-redacted:event-redacted:v1",
  policyVersion: "campaign-policy-v1",
  retryPolicyVersion: "evidence-normalize-retry-v1",
  enqueuedAt: "2026-08-23T16:00:00.000Z",
  notBefore: "2026-08-23T16:00:00.000Z",
  traceId: "trace-redacted-001",
  causationId: null
};
const baseRequestHash = computeJobRequestHash(baseCommandInput, sha256);

function command(overrides = {}) {
  const candidate = { ...baseCommandInput, ...overrides };
  let requestHash = baseRequestHash;
  if (!Object.hasOwn(overrides, "requestHash")) {
    try {
      requestHash = computeJobRequestHash(jobRequestHashInput(candidate), sha256);
    } catch {
      // Invalid candidates still reach the runtime parser under test.
    }
  }
  return {
    ...candidate,
    requestHash: Object.hasOwn(overrides, "requestHash") ? overrides.requestHash : requestHash
  };
}

function commandVerification(overrides = {}) {
  return {
    producer: "foundryApi",
    evaluatedAt: "2026-08-23T16:00:00.500Z",
    sha256,
    ...overrides
  };
}

function executionVerification(overrides = {}) {
  return {
    command: command(),
    producer: "foundryApi",
    activeLease: activeLease(),
    evaluatedAt: "2026-08-23T16:00:02.500Z",
    sha256,
    ...overrides
  };
}

function activeLease(overrides = {}) {
  return {
    schemaVersion: "hed18-job-lease-v1",
    jobId: "job-redacted-001",
    workerId: "worker-redacted-001",
    leaseVersion: 3,
    leaseTokenHash,
    attempt: 1,
    claimedAt: "2026-08-23T16:00:00.750Z",
    expiresAt: "2026-08-23T16:00:10.000Z",
    ...overrides
  };
}

function report(overrides = {}) {
  return {
    schemaVersion: "hed18-job-report-v1",
    jobId: "job-redacted-001",
    jobType: "evidence.normalize",
    scope: campaignScope(),
    payloadHash,
    workerId: "worker-redacted-001",
    leaseVersion: 3,
    leaseTokenHash,
    attempt: 1,
    outcome: "succeeded",
    startedAt: "2026-08-23T16:00:01.000Z",
    completedAt: "2026-08-23T16:00:02.000Z",
    outputRef: "evidence-records/evidence-redacted-001",
    outputHash,
    safeErrorCode: null,
    retryAt: null,
    idempotentReplay: false,
    ...overrides
  };
}

test("campaign jobs carry exact tenant, payload digest and idempotency context", () => {
  const parsed = parseJobCommandRequest(command(), commandVerification());
  assert.equal(parsed.scope.kind, "campaign");
  assert.equal(parsed.scope.campaignId, "campaign-redacted-001");
  assert.equal(parsed.payloadHash, payloadHash);
  assert.equal(parsed.idempotencyKey, "connection-redacted:event-redacted:v1");
  assert.equal(parsed.requestHash, baseRequestHash);
});

test("job request hashes canonically bind every replay-relevant field", () => {
  const original = command();
  const reorderedScope = {
    campaignId: "campaign-redacted-001",
    workspaceId: "workspace-redacted-001",
    kind: "campaign"
  };
  const reordered = { ...jobRequestHashInput(original), scope: reorderedScope };
  assert.equal(canonicalizeJobRequest(reordered), canonicalizeJobRequest(jobRequestHashInput(original)));
  assert.equal(computeJobRequestHash(reordered, sha256), original.requestHash);

  const replayMetadata = command({
    jobId: "job-redacted-002",
    traceId: "trace-redacted-002"
  });
  assert.equal(replayMetadata.requestHash, original.requestHash);

  for (const changed of [
    command({ policyVersion: "campaign-policy-v2" }),
    command({ retryPolicyVersion: "evidence-normalize-retry-v2" }),
    command({ notBefore: "2026-08-23T16:00:01.000Z" }),
    command({ payloadRef: "job-payloads/job-redacted-002" }),
    command({ causationId: "job-redacted-parent-001" })
  ]) {
    assert.notEqual(changed.requestHash, original.requestHash);
  }
});

test("job commands reject stale or untrusted canonical request hashes", () => {
  const original = command();
  for (const candidate of [
    { ...original, policyVersion: "campaign-policy-v2" },
    { ...original, retryPolicyVersion: "evidence-normalize-retry-v2" },
    { ...original, notBefore: "2026-08-23T16:00:01.000Z" },
    { ...original, requestHash: "not-a-hash" }
  ]) {
    assert.throws(
      () => parseJobCommandRequest(candidate, commandVerification()),
      ContractValidationError
    );
  }
  assert.throws(
    () => parseJobCommandRequest(original, commandVerification({ sha256: () => "d".repeat(64) })),
    ContractValidationError
  );
});

test("only account email delivery may omit campaign scope", () => {
  const accountEmail = parseJobCommandRequest(command({
    jobType: "email.deliver",
    producer: "web",
    scope: { kind: "account", userId: "user-redacted-001" },
    policyVersion: "account-policy-v1"
  }), commandVerification({ producer: "web" }));
  assert.equal(accountEmail.scope.kind, "account");

  for (const jobType of ["evidence.normalize", "ai.author", "notification.deliver", "export.build"]) {
    assert.throws(
      () => parseJobCommandRequest(command({
        jobType,
        scope: { kind: "account", userId: "user-redacted-001" }
      }), commandVerification()),
      ContractValidationError
    );
  }
});

test("job commands reject raw payloads, secrets, ambiguous time and unbounded retry claims", () => {
  for (const candidate of [
    { ...command(), payload: { raw: "must remain behind payloadRef" } },
    { ...command(), credential: "must-not-enter-queue" },
    command({ payloadHash: "not-a-hash" }),
    command({ enqueuedAt: "0" }),
    command({ enqueuedAt: "2026-08-23T16:00:00.501Z", notBefore: "2026-08-23T16:00:00.501Z" }),
    command({ notBefore: "2026-08-23T15:59:59.999Z" }),
    command({ producer: "web" }),
    command({ payloadRef: "https://private.example.invalid/payload?token=secret" }),
    command({ payloadRef: "job-payloads/../private" }),
    command({ idempotencyKey: "x".repeat(257) }),
    command({ idempotencyKey: "connection-redacted\nforged-log-line" }),
    command({ maxAttempts: 999 })
  ]) {
    assert.throws(
      () => parseJobCommandRequest(candidate, commandVerification()),
      ContractValidationError
    );
  }
});

test("successful and replayed reports expose references and hashes, never payloads", () => {
  assert.equal(parseJobExecutionReport(report(), executionVerification()).outcome, "succeeded");
  assert.equal(parseJobExecutionReport(report({
    outcome: "idempotentReplay",
    idempotentReplay: true
  }), executionVerification()).idempotentReplay, true);
  assert.throws(
    () => parseJobExecutionReport(
      { ...report(), output: { private: "forbidden" } },
      executionVerification()
    ),
    ContractValidationError
  );
});

test("execution reports bind to the leased job identity, scope, payload and schedule", () => {
  for (const candidate of [
    report({ jobId: "job-redacted-002" }),
    report({ jobType: "canon.propose" }),
    report({ scope: campaignScope({ campaignId: "campaign-redacted-002" }) }),
    report({ payloadHash: "c".repeat(64) }),
    report({ workerId: "worker-redacted-002" }),
    report({ leaseVersion: 2 }),
    report({ leaseTokenHash: "d".repeat(64) }),
    report({ attempt: 2 }),
    report({ startedAt: "2026-08-23T15:59:59.999Z", completedAt: "2026-08-23T16:00:02.000Z" }),
    report({ startedAt: "2026-08-23T16:00:00.500Z", completedAt: "2026-08-23T16:00:02.000Z" }),
    report({ completedAt: "2026-08-23T16:00:02.501Z" })
  ]) {
    assert.throws(
      () => parseJobExecutionReport(candidate, executionVerification()),
      ContractValidationError
    );
  }

  for (const verification of [
    executionVerification({ activeLease: activeLease({ jobId: "job-redacted-002" }) }),
    executionVerification({ activeLease: activeLease({ workerId: "worker-redacted-002" }) }),
    executionVerification({ activeLease: activeLease({ leaseVersion: 4, attempt: 2 }) }),
    executionVerification({ activeLease: activeLease({ leaseTokenHash: "d".repeat(64) }) }),
    executionVerification({ activeLease: activeLease({ claimedAt: "2026-08-23T16:00:03.000Z" }) }),
    executionVerification({ activeLease: activeLease({ expiresAt: "2026-08-23T16:00:02.500Z" }) })
  ]) {
    assert.throws(
      () => parseJobExecutionReport(report(), verification),
      ContractValidationError
    );
  }
});

test("retry reports require a future retry time and safe error code", () => {
  const retry = parseJobExecutionReport(report({
    outcome: "retryScheduled",
    outputRef: null,
    outputHash: null,
    safeErrorCode: "PROVIDER_TIMEOUT",
    retryAt: "2026-08-23T16:05:00.000Z"
  }), executionVerification());
  assert.equal(retry.safeErrorCode, "PROVIDER_TIMEOUT");

  for (const candidate of [
    report({ outcome: "retryScheduled", outputRef: null, outputHash: null }),
    report({
      outcome: "retryScheduled",
      outputRef: null,
      outputHash: null,
      safeErrorCode: "provider leaked detail",
      retryAt: "2026-08-23T16:05:00.000Z"
    }),
    report({
      outcome: "retryScheduled",
      outputRef: null,
      outputHash: null,
      safeErrorCode: "PROVIDER_TIMEOUT",
      retryAt: "2026-08-23T16:00:01.999Z"
    }),
    report({
      outcome: "retryScheduled",
      outputRef: null,
      outputHash: null,
      safeErrorCode: "PROVIDER_TIMEOUT",
      retryAt: "2026-08-23T16:00:02.000Z"
    })
  ]) {
    assert.throws(
      () => parseJobExecutionReport(candidate, executionVerification()),
      ContractValidationError
    );
  }
});

test("terminal job reports have coherent time, output, error and replay state", () => {
  for (const candidate of [
    report({ completedAt: "2026-08-23T16:00:00.999Z" }),
    report({ outputHash: null }),
    report({ outputRef: "https://private.example.invalid/output" }),
    report({ outcome: "terminalFailure", outputRef: null, outputHash: null }),
    report({ outcome: "terminalFailure", safeErrorCode: "FAILED", outputHash: null }),
    report({ outcome: "succeeded", idempotentReplay: true }),
    report({ attempt: 0 }),
    report({ retryAt: "2026-08-23T16:05:00.000Z" })
  ]) {
    assert.throws(
      () => parseJobExecutionReport(candidate, executionVerification()),
      ContractValidationError
    );
  }
});
