import { parsePublicOrigin, requireEnvironmentValue, type EnvironmentSource } from "./shared.js";

export interface PublicWebEnvironment {
  readonly appOrigin: string;
}

export function parsePublicWebEnvironment(source: EnvironmentSource): PublicWebEnvironment {
  return {
    appOrigin: parsePublicOrigin(
      requireEnvironmentValue(source, "NEXT_PUBLIC_APP_ORIGIN"),
      "NEXT_PUBLIC_APP_ORIGIN"
    )
  };
}
