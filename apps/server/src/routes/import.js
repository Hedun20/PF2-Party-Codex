import { Router } from "express";
import { ensureCodexIndexes, isMongoEntriesEnabled, listImportJobs, findImportJob } from "../repositories/entriesRepository.js";
import { identityContextForCampaign } from "../repositories/identityRepository.js";
import { toPublicUser } from "../services/authStore.js";
import { requireGm } from "../services/sessionService.js";
import { commitVaultImport, dryRunVaultImport, rollbackVaultImport } from "../services/vaultImportService.js";
import { logAuditEvent } from "../services/auditLogService.js";

export const importRouter = Router();

async function gmContext(req) {
  const user = await toPublicUser(req.user);
  const campaignId = req.body?.campaignId || req.query?.campaignId || user?.activeCampaign?.id || user?.activeMembership?.campaignId || user?.membership?.campaignId || "";
  if (!campaignId) return { user, campaignId: "", actorUserId: user?.id || "", role: "player" };

  const context = await identityContextForCampaign(req.user, campaignId);
  if (!context.activeMembership?.id) {
    const error = new Error("No active membership found for the requested campaign.");
    error.status = 403;
    throw error;
  }
  if (!["owner", "gm"].includes(context.role || "player")) {
    const error = new Error("GM access required for the requested campaign.");
    error.status = 403;
    throw error;
  }

  return {
    user,
    campaignId: context.activeCampaign?.id || campaignId,
    actorUserId: user?.id || "",
    role: context.role || "player"
  };
}

function requireMongoImport(res) {
  if (!isMongoEntriesEnabled()) {
    res.status(503).json({ error: "Mongo import storage is not connected. Vault remains the source of truth in legacy mode." });
    return false;
  }
  return true;
}

importRouter.get("/import/jobs", requireGm, async (req, res, next) => {
  try {
    if (!requireMongoImport(res)) return;
    const context = await gmContext(req);
    if (!context.campaignId) return res.status(401).json({ error: "Login with a GM campaign membership to inspect import jobs." });
    const jobs = await listImportJobs({ campaignId: context.campaignId, limit: req.query.limit || 20 });
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

importRouter.get("/import/jobs/:id", requireGm, async (req, res, next) => {
  try {
    if (!requireMongoImport(res)) return;
    const job = await findImportJob(req.params.id);
    if (!job) return res.status(404).json({ error: "Import job not found." });
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

importRouter.post("/import/vault/dry-run", requireGm, async (req, res, next) => {
  try {
    if (!requireMongoImport(res)) return;
    const context = await gmContext(req);
    if (!context.campaignId) return res.status(401).json({ error: "Login with a GM campaign membership to import vault content." });
    await ensureCodexIndexes();
    const result = await dryRunVaultImport({ campaignId: context.campaignId, createdBy: context.actorUserId });
    await logAuditEvent({ req, actorUserId: context.actorUserId, actorRole: context.role, campaignId: context.campaignId, action: "vault.mongo_import.dry_run", entityType: "importJob", metadata: { summary: result.summary } });
    res.json({ preview: result });
  } catch (error) {
    next(error);
  }
});

importRouter.post("/import/vault/commit", requireGm, async (req, res, next) => {
  try {
    if (!requireMongoImport(res)) return;
    const context = await gmContext(req);
    if (!context.campaignId) return res.status(401).json({ error: "Login with a GM campaign membership to import vault content." });
    await ensureCodexIndexes();
    const result = await commitVaultImport({ campaignId: context.campaignId, createdBy: context.actorUserId });
    await logAuditEvent({ req, actorUserId: context.actorUserId, actorRole: context.role, campaignId: context.campaignId, action: "vault.mongo_import.commit", entityType: "importJob", entityId: String(result.importJob?._id || result.importJob?.id || ""), metadata: { summary: result.summary } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

importRouter.post("/import/:importJobId/rollback", requireGm, async (req, res, next) => {
  try {
    if (!requireMongoImport(res)) return;
    const context = await gmContext(req);
    const job = await rollbackVaultImport(req.params.importJobId);
    if (!job) return res.status(404).json({ error: "Import job not found." });
    await logAuditEvent({ req, actorUserId: context.actorUserId, actorRole: context.role, campaignId: context.campaignId || String(job.campaignId || ""), action: "vault.mongo_import.rollback", entityType: "importJob", entityId: req.params.importJobId, metadata: { rollback: job.rollback } });
    res.json({ job });
  } catch (error) {
    next(error);
  }
});
