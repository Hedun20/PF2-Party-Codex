import { Router } from "express";
import { logAuditEvent } from "../services/auditLogService.js";
import { toPublicUser } from "../services/authStore.js";
import { requestedCampaignId, requireCampaignMember } from "../services/sessionService.js";
import {
  canReadNote,
  canWriteNote,
  createNote,
  deleteNote,
  ensureNotesIndexes,
  findNoteById,
  isMongoNotesEnabled,
  listNotesForUser,
  updateNote
} from "../repositories/notesRepository.js";

export const notesRouter = Router();
notesRouter.use("/notes", requireCampaignMember);

function assertMongoNotes() {
  if (!isMongoNotesEnabled()) {
    const error = new Error("Mongo campaign storage is not connected. Notes are unavailable until the database connection is restored.");
    error.status = 503;
    throw error;
  }
}

function sameId(left, right) {
  return String(left?._id || left || "") === String(right?._id || right || "");
}

async function currentContext(req) {
  if (!req.user) {
    const error = new Error("Login is required to use campaign notes.");
    error.status = 401;
    throw error;
  }
  const campaignId = requestedCampaignId(req);
  const user = await toPublicUser(req.user, campaignId ? { campaignId } : {});
  if (!user?.activeCampaign?.id || !user?.membership?.id) {
    const error = new Error("No active campaign membership found for this user.");
    error.status = 403;
    throw error;
  }
  return {
    user,
    userId: user.id,
    campaignId: user.activeCampaign.id,
    role: user.role || "player"
  };
}

notesRouter.get("/notes", async (req, res, next) => {
  try {
    assertMongoNotes();
    const context = await currentContext(req);
    const notes = await listNotesForUser({ ...context, scope: req.query.scope || "mine" });
    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

notesRouter.post("/notes", async (req, res, next) => {
  try {
    assertMongoNotes();
    const context = await currentContext(req);
    const note = await createNote({ campaignId: context.campaignId, userId: context.userId, input: req.body || {} });
    await logAuditEvent({ req, action: "notes.create", entityType: "note", entityId: note.id, campaignId: context.campaignId, metadata: { visibility: note.visibility } });
    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

notesRouter.patch("/notes/:id", async (req, res, next) => {
  try {
    assertMongoNotes();
    const context = await currentContext(req);
    const existing = await findNoteById(req.params.id, { campaignId: context.campaignId });
    if (!existing || !sameId(existing.campaignId, context.campaignId) || !canReadNote(existing, context)) return res.status(404).json({ error: "Note not found." });
    if (!canWriteNote(existing, context)) return res.status(403).json({ error: "You cannot edit this note." });
    const note = await updateNote({ campaignId: context.campaignId, id: req.params.id, input: req.body || {} });
    await logAuditEvent({ req, action: "notes.update", entityType: "note", entityId: note.id, campaignId: context.campaignId, metadata: { visibility: note.visibility } });
    res.json({ note });
  } catch (error) {
    next(error);
  }
});

notesRouter.delete("/notes/:id", async (req, res, next) => {
  try {
    assertMongoNotes();
    const context = await currentContext(req);
    const existing = await findNoteById(req.params.id, { campaignId: context.campaignId });
    if (!existing || !sameId(existing.campaignId, context.campaignId) || !canReadNote(existing, context)) return res.status(404).json({ error: "Note not found." });
    if (!canWriteNote(existing, context)) return res.status(403).json({ error: "You cannot delete this note." });
    await deleteNote(req.params.id, { campaignId: context.campaignId });
    await logAuditEvent({ req, action: "notes.delete", entityType: "note", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

notesRouter.post("/notes/indexes", async (req, res, next) => {
  try {
    assertMongoNotes();
    const context = await currentContext(req);
    if (!["owner", "gm"].includes(context.role)) return res.status(403).json({ error: "GM access required." });
    const indexes = await ensureNotesIndexes();
    res.json({ ok: true, indexes });
  } catch (error) {
    next(error);
  }
});
