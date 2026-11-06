import {
  EVIDENCE_SEARCH_SOURCE_KINDS,
  evidenceUtf8ByteLength,
  parseEvidenceBundleContract,
  parseEvidenceSearchRequestContract,
  type CampaignResourcePolicy,
  type EvidenceBundleContract,
  type EvidenceSearchAmbiguityCode,
  type EvidenceSearchItemContract,
  type EvidenceSearchRequestContract,
  type EvidenceSearchSourceKind,
  type HumanCampaignPolicySubject
} from "@pf2-party-codex/contracts";
import {
  authorizeHumanCampaignAction,
  deriveCampaignReadScope,
  evaluateCampaignResourceRead
} from "./campaignPolicy.js";
import { evaluateSessionIngestionExposure } from "./sessionIngestionPolicy.js";

export const EVIDENCE_RETRIEVAL_POLICY_VERSION = "hed28-evidence-retrieval-policy-v1";

export type EvidenceRetrievalDenialCode =
  | "SEARCH_IDENTITY_MISMATCH"
  | "SEARCH_CHARACTER_DENIED"
  | "SEARCH_SCOPE_DENIED"
  | "RAW_EVIDENCE_SEARCH_DENIED"
  | "RESOURCE_READ_DENIED"
  | "SOURCE_REVOKED"
  | "SOURCE_DELETED"
  | "SOURCE_EXPIRED"
  | "MODEL_CONTEXT_DENIED"
  | "SEARCH_INPUT_INVALID";

export type EvidenceRetrievalDecision =
  | {
      readonly allowed: true;
      readonly code: "EVIDENCE_RETRIEVAL_ALLOWED";
      readonly policyVersion: typeof EVIDENCE_RETRIEVAL_POLICY_VERSION;
    }
  | {
      readonly allowed: false;
      readonly code: EvidenceRetrievalDenialCode;
      readonly policyVersion: typeof EVIDENCE_RETRIEVAL_POLICY_VERSION;
    };

export interface EvidenceSearchAccessPlan {
  readonly decision: EvidenceRetrievalDecision;
  readonly viewer: "manager" | "player" | null;
  readonly allowedSourceKinds: readonly EvidenceSearchSourceKind[];
  readonly rawEvidenceAllowed: boolean;
  readonly policyVersion: typeof EVIDENCE_RETRIEVAL_POLICY_VERSION;
}

export interface EvidenceRetrievalCandidate {
  readonly item: EvidenceSearchItemContract;
  readonly resourcePolicy: CampaignResourcePolicy;
  readonly sourceState: "active" | "ended" | "revoked" | "deleted";
  readonly purgeAt: string | null;
  readonly revokedAt: string | null;
  readonly deletedAt: string | null;
}

export interface EvidenceBundleBuildOptions {
  readonly request: unknown;
  readonly items: readonly EvidenceSearchItemContract[];
  readonly generatedAt: string;
  readonly ambiguityCode?: EvidenceSearchAmbiguityCode | null;
}

function allow(): EvidenceRetrievalDecision {
  return {
    allowed: true,
    code: "EVIDENCE_RETRIEVAL_ALLOWED",
    policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
  };
}

function deny(code: EvidenceRetrievalDenialCode): EvidenceRetrievalDecision {
  return { allowed: false, code, policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION };
}

function isManager(subject: HumanCampaignPolicySubject): boolean {
  return subject.role === "owner" || subject.role === "gm";
}

function rawKind(kind: EvidenceSearchSourceKind): boolean {
  return kind !== "approvedCanon";
}

export function deriveEvidenceSearchAccessPlan(
  input: unknown,
  subject: HumanCampaignPolicySubject,
  evaluatedAt: string
): EvidenceSearchAccessPlan {
  let request: EvidenceSearchRequestContract;
  try {
    request = parseEvidenceSearchRequestContract(input);
  } catch {
    return {
      decision: deny("SEARCH_INPUT_INVALID"),
      viewer: null,
      allowedSourceKinds: [],
      rawEvidenceAllowed: false,
      policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
    };
  }

  if (request.workspaceId !== subject.workspaceId
    || request.campaignId !== subject.campaignId
    || request.requestingMembershipId !== subject.membershipId) {
    return {
      decision: deny("SEARCH_IDENTITY_MISMATCH"),
      viewer: null,
      allowedSourceKinds: [],
      rawEvidenceAllowed: false,
      policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
    };
  }

  if (request.requestingCharacterId !== null
    && !isManager(subject)
    && !subject.assignedCharacterIds.includes(request.requestingCharacterId)) {
    return {
      decision: deny("SEARCH_CHARACTER_DENIED"),
      viewer: "player",
      allowedSourceKinds: [],
      rawEvidenceAllowed: false,
      policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
    };
  }

  const readScope = deriveCampaignReadScope(
    subject,
    request.workspaceId,
    request.campaignId,
    evaluatedAt
  );
  if (!readScope.decision.allowed || !readScope.scope) {
    return {
      decision: deny("SEARCH_SCOPE_DENIED"),
      viewer: null,
      allowedSourceKinds: [],
      rawEvidenceAllowed: false,
      policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
    };
  }

  const rawDecision = authorizeHumanCampaignAction(subject, {
    channel: "web",
    action: "evidence.raw.read",
    workspaceId: request.workspaceId,
    campaignId: request.campaignId
  }, evaluatedAt);
  const rawEvidenceAllowed = rawDecision.allowed && isManager(subject);
  const explicitKinds = request.filters.sourceKinds;
  const kinds: readonly EvidenceSearchSourceKind[] = explicitKinds.length
    ? explicitKinds
    : rawEvidenceAllowed
      ? EVIDENCE_SEARCH_SOURCE_KINDS
      : ["approvedCanon"];

  if (!rawEvidenceAllowed && explicitKinds.some(rawKind)) {
    return {
      decision: deny("RAW_EVIDENCE_SEARCH_DENIED"),
      viewer: readScope.scope.viewer,
      allowedSourceKinds: ["approvedCanon"],
      rawEvidenceAllowed: false,
      policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
    };
  }

  return {
    decision: allow(),
    viewer: readScope.scope.viewer,
    allowedSourceKinds: kinds.filter((kind) => kind === "approvedCanon" || rawEvidenceAllowed),
    rawEvidenceAllowed,
    policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION
  };
}

