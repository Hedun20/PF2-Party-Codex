import {
  parseSessionProcessingReportContract,
  parseSessionProcessingRequestContract,
  type SessionProcessingReportContract,
  type SessionProcessingRequestContract
} from "@pf2-party-codex/contracts";

export interface SessionProcessingArchivePort {
  readonly submitSessionProcessingReport: (
    report: SessionProcessingReportContract
  ) => Promise<void>;
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
  return report.workspaceId === request.workspaceId
    && report.campaignId === request.campaignId
    && report.sessionId === request.sessionId
    && report.processingVersion === request.processingVersion;
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
