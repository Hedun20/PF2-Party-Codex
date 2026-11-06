import { Router } from "express";
import { resolveEvidenceSearchSubject } from "../repositories/evidenceSearchIdentityRepository.js";
import { logAuditEvent } from "../services/auditLogService.js";
import { searchCampaignEvidence } from "../services/evidenceSearchService.js";
import { requireCampaignMember } from "../services/sessionService.js";

export const evidenceSearchRouter = Router();

evidenceSearchRouter.post(
  "/campaigns/:campaignId/evidence/search",
  requireCampaignMember,
  async (req, res, next) => {
    try {
      const identity = req.campaignIdentity || {};
      const membership = identity.membership || {};
      const workspaceId = identity.workspace?.id || membership.workspaceId || "";
      const campaignId = identity.campaign?.id || membership.campaignId || req.params.campaignId || "";
      const userId = identity.user?.id || membership.userId || "";
      const membershipId = membership.id || "";
      const subject = await resolveEvidenceSearchSubject({
        userId,
        workspaceId,
        campaignId,
        membershipId
      });
      const result = await searchCampaignEvidence({
        request: req.body,
        subject,
        evaluatedAt: new Date().toISOString()
      });

      await logAuditEvent({
        req,
        action: "evidence.search",
        entityType: "campaign",
        entityId: campaignId,
        campaignId,
        metadata: {
          mode: result.mode,
          status: result.status,
          resultCount: result.items.length,
          usedUtf8Bytes: result.budget.usedUtf8Bytes,
          truncated: result.budget.truncated,
          requestingCharacterScoped: Boolean(result.requestingCharacterId)
        }
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