function activeSourceDecision(candidate: EvidenceRetrievalCandidate, evaluatedAt: string): EvidenceRetrievalDecision | null {
  if (candidate.sourceState === "revoked" || candidate.revokedAt !== null) return deny("SOURCE_REVOKED");
  if (candidate.sourceState === "deleted" || candidate.deletedAt !== null) return deny("SOURCE_DELETED");
  if (candidate.purgeAt !== null && Date.parse(candidate.purgeAt) <= Date.parse(evaluatedAt)) {
    return deny("SOURCE_EXPIRED");
  }
  return null;
}

export function authorizeEvidenceRetrievalCandidate(
  subject: HumanCampaignPolicySubject,
  candidate: EvidenceRetrievalCandidate,
  evaluatedAt: string,
  destination: "searchResult" | "modelContext" = "searchResult"
): EvidenceRetrievalDecision {
  const sourceDecision = activeSourceDecision(candidate, evaluatedAt);
  if (sourceDecision) return sourceDecision;

  const resourceDecision = evaluateCampaignResourceRead(subject, candidate.resourcePolicy, evaluatedAt);
  if (!resourceDecision.allowed) return deny("RESOURCE_READ_DENIED");

  if (candidate.item.contentClass === "rawEvidence") {
    const rawDecision = authorizeHumanCampaignAction(subject, {
      channel: "web",
      action: "evidence.raw.read",
      workspaceId: candidate.resourcePolicy.workspaceId,
      campaignId: candidate.resourcePolicy.campaignId
    }, evaluatedAt);
    if (!rawDecision.allowed || !isManager(subject)) return deny("RAW_EVIDENCE_SEARCH_DENIED");

    if (destination === "modelContext") {
      const visibility = candidate.item.visibility;
      if (!["restricted", "managerOnly", "participantScoped"].includes(visibility)) {
        return deny("MODEL_CONTEXT_DENIED");
      }
      const exposure = evaluateSessionIngestionExposure({
        dataClass: "rawEvidence",
        visibility,
        destination: "modelContext",
        projection: "policyFiltered"
      });
      if (!exposure.allowed) return deny("MODEL_CONTEXT_DENIED");
    }
  }

  return allow();
}

function compareEvidenceItems(left: EvidenceSearchItemContract, right: EvidenceSearchItemContract): number {
  if (left.confidencePermille !== right.confidencePermille) {
    return right.confidencePermille - left.confidencePermille;
  }
  const time = right.occurredAt.localeCompare(left.occurredAt);
  return time || left.resultId.localeCompare(right.resultId);
}

export function buildEvidenceBundle(options: EvidenceBundleBuildOptions): EvidenceBundleContract {
  const request = parseEvidenceSearchRequestContract(options.request);
  const ordered = [...options.items].sort(compareEvidenceItems);
  const selected: EvidenceSearchItemContract[] = [];
  let usedUtf8Bytes = 0;
  let truncated = false;

  for (const item of ordered) {
    if (selected.length >= request.limit || selected.length >= request.contextBudget.maxItems) {
      truncated = true;
      break;
    }
    const itemBytes = evidenceUtf8ByteLength(item.snippet);
    if (usedUtf8Bytes + itemBytes > request.contextBudget.maxUtf8Bytes) {
      truncated = true;
      continue;
    }
    selected.push(item);
    usedUtf8Bytes += itemBytes;
  }
  if (selected.length < ordered.length) truncated = true;

  const ambiguityCode = options.ambiguityCode ?? null;
  const status = selected.length === 0
    ? "notFound"
    : ambiguityCode !== null && selected.length >= 2
      ? "ambiguous"
      : "ok";

  return parseEvidenceBundleContract({
    schemaVersion: "hed28-evidence-bundle-v1",
    workspaceId: request.workspaceId,
    campaignId: request.campaignId,
    requestingMembershipId: request.requestingMembershipId,
    requestingCharacterId: request.requestingCharacterId,
    mode: request.mode,
    status,
    ambiguityCode: status === "ambiguous" ? ambiguityCode : null,
    items: selected,
    budget: {
      maxItems: request.contextBudget.maxItems,
      maxUtf8Bytes: request.contextBudget.maxUtf8Bytes,
      usedItems: selected.length,
      usedUtf8Bytes,
      truncated
    },
    policyVersion: EVIDENCE_RETRIEVAL_POLICY_VERSION,
    generatedAt: options.generatedAt
  });
}
