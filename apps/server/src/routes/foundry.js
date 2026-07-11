import fs from "fs";
import multer from "multer";
import { Router } from "express";
import { buildFoundryExport, campaignFoundryExportPath } from "../services/foundryExportService.js";
import { commitFoundryImport, previewFoundryImport } from "../services/foundryImportService.js";
import { requireGm } from "../services/sessionService.js";
import { logAuditEvent } from "../services/auditLogService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const foundryRouter = Router();

function campaignContext(req) {
  return {
    campaignId: req.campaignIdentity?.campaign?.id || req.campaignIdentity?.membership?.campaignId || "",
    userId: req.campaignIdentity?.user?.id || req.campaignIdentity?.membership?.userId || "",
    role: req.campaignIdentity?.role || "player"
  };
}

foundryRouter.post("/foundry/import", requireGm, upload.array("files"), async (req, res, next) => {
  try {
    if (req.body.preview === "false") {
      const written = await commitFoundryImport(JSON.parse(req.body.items || "[]"), req.body.conflictMode || "skip", campaignContext(req));
      await logAuditEvent({ req, action: "foundry.import.commit", entityType: "foundry", metadata: { written: written.length } });
      return res.json({ written });
    }
    res.json({ preview: await previewFoundryImport(req.files || [], campaignContext(req)) });
  } catch (error) {
    next(error);
  }
});

foundryRouter.post("/foundry/export", requireGm, async (req, res, next) => {
  try {
    const result = await buildFoundryExport({ ...(req.body || {}), ...campaignContext(req) });
    await logAuditEvent({ req, action: "foundry.export.build", entityType: "foundry", metadata: { count: result?.count || 0 } });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

foundryRouter.get("/foundry/export/download", requireGm, (req, res) => {
  const file = campaignFoundryExportPath(campaignContext(req).campaignId);
  if (!fs.existsSync(file)) return res.status(404).json({ error: "No export has been generated yet" });
  void logAuditEvent({ req, action: "foundry.export.download", entityType: "foundry" });
  res.download(file);
});
