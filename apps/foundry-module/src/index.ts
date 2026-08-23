import {
  parseFoundryPublicConfig,
  type FoundryPublicConfig,
  type FoundryPublicConfigInput
} from "@pf2-party-codex/config/foundry";
import { parseCampaignId, type CampaignId } from "@pf2-party-codex/contracts";

export const FOUNDRY_RUNTIME = "foundry-module" as const;

export interface FoundryBoundaryProbe {
  readonly runtime: typeof FOUNDRY_RUNTIME;
  readonly campaignId: CampaignId;
  readonly mongoAccess: "none";
  readonly config: FoundryPublicConfig;
}

export function createFoundryBoundaryProbe(
  campaignId: unknown,
  config: FoundryPublicConfigInput
): FoundryBoundaryProbe {
  return {
    runtime: FOUNDRY_RUNTIME,
    campaignId: parseCampaignId(campaignId),
    mongoAccess: "none",
    config: parseFoundryPublicConfig(config)
  };
}
