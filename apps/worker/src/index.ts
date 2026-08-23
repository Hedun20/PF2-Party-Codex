import { parseWorkerEnvironment, type WorkerEnvironment } from "@pf2-party-codex/config/server";
import { parseCampaignId, type CampaignId } from "@pf2-party-codex/contracts";
import { evaluatePlayerArchiveRead } from "@pf2-party-codex/core";

export const WORKER_RUNTIME = "worker" as const;

export interface WorkerBoundaryProbe {
  readonly runtime: typeof WORKER_RUNTIME;
  readonly campaignId: CampaignId;
  readonly policyPortAvailable: true;
}

export function loadWorkerEnvironment(
  source: Readonly<Record<string, string | undefined>>
): WorkerEnvironment {
  return parseWorkerEnvironment(source);
}

export function createWorkerBoundaryProbe(campaignId: unknown): WorkerBoundaryProbe {
  evaluatePlayerArchiveRead({ status: "active", visibility: "public" });
  return {
    runtime: WORKER_RUNTIME,
    campaignId: parseCampaignId(campaignId),
    policyPortAvailable: true
  };
}
