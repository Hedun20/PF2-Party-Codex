import {
  parseSessionIngestionExposureRequestContract,
  type SessionIngestionExposureRequestContract
} from "@pf2-party-codex/contracts";

export const SESSION_INGESTION_PRIVACY_POLICY_VERSION = "hed26-ingestion-privacy-v1";

export type SessionIngestionExposureDenialCode =
  | "RAW_AUDIO_DESTINATION_DENIED"
  | "RAW_EVIDENCE_PLAYER_DENIED"
  | "RAW_EVIDENCE_CACHE_DENIED"
  | "RAW_EVIDENCE_ANALYTICS_DENIED"
  | "MANAGER_ONLY_MODEL_DENIED"
  | "MODEL_PROJECTION_REQUIRED"
  | "APPROVED_CANON_REQUIRED"
  | "PROJECTION_MISMATCH";

export type SessionIngestionExposureDecision =
  | {
      readonly allowed: true;
      readonly code: "INGESTION_EXPOSURE_ALLOWED";
      readonly policyVersion: typeof SESSION_INGESTION_PRIVACY_POLICY_VERSION;
    }
  | {
      readonly allowed: false;
      readonly code: SessionIngestionExposureDenialCode;
      readonly policyVersion: typeof SESSION_INGESTION_PRIVACY_POLICY_VERSION;
    };

function allow(): SessionIngestionExposureDecision {
  return {
    allowed: true,
    code: "INGESTION_EXPOSURE_ALLOWED",
    policyVersion: SESSION_INGESTION_PRIVACY_POLICY_VERSION
  };
}

function deny(code: SessionIngestionExposureDenialCode): SessionIngestionExposureDecision {
  return { allowed: false, code, policyVersion: SESSION_INGESTION_PRIVACY_POLICY_VERSION };
}

export function evaluateSessionIngestionExposure(
  input: unknown
): SessionIngestionExposureDecision {
  const request: SessionIngestionExposureRequestContract = parseSessionIngestionExposureRequestContract(input);

  if (request.dataClass === "rawAudio") {
    if (!["malwareScanner", "transcriptionProvider"].includes(request.destination)) {
      return deny("RAW_AUDIO_DESTINATION_DENIED");
    }
    return request.projection === "raw" ? allow() : deny("PROJECTION_MISMATCH");
  }

  if (request.dataClass === "approvedCanon") {
    if (request.visibility !== "public") return deny("APPROVED_CANON_REQUIRED");
    if (request.destination === "analytics") {
      return request.projection === "metadataOnly" ? allow() : deny("PROJECTION_MISMATCH");
    }
    if (["playerProjection", "modelContext", "cache", "export", "managerReview"].includes(request.destination)) {
      return request.projection === "approvedProjection" ? allow() : deny("PROJECTION_MISMATCH");
    }
    return deny("PROJECTION_MISMATCH");
  }

  if (request.destination === "playerProjection") return deny("RAW_EVIDENCE_PLAYER_DENIED");
  if (request.destination === "cache") return deny("RAW_EVIDENCE_CACHE_DENIED");
  if (request.destination === "analytics") return deny("RAW_EVIDENCE_ANALYTICS_DENIED");

  if (request.destination === "modelContext") {
    if (request.visibility === "managerOnly") return deny("MANAGER_ONLY_MODEL_DENIED");
    return request.projection === "policyFiltered" ? allow() : deny("MODEL_PROJECTION_REQUIRED");
  }

  if (request.destination === "managerReview" || request.destination === "export") {
    return request.projection === "policyFiltered" ? allow() : deny("PROJECTION_MISMATCH");
  }

  return deny("PROJECTION_MISMATCH");
}
