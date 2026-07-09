import { execFileSync } from "node:child_process";
import os from "node:os";

const PORTS = [3050, 5173, 5174, 5175];

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
  } catch (error) {
    return error.stdout?.toString?.() || "";
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function windowsPidsForPort(port) {
  const output = run("cmd.exe", ["/c", `netstat -ano | findstr :${port}`]);
  return unique(output
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/).pop())
    .filter((pid) => /^\d+$/.test(pid) && pid !== "0"));
}

function unixPidsForPort(port) {
  const output = run("sh", ["-lc", `lsof -ti tcp:${port} 2>/dev/null || true`]);
  return unique(output.split(/\s+/).filter((pid) => /^\d+$/.test(pid)));
}

function killPid(pid) {
  if (process.platform === "win32") {
    run("taskkill.exe", ["/PID", String(pid), "/F"]);
  } else {
    run("kill", ["-9", String(pid)]);
  }
}

console.log(`PF2 dev cleanup on ${os.platform()}: checking ports ${PORTS.join(", ")}...`);
let killed = 0;

for (const port of PORTS) {
  const pids = process.platform === "win32" ? windowsPidsForPort(port) : unixPidsForPort(port);
  if (!pids.length) {
    console.log(`port ${port}: free`);
    continue;
  }
  for (const pid of pids) {
    killPid(pid);
    killed += 1;
    console.log(`port ${port}: stopped PID ${pid}`);
  }
}

console.log(killed ? `Stopped ${killed} old dev process(es).` : "No old PF2 dev processes found.");
