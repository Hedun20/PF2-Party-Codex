import {
  parseSessionProcessingReportContract,
  parseSessionProcessingRequestContract,
  verifySessionProcessingSourceSnapshot,
  type SessionProcessingReportContract,
  type SessionProcessingRequestContract,
  type SessionProcessingSourceSnapshotContract
} from "@pf2-party-codex/contracts";

export interface SessionProcessingArchivePort {
  readonly submitSessionProcessingReport: (
    report: SessionProcessingReportContract
  ) => Promise<void>;
}

export interface SessionProcessingSourceSnapshotArchivePort {
  readonly readSessionProcessingSourceSnapshot: (input: {
    readonly workspaceId: string;
    readonly campaignId: string;
    readonly sessionId: string;
    readonly processingVersion: number;
    readonly sourceSnapshotRef: string;
    readonly sourceSnapshotHash: string;
  }) => Promise<unknown>;
}

export interface LoadSessionProcessingSourceSnapshotOptions {
  readonly request: unknown;
  readonly archivePort: SessionProcessingSourceSnapshotArchivePort;
  readonly sha256: (canonicalUtf8: string) => string;
}

export interface SessionProcessingReporterOptions {
  readonly request: unknown;
  readonly jobId: string;
  readonly attempt: number;
  readonly archivePort: SessionProcessingArchivePort;
}

export interface SessionProcessingProgressInput {
  readonly progressPercent: number;
  readonly leaseExpiresAt: string;
  readonly costMicros: number;
  readonly latencyMs: number;
  readonly occurredAt: string;
}

export interface SessionProcessingReviewReadyInput {
  readonly reviewSetId: string;
  readonly costMicros: number;
  readonly latencyMs: number;
  readonly occurredAt: string;
}

export interface SessionProcessingFailedInput {
  readonly progressPercent: number;
  readonly safeErrorCode: string;
  readonly costMicros: number;
  readonly latencyMs: number;
  readonly occurredAt: string;
}

export interface SessionProcessingReporter {
  readonly request: SessionProcessingRequestContract;
  readonly progress: (
    input: SessionProcessingProgressInput
  ) => Promise<SessionProcessingReportContract>;
  readonly reviewReady: (
    input: SessionProcessingReviewReadyInput
  ) => Promise<SessionProcessingReportContract>;
  readonly failed: (
    input: SessionProcessingFailedInput
  ) => Promise<SessionProcessingReportContract>;
}

type WorkerPortError = Error & { code: string };

function workerPortError(message: string, code: string): WorkerPortError {
  const error = new Error(message) as WorkerPortError;
  error.code = code;
  return error;
}

function sameScope(
  report: SessionProcessingReportContract,
  request: SessionProcessingRequestContract
): boolean {
  return (
    report.workspaceId === request.workspaceId &&
    report.campaignId === request.campaignId &&
    report.sessionId === request.sessionId &&
    report.processingVersion === request.processingVersion
  );
}

export async function loadVerifiedSessionProcessingSourceSnapshot(
  options: LoadSessionProcessingSourceSnapshotOptions
): Promise<SessionProcessingSourceSnapshotContract> {
  const request = parseSessionProcessingRequestContract(options.request);
  const snapshot = await options.archivePort.readSessionProcessingSourceSnapshot({
    workspaceId: request.workspaceId,
    campaignId: request.campaignId,
    sessionId: request.sessionId,
    processingVersion: request.processingVersion,
    sourceSnapshotRef: request.sourceSnapshotRef,
    sourceSnapshotHash: request.sourceSnapshotHash
  });
  return verifySessionProcessingSourceSnapshot(snapshot, {
    request,
    sha256: options.sha256
  });
}

export function createSessionProcessingReporter(
  options: SessionProcessingReporterOptions
): SessionProcessingReporter {
  const request = parseSessionProcessingRequestContract(options.request);
  let lastProgressPercent = 0;
  let terminalOutcome: "reviewReady" | "failed" | null = null;

  function ensureOpen(): void {
    if (terminalOutcome) {
      throw workerPortError(
        `Session processing already reached terminal outcome ${terminalOutcome}.`,
        "SESSION_PROCESSING_ALREADY_TERMINAL"
      );
    }
  }

  async function submit(candidate: unknown): Promise<SessionProcessingReportContract> {
    ensureOpen();
    const report = parseSessionProcessingReportContract(candidate);

    if (!sameScope(report, request)) {
      throw workerPortError(
        "Session processing report scope differs from the claimed processing request.",
        "SESSION_PROCESSING_SCOPE_MISMATCH"
      );
    }
    if (report.jobId !== options.jobId || report.attempt !== options.attempt) {
      throw workerPortError(
        "Session processing report does not belong to the active worker job attempt.",
        "SESSION_PROCESSING_ATTEMPT_MISMATCH"
      );
    }
    if (report.outcome === "progress" && report.progressPercent < lastProgressPercent) {
      throw workerPortError(
        "Session processing progress cannot move backward within one worker attempt.",
        "SESSION_PROCESSING_PROGRESS_REGRESSION"
      );
    }

    await options.archivePort.submitSessionProcessingReport(report);

    if (report.outcome === "progress") {
      lastProgressPercent = report.progressPercent;
    } else {
      terminalOutcome = report.outcome;
    }
    return report;
  }

  return {
    request,
    progress(input): Promise<SessionProcessingReportContract> {
      return submit({
        schemaVersion: "hed27-session-processing-report-v1",
        workspaceId: request.workspaceId,
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        processingVersion: request.processingVersion,
        jobId: options.jobId,
        attempt: options.attempt,
        outcome: "progress",
        progressPercent: input.progressPercent,
        leaseExpiresAt: input.leaseExpiresAt,
        reviewSetId: null,
        costMicros: input.costMicros,
        latencyMs: input.latencyMs,
        safeErrorCode: null,
        occurredAt: input.occurredAt
      });
    },
    reviewReady(input): Promise<SessionProcessingReportContract> {
      return submit({
        schemaVersion: "hed27-session-processing-report-v1",
        workspaceId: request.workspaceId,
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        processingVersion: request.processingVersion,
        jobId: options.jobId,
        attempt: options.attempt,
        outcome: "reviewReady",
        progressPercent: 100,
        leaseExpiresAt: null,
        reviewSetId: input.reviewSetId,
        costMicros: input.costMicros,
        latencyMs: input.latencyMs,
        safeErrorCode: null,
        occurredAt: input.occurredAt
      });
    },
    failed(input): Promise<SessionProcessingReportContract> {
      return submit({
        schemaVersion: "hed27-session-processing-report-v1",
        workspaceId: request.workspaceId,
        campaignId: request.campaignId,
        sessionId: request.sessionId,
        processingVersion: request.processingVersion,
        jobId: options.jobId,
        attempt: options.attempt,
        outcome: "failed",
        progressPercent: input.progressPercent,
        leaseExpiresAt: null,
        reviewSetId: null,
        costMicros: input.costMicros,
        latencyMs: input.latencyMs,
        safeErrorCode: input.safeErrorCode,
        occurredAt: input.occurredAt
      });
    }
  };
}
