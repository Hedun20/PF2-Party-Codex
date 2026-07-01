import { connectMongo, closeMongo } from "../src/db/mongo.js";
import { ensureCodexIndexes } from "../src/repositories/entriesRepository.js";
import { ensureDefaultCampaign } from "../src/repositories/identityRepository.js";
import { rebuildVaultIndex } from "../src/services/vaultService.js";
import { commitVaultImport } from "../src/services/vaultImportService.js";

async function main() {
  const status = await connectMongo();
  if (!status.connected) throw new Error(`Mongo is not connected: ${status.error || status.message}`);
  await ensureCodexIndexes();
  await rebuildVaultIndex();
  const { campaign } = await ensureDefaultCampaign(null);
  const result = await commitVaultImport({ campaignId: campaign._id, createdBy: null });
  console.log(JSON.stringify({ importJob: result.importJob, summary: result.summary, warnings: result.warnings }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => closeMongo());
