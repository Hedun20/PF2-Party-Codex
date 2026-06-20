import fs from "fs";
import multer from "multer";
import { Router } from "express";
import { buildFoundryExport } from "../services/foundryExportService.js";
import { commitFoundryImport, previewFoundryImport } from "../services/foundryImportService.js";
import { config } from "../config.js";
import { requireGm } from "../services/sessionService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const foundryRouter = Router();

foundryRouter.post("/foundry/import", requireGm, upload.array("files"), async (req, res, next) => {
  try {
    if (req.body.preview === "false") {
      return res.json({ written: await commitFoundryImport(JSON.parse(req.body.items || "[]"), req.body.conflictMode || "skip") });
    }
    res.json({ preview: await previewFoundryImport(req.files || []) });
  } catch (error) {
    next(error);
  }
});

foundryRouter.post("/foundry/export", requireGm, async (req, res, next) => {
  try {
    res.json(await buildFoundryExport(req.body || {}));
  } catch (error) {
    next(error);
  }
});

foundryRouter.get("/foundry/export/download", (req, res) => {
  const file = `${config.exportDir}/pf2-party-codex-journals.json`;
  if (!fs.existsSync(file)) return res.status(404).json({ error: "No export has been generated yet" });
  res.download(file);
});
