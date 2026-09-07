import assert from "node:assert/strict";
import test from "node:test";

import { createSessionProcessingReporter } from "../../apps/worker/dist/index.js";

function request(overrides = {}) {
  return {
    schemaVersion: "hed27-session-processing-request-v1",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    sessionId: "session-redacted-001",
    processingVersion: 1,
    sourceSnapshotRef: "evidence-bundle:session-redacted-001:v1",
    sourceSnapshotHash: "a".repeat(64),
    policyVersion: "hed21-policy-v1",
    requestedAt: "2026-09-07T11:00:00.000Z",
    ...overrides
  };
}

function progressInput(progressPercent, occurredAt, leaseExpiresAt) {
  return {
    progressPercent,
    leaseExpiresAt,
    costMicros: 12000,
    latencyMs: 4100,
    occurredAt
  };
}

function collectingPort(reports) {
  return {
    async submitSessionProcessingReport(report) {
      reports.push(report);
    }
  };
}

test("worker reporter binds every progress report to the claimed session job attempt", async () => {
  const reports = [];
  const reporter = createSessionProcessingReporter({
    request: request(),
    jobId: "job-session-redacted-001-v1",
    attempt: 2,
    archivePort: collectingPort(reports)
  });

  await reporter.progress(
    progressInput(25, "2026-09-07T11:01:00.000Z", "2026-09-07T11:06:00.000Z")
  );
  await reporter.progress(
    progressInput(70, "2026-09-07T11:02:00.000Z", "2026-09-07T11:07:00.000Z")
  );

  assert.equal(reports.length, 2);
  for (const report of reports) {
    assert.equal(report.workspaceId, "workspace-redacted-001");
    assert.equal(report.campaignId, "campaign-redacted-001");
    assert.equal(report.sessionId, "session-redacted-001");
    assert.equal(report.processingVersion, 1);
    assert.equal(report.jobId, "job-session-redacted-001-v1");
    assert.equal(report.attempt, 2);
  }
  assert.deepEqual(
    reports.map((report) => report.progressPercent),
    [25, 70]
  );

  await assert.rejects(
    reporter.progress(progressInput(69, "2026-09-07T11:03:00.000Z", "2026-09-07T11:08:00.000Z")),
    (error) => error.code === "SESSION_PROCESSING_PROGRESS_REGRESSION"
  );
  assert.equal(reports.length, 2, "regressing progress must not cross the archive port");
});

test("worker reporter closes after one successfully persisted terminal outcome", async () => {
  const reports = [];
  const reporter = createSessionProcessingReporter({
    request: request(),
    jobId: "job-session-redacted-001-v1",
    attempt: 1,
    archivePort: collectingPort(reports)
  });

  const ready = await reporter.reviewReady({
    reviewSetId: "review-session-redacted-001-v1",
    costMicros: 150000,
    latencyMs: 89000,
    occurredAt: "2026-09-07T11:04:00.000Z"
  });
  assert.equal(ready.outcome, "reviewReady");
  assert.equal(ready.progressPercent, 100);
  assert.equal(reports.length, 1);

  await assert.rejects(
    reporter.failed({
      progressPercent: 100,
      safeErrorCode: "LATE_FAILURE",
      costMicros: 150000,
      latencyMs: 90000,
      occurredAt: "2026-09-07T11:04:01.000Z"
    }),
    (error) => error.code === "SESSION_PROCESSING_ALREADY_TERMINAL"
  );
  assert.equal(reports.length, 1);
});

test("archive-port failure leaves reporter state retryable", async () => {
  const reports = [];
  let shouldFail = true;
  const reporter = createSessionProcessingReporter({
    request: request(),
    jobId: "job-session-redacted-001-v1",
    attempt: 1,
    archivePort: {
      async submitSessionProcessingReport(report) {
        if (shouldFail) throw new Error("archive unavailable");
        reports.push(report);
      }
    }
  });

  const input = progressInput(40, "2026-09-07T11:01:00.000Z", "2026-09-07T11:06:00.000Z");
  await assert.rejects(reporter.progress(input), /archive unavailable/);
  shouldFail = false;
  await reporter.progress(input);

  assert.equal(reports.length, 1);
  assert.equal(reports[0].progressPercent, 40);
});

test("worker reporter rejects raw or malformed processing input before any archive call", () => {
  let calls = 0;
  const archivePort = {
    async submitSessionProcessingReport() {
      calls += 1;
    }
  };

  assert.throws(() =>
    createSessionProcessingReporter({
      request: { ...request(), rawEvidence: "must-not-cross-worker-boundary" },
      jobId: "job-session-redacted-001-v1",
      attempt: 1,
      archivePort
    })
  );
  assert.equal(calls, 0);
});
