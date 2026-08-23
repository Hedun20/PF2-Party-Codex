import { DISCORD_RUNTIME, loadDiscordBotEnvironment } from "./index.js";

loadDiscordBotEnvironment(process.env);

console.log(
  JSON.stringify({
    schemaVersion: "hed16-runtime-v1",
    runtime: DISCORD_RUNTIME,
    status: "scaffoldOnly"
  })
);
