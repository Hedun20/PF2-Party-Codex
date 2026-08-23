import "server-only";

import {
  parseWebServerEnvironment,
  type WebServerEnvironment
} from "@pf2-party-codex/config/server";

export function getWebServerEnvironment(): WebServerEnvironment {
  return parseWebServerEnvironment(process.env);
}
