import path from "path";
import { fileURLToPath } from "url";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { closeMongo, connectMongo } from "./db/mongo.js";
import { ensureCodexIndexes } from "./repositories/entriesRepository.js";
import { ensureIdentityIndexes } from "./repositories/identityRepository.js";
import { ensureInvitationIndexes } from "./repositories/invitationsRepository.js";
import { ensureWorldSystemIndexes } from "./repositories/worldSystemsRepository.js";
import { startVaultWatcher } from "./services/fileWatchService.js";
import { rebuildVaultIndex } from "./services/vaultService.js";
import { logger } from "./utils/logger.js";
import { localIpv4Addresses } from "./utils/network.js";

export async function initializeRuntime() {
  const databaseStatus = await connectMongo();
  await ensureIdentityIndexes();
  await ensureInvitationIndexes();
  await ensureCodexIndexes();
  await ensureWorldSystemIndexes();
  if (!databaseStatus.connected) {
    await rebuildVaultIndex();
    startVaultWatcher();
  } else {
    logger.info("MongoDB is the active content source. Markdown remains available only for explicit import/export compatibility.");
  }
  return databaseStatus;
}

function listen(app, port, host) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host);
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve(server);
    };
    server.once("error", onError);
    server.once("listening", onListening);
  });
}

export async function startServer({ port = config.port, host = config.host } = {}) {
  const databaseStatus = await initializeRuntime();
  const app = createApp();
  const server = await listen(app, port, host);
  logger.info(`Party Codex running at http://localhost:${port}`);
  for (const ip of localIpv4Addresses()) logger.info(`LAN URL: http://${ip}:${port}`);
  server.on("error", (error) => logger.error("HTTP server error", { error: error.message || String(error) }));
  return { app, server, databaseStatus };
}

export function installShutdownHandlers(server) {
  let shuttingDown = false;
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, async () => {
      if (shuttingDown) return;
      shuttingDown = true;
      await closeMongo();
      server.close(() => process.exit(0));
    });
  }
}

function isDirectRun() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

if (isDirectRun()) {
  startServer()
    .then(({ server }) => installShutdownHandlers(server))
    .catch((error) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${config.port} is already in use. Stop the existing Party Codex server or set PORT to another value.`);
      } else {
        logger.error("Party Codex failed to start", { error: error.message || String(error) });
      }
      process.exit(1);
    });
}
