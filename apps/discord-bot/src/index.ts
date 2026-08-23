import {
  parseDiscordBotEnvironment,
  type DiscordBotEnvironment
} from "@pf2-party-codex/config/server";
import { parseCampaignId, type CampaignId } from "@pf2-party-codex/contracts";

export const DISCORD_RUNTIME = "discord-bot" as const;

export interface DiscordBoundaryProbe {
  readonly runtime: typeof DISCORD_RUNTIME;
  readonly campaignId: CampaignId;
  readonly mongoAccess: "none";
}

export function loadDiscordBotEnvironment(
  source: Readonly<Record<string, string | undefined>>
): DiscordBotEnvironment {
  return parseDiscordBotEnvironment(source);
}

export function createDiscordBoundaryProbe(campaignId: unknown): DiscordBoundaryProbe {
  return {
    runtime: DISCORD_RUNTIME,
    campaignId: parseCampaignId(campaignId),
    mongoAccess: "none"
  };
}
