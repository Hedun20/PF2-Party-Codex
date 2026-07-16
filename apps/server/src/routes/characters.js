import { Router } from "express";
import { logAuditEvent } from "../services/auditLogService.js";
import { toPublicUser } from "../services/authStore.js";
import { requestedCampaignId, requireCampaignMember } from "../services/sessionService.js";
import { parseCharacterImport } from "../services/characterImportService.js";
import { findCampaignMembership } from "../repositories/membershipManagementRepository.js";
import {
  assignCharacterToMembership,
  canReadCharacter,
  canWriteCharacter,
  createImportedCharacter,
  createManualCharacter,
  deleteCharacter,
  ensureCharactersIndexes,
  findCharacterById,
  isMongoCharactersEnabled,
  listCharactersForUser,
  serializeCharacter,
  updateCharacter
} from "../repositories/charactersRepository.js";

export const charactersRouter = Router();
const characterAssignmentRouter = Router({ mergeParams: true });
charactersRouter.use("/characters", requireCampaignMember);

function assertMongoCharacters() {
  if (!isMongoCharactersEnabled()) {
    const error = new Error("Mongo campaign storage is not connected. Characters are unavailable until the database connection is restored.");
    error.status = 503;
    throw error;
  }
}

function sameId(left, right) {
  return String(left?._id || left || "") === String(right?._id || right || "");
}

function isManager(role = "player") {
  return role === "owner" || role === "gm";
}

function assignedUserId(character) {
  return Object.prototype.hasOwnProperty.call(character || {}, "assignedUserId")
    ? String(character.assignedUserId || "")
    : String(character?.ownerUserId || "");
}

async function currentContext(req) {
  if (!req.user) {
    const error = new Error("Login is required to use campaign characters.");
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
    membershipId: user.membership.id,
    role: user.role || "player"
  };
}

async function parseImportResponse(req, adapter) {
  const originalFilename = String(req.body?.originalFilename || req.body?.filename || "").slice(0, 500);
  return parseCharacterImport({ adapter, payload: req.body || {}, originalFilename });
}

charactersRouter.get("/characters", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    const characters = await listCharactersForUser({ ...context, scope: req.query.scope || "mine" });
    res.json({ characters });
  } catch (error) {
    next(error);
  }
});

charactersRouter.post("/characters", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    const manager = isManager(context.role);
    const character = await createManualCharacter({
      campaignId: context.campaignId,
      ownerUserId: context.userId,
      createdByUserId: context.userId,
      assignedUserId: manager ? null : context.userId,
      assignedMembershipId: manager ? null : context.membershipId,
      role: context.role,
      input: req.body || {}
    });
    await logAuditEvent({ req, action: "characters.create", entityType: "character", entityId: character.id, campaignId: context.campaignId, metadata: { source: "manual", assignedUserId: character.assignedUserId || "" } });
    res.status(201).json({ character });
  } catch (error) {
    next(error);
  }
});

characterAssignmentRouter.patch("/", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    if (!isManager(context.role)) return res.status(403).json({ error: "GM or owner access is required to assign campaign characters." });

    const existing = await findCharacterById(req.params.id, { campaignId: context.campaignId });
    if (!existing || !sameId(existing.campaignId, context.campaignId)) return res.status(404).json({ error: "Character not found." });

    const membershipId = String(req.body?.membershipId || "").trim();
    let membership = null;
    if (membershipId) {
      membership = await findCampaignMembership({ campaignId: context.campaignId, membershipId });
      if (!membership || membership.status !== "active") return res.status(404).json({ error: "Active campaign membership was not found." });
    }

    const character = await assignCharacterToMembership({
      campaignId: context.campaignId,
      id: req.params.id,
      membership,
      assignedByUserId: context.userId,
      userId: context.userId,
      role: context.role
    });
    await logAuditEvent({
      req,
      action: membership ? "characters.assign" : "characters.unassign",
      entityType: "character",
      entityId: character.id,
      campaignId: context.campaignId,
      metadata: {
        fromUserId: assignedUserId(existing),
        toUserId: character.assignedUserId || "",
        membershipId: character.assignedMembershipId || ""
      }
    });
    res.json({ ok: true, character });
  } catch (error) {
    next(error);
  }
});

charactersRouter.use("/characters/:id/assignment", characterAssignmentRouter);

