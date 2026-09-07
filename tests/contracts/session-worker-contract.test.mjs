import assert from "node:assert/strict";
import test from "node:test";

import {
  ContractValidationError,
  parseSessionProcessingReportContract,
  parseSessionProcessingRequestContract
} from "../../packages/contracts/dist/index.js";

const scope = {
  workspaceId: "workspace-redacted-001",
  campaignId: "campaign-redacted-001",
  sessionId: "session-redacted-001"
};

function request(overrides = {}) {
  return {
    schemaVersion: "hed27-session-processing-request-v1",
    ...scope,
    processingVersion: 1,
    sourceSnapshotRef: "evidence-bundle:session-redacted-001:v1",
    sourceSnapshotHash: "a".repeat(64),
    policyVersion: "hed21-policy-v1",
    requestedAt: "2026-09-07T11:00:00.000Z",
    ...overrides
  };
}

function report(outcome, overrides = {}) {
  const base = {
    schemaVersion: "hed27-session-processing-report-v1",
    ...scope,
    processingVersion: 1,
    jobId: "job-session-redacted-001-v1",
    attempt: 1,
    outcome,
    progressPercent: 35,
    leaseExpiresAt: "2026-09-07T11:05:00.000Z",
    reviewSetId: null,
    costMicros: 12000,
    latencyMs: 4100,
    safeErrorCode: null,
    occurredAt: "2026-09-07T11:01:00.000Z"
  };
  if (outcome === "reviewReady") {
    Object.assign(base, {
      progressPercent: 100,
      leaseExpiresAt: null,
      reviewSetId: "review-session-redacted-001-v1"
    });
  }
  if (outcome === "failed") {
    Object.assign(base, {
      leaseExpiresAt: null,
      safeErrorCode: "MODEL_TIMEOUT"
    });
  }
  return { ...base, ...overrides };
}

test("processing requests carry only exact scope and a hashed source snapshot reference", () => {
  const parsed = parseSessionProcessingRequestContract(request());
  assert.equal(parsed.processingVersion, 1);
  assert.equal(parsed.sourceSnapshotHash.length, 64);
  assert.equal(parsed.sourceSnapshotRef, "evidence-bundle:session-redacted-001:v1");

  assert.throws(
    () => parseSessionProcessingRequestContract({ ...request(), rawEvidence: "must not cross the job boundary" }),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingRequestContract(request({ sourceSnapshotHash: "ABC" })),
    ContractValidationError
  );
});

test("progress reports remain below completion and carry a future lease", () => {
  const parsed = parseSessionProcessingReportContract(report("progress"));
  assert.equal(parsed.outcome, "progress");
  assert.equal(parsed.progressPercent, 35);

  assert.throws(
    () => parseSessionProcessingReportContract(report("progress", { progressPercent: 100 })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract(report("progress", { leaseExpiresAt: null })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract(report("progress", { leaseExpiresAt: "2026-09-07T11:00:59.000Z" })),
    ContractValidationError
  );
});

test("reviewReady report is the only worker outcome that may create a review set", () => {
  const parsed = parseSessionProcessingReportContract(report("reviewReady"));
  assert.equal(parsed.progressPercent, 100);
  assert.equal(parsed.reviewSetId, "review-session-redacted-001-v1");

  assert.throws(
    () => parseSessionProcessingReportContract(report("reviewReady", { reviewSetId: null })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract(report("progress", { reviewSetId: "forbidden-review" })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract(report("failed", { reviewSetId: "forbidden-review" })),
    ContractValidationError
  );
});

test("failed report requires a safe bounded code and closes the lease", () => {
  const parsed = parseSessionProcessingReportContract(report("failed"));
  assert.equal(parsed.safeErrorCode, "MODEL_TIMEOUT");

  assert.throws(
    () => parseSessionProcessingReportContract(report("failed", { safeErrorCode: null })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract(report("failed", { leaseExpiresAt: "2026-09-07T11:05:00.000Z" })),
    ContractValidationError
  );
});

test("worker reports reject future versions, unknown fields and non-positive attempts structurally", () => {
  assert.throws(
    () => parseSessionProcessingReportContract(report("progress", { processingVersion: 0 })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract(report("progress", { attempt: 0 })),
    ContractValidationError
  );
  assert.throws(
    () => parseSessionProcessingReportContract({ ...report("progress"), providerToken: "secret" }),
    ContractValidationError
  );
});
