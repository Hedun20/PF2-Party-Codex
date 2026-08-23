import { parsePublicWebEnvironment } from "@pf2-party-codex/config/public";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NEXT_PUBLIC_APP_ORIGIN?: string;
    }
  }
}

export function getPublicEnvironment(): { readonly appOrigin: string } {
  return parsePublicWebEnvironment({
    NEXT_PUBLIC_APP_ORIGIN: process.env.NEXT_PUBLIC_APP_ORIGIN
  });
}
