import { connectMongo, closeMongo } from "../src/db/mongo.js";
import { rollbackVaultImport } from "../src/services/vaultImportService.js";

async function main() {
  const importJobId = process.argv[2];
  if (!importJobId) throw new Error("Usage: npm run vault:rollback --workspace apps/server -- <importJobId>");
  const status = await connectMongo();
  if (!status.connected) throw new Error(`Mongo is not connected: ${status.error || status.message}`);
  const job = await rollbackVaultImport(importJobId);
  if (!job) throw new Error(`Import job not found: ${importJobId}`);
  console.log(JSON.stringify(job, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => closeMongo());
