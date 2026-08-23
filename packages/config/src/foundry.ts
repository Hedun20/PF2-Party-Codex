import { parsePublicOrigin, parseStableEnvironmentId } from "./shared.js";

export interface FoundryPublicConfigInput {
  readonly connectorApiOrigin: string;
  readonly systemId: string;
}

export interface FoundryPublicConfig {
  readonly connectorApiOrigin: string;
  readonly systemId: string;
}

export function parseFoundryPublicConfig(input: FoundryPublicConfigInput): FoundryPublicConfig {
  return {
    connectorApiOrigin: parsePublicOrigin(input.connectorApiOrigin, "connectorApiOrigin"),
    systemId: parseStableEnvironmentId(input.systemId, "systemId")
  };
}