charactersRouter.get("/characters/:id", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    const character = await findCharacterById(req.params.id, { campaignId: context.campaignId });
    if (!character || !sameId(character.campaignId, context.campaignId) || !canReadCharacter(character, context)) return res.status(404).json({ error: "Character not found." });
    const includeRawImport = canWriteCharacter(character, context);
    res.json({ character: serializeCharacter(character, { includeRawImport, userId: context.userId, role: context.role }) });
  } catch (error) {
    next(error);
  }
});

charactersRouter.patch("/characters/:id", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    const existing = await findCharacterById(req.params.id, { campaignId: context.campaignId });
    if (!existing || !sameId(existing.campaignId, context.campaignId) || !canReadCharacter(existing, context)) return res.status(404).json({ error: "Character not found." });
    if (!canWriteCharacter(existing, context)) return res.status(403).json({ error: "You cannot edit this character." });
    const character = await updateCharacter({ campaignId: context.campaignId, id: req.params.id, userId: context.userId, role: context.role, input: req.body || {} });
    await logAuditEvent({ req, action: "characters.update", entityType: "character", entityId: character.id, campaignId: context.campaignId });
    res.json({ character });
  } catch (error) {
    next(error);
  }
});

charactersRouter.patch("/characters/:id/presentation", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    const existing = await findCharacterById(req.params.id, { campaignId: context.campaignId });
    if (!existing || !sameId(existing.campaignId, context.campaignId) || !canReadCharacter(existing, context)) return res.status(404).json({ error: "Character not found." });
    if (!canWriteCharacter(existing, context)) return res.status(403).json({ error: "You cannot edit this character." });
    const character = await updateCharacter({ campaignId: context.campaignId, id: req.params.id, userId: context.userId, role: context.role, input: { text: req.body?.text, visuals: req.body?.visuals, links: req.body?.links, visibility: req.body?.visibility } });
    await logAuditEvent({ req, action: "characters.presentation.update", entityType: "character", entityId: character.id, campaignId: context.campaignId });
    res.json({ character });
  } catch (error) {
    next(error);
  }
});

charactersRouter.delete("/characters/:id", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    const existing = await findCharacterById(req.params.id, { campaignId: context.campaignId });
    if (!existing || !sameId(existing.campaignId, context.campaignId) || !canReadCharacter(existing, context)) return res.status(404).json({ error: "Character not found." });
    if (!canWriteCharacter(existing, context)) return res.status(403).json({ error: "You cannot delete this character." });
    await deleteCharacter(req.params.id, { campaignId: context.campaignId });
    await logAuditEvent({ req, action: "characters.delete", entityType: "character", entityId: req.params.id, campaignId: context.campaignId });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

for (const [path, adapter] of [
  ["/characters/import/pathbuilder", "pathbuilder-json"],
  ["/characters/import/foundry", "foundry-pf2e-actor-json"]
]) {
  charactersRouter.post(`${path}/dry-run`, async (req, res, next) => {
    try {
      assertMongoCharacters();
      await currentContext(req);
      const report = await parseImportResponse(req, adapter);
      res.json({ ok: true, ...report, character: undefined });
    } catch (error) {
      next(error);
    }
  });

  charactersRouter.post(`${path}/commit`, async (req, res, next) => {
    try {
      assertMongoCharacters();
      const context = await currentContext(req);
      const manager = isManager(context.role);
      const report = await parseImportResponse(req, adapter);
      const character = await createImportedCharacter({
        campaignId: context.campaignId,
        ownerUserId: context.userId,
        createdByUserId: context.userId,
        assignedUserId: manager ? null : context.userId,
        assignedMembershipId: manager ? null : context.membershipId,
        role: context.role,
        normalized: report.character
      });
      await logAuditEvent({ req, action: "characters.import", entityType: "character", entityId: character.id, campaignId: context.campaignId, metadata: { adapter, warnings: report.preview.warnings, assignedUserId: character.assignedUserId || "" } });
      res.status(201).json({ ok: true, preview: report.preview, character });
    } catch (error) {
      next(error);
    }
  });
}

charactersRouter.post("/characters/indexes", async (req, res, next) => {
  try {
    assertMongoCharacters();
    const context = await currentContext(req);
    if (!isManager(context.role)) return res.status(403).json({ error: "GM access required." });
    const indexes = await ensureCharactersIndexes();
    res.json({ ok: true, indexes });
  } catch (error) {
    next(error);
  }
});
