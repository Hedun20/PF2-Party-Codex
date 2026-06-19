import chokidar from "chokidar";
import { config } from "../config.js";
import { rebuildVaultIndex } from "./vaultService.js";

export function startVaultWatcher() {
  const watcher = chokidar.watch(config.vaultDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 }
  });
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      rebuildVaultIndex().catch((error) => console.error("Vault rebuild failed:", error));
    }, 150);
  };
  watcher.on("add", schedule).on("change", schedule).on("unlink", schedule);
  return watcher;
}
