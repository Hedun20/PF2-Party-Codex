import { loadWorkerEnvironment, WORKER_RUNTIME } from "./index.js";

const environment = loadWorkerEnvironment(process.env);

console.log(
  JSON.stringify({
    schemaVersion: "hed16-runtime-v1",
    runtime: WORKER_RUNTIME,
    status: "scaffoldOnly",
    workerId: environment.workerId
  })
);
