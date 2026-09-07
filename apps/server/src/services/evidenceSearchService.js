import { ObjectId } from "mongodb";
import {
  findApprovedCanonSearchCandidates,
  findManualNoteSearchCandidates,
  findRawEvidenceSearchCandidates
} from "../repositories/evidenceSearchRepository.js";

const SOURCE_KINDS = new Set(["approvedCanon", "foundry", "discord", "manualNote", "transcriptSegment"]);
const MODES = new Set(["sourceList", "groundedAnswer", "authoringEvidenceBundle"]);
const MAX_QUERY_BYTES = 2048;
const MAX_ITEMS = 100;
const MAX_CONTEXT_BYTES = 262144;
const MIN_CONTEXT_BYTES = 1024;
const MAX_CANDIDATES = 250;
const CANONICAL_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/;
const MANAGER_ROLES = new Set(["owner", "gm"]);

function serviceError(message, status = 400, code = "EVIDENCE_SEARCH_INVALID") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toString();
  if (value._id) return idString(value._id);
  return String(value);
}

function utf8ByteLength(value = "") {
  return Buffer.byteLength(String(value), "utf8");
}

function canonicalInstant(value, label) {
  const instant = String(value || "").trim();
  const parsed = Date.parse(instant);
  if (!CANONICAL_INSTANT.test(instant) || !Number.isFinite(parsed) || new Date(parsed).toISOString() !== instant) {
    throw serviceError(`${label} must be a canonical UTC timestamp.`);
  }
  return instant;
}

function stableId(value, label) {
  const result = String(value || "").trim();
  if (!SAFE_ID.test(result)) throw serviceError(`${label} is invalid.`);
  return result;
}

function optionalStableId(value, label) {
  return value === null || value === undefined || value === "" ? null : stableId(value, label);
}

function integerRange(value, label, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw serviceError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw serviceError(`${label} must be an object.`);
  const expected = new Set(keys);
  const actual = Object.keys(value);
  if (actual.length !== expected.size || actual.some((key) => !expected.has(key))) {
    throw serviceError(`${label} contains an unknown or missing field.`);
  }
}

function uniqueIds(value, label, maximum) {
  if (!Array.isArray(value) || value.length > maximum) throw serviceError(`${label} is invalid.`);
  const result = value.map((item) => stableId(item, label));
  if (new Set(result).size !== result.length) throw serviceError(`${label} contains duplicates.`);
  return result;
}

function normalizeFilters(value) {
  exactKeys(value, ["sessionIds", "sourceKinds", "entityIds", "occurredFrom", "occurredTo"], "Evidence filters");
  const sourceKinds = Array.isArray(value.sourceKinds) ? value.sourceKinds.map((kind) => String(kind || "")) : [];
  if (sourceKinds.length > SOURCE_KINDS.size || sourceKinds.some((kind) => !SOURCE_KINDS.has(kind)) || new Set(sourceKinds).size !== sourceKinds.length) {
    throw serviceError("Evidence source-kind filters are invalid.");
  }
  const occurredFrom = value.occurredFrom === null ? null : canonicalInstant(value.occurredFrom, "Evidence start time");
  const occurredTo = value.occurredTo === null ? null : canonicalInstant(value.occurredTo, "Evidence end time");
  if (occurredFrom && occurredTo && Date.parse(occurredTo) < Date.parse(occurredFrom)) {
    throw serviceError("Evidence end time cannot precede the start time.");
  }
  return {
    sessionIds: uniqueIds(value.sessionIds, "Session filter", 16),
    sourceKinds,
    entityIds: uniqueIds(value.entityIds, "Entity filter", 32),
    occurredFrom,
    occurredTo
  };
}

export function normalizeEvidenceSearchRequest(value) {
  exactKeys(value, [
    "schemaVersion",
    "workspaceId",
    "campaignId",
    "requestingMembershipId",
    "requestingCharacterId",
    "query",
    "mode",
    "filters",
    "limit",
    "contextBudget",
    "requestedAt"
  ], "Evidence search request");
  if (value.schemaVersion !== "hed28-evidence-search-request-v1") {
    throw serviceError("Evidence search request schema version is unsupported.");
  }
  const query = String(value.query || "").trim();
  if (!query || utf8ByteLength(query) > MAX_QUERY_BYTES) throw serviceError("Evidence search query is empty or too large.");
  const mode = String(value.mode || "");
  if (!MODES.has(mode)) throw serviceError("Evidence search mode is unsupported.");
  exactKeys(value.contextBudget, ["maxItems", "maxUtf8Bytes"], "Evidence context budget");
  const contextBudget = {
    maxItems: integerRange(value.contextBudget.maxItems, "Evidence max items", 1, MAX_ITEMS),
    maxUtf8Bytes: integerRange(value.contextBudget.maxUtf8Bytes, "Evidence max bytes", MIN_CONTEXT_BYTES, MAX_CONTEXT_BYTES)
  };
  const limit = integerRange(value.limit, "Evidence search limit", 1, MAX_ITEMS);
  if (limit > contextBudget.maxItems) throw serviceError("Evidence search limit cannot exceed the context item budget.");
  return {
    schemaVersion: value.schemaVersion,
    workspaceId: stableId(value.workspaceId, "Workspace id"),
    campaignId: stableId(value.campaignId, "Campaign id"),
    requestingMembershipId: stableId(value.requestingMembershipId, "Membership id"),
    requestingCharacterId: optionalStableId(value.requestingCharacterId, "Character id"),
    query,
    mode,
    filters: normalizeFilters(value.filters),
    limit,
    contextBudget,
    requestedAt: canonicalInstant(value.requestedAt, "Evidence request time")
  };
}

function accessPlan(request, subject) {
  if (request.workspaceId !== subject.workspaceId
    || request.campaignId !== subject.campaignId
    || request.requestingMembershipId !== subject.membershipId) {
    throw serviceError("Evidence search identity does not match the current campaign membership.", 403, "EVIDENCE_SEARCH_IDENTITY_MISMATCH");
  }
  const manager = MANAGER_ROLES.has(subject.role);
  if (request.requestingCharacterId && !manager && !subject.assignedCharacterIds.includes(request.requestingCharacterId)) {
    throw serviceError("The requested character is not assigned to the current membership.", 403, "EVIDENCE_SEARCH_CHARACTER_DENIED");
  }
  if (subject.membershipState !== "active") {
    throw serviceError("The current campaign membership is not active.", 403, "EVIDENCE_SEARCH_MEMBERSHIP_INACTIVE");
  }
  if (subject.membershipExpiresAt && Date.parse(subject.membershipExpiresAt) <= Date.now()) {
    throw serviceError("The current campaign membership has expired.", 403, "EVIDENCE_SEARCH_MEMBERSHIP_EXPIRED");
  }

  const explicitKinds = request.filters.sourceKinds;
  if (!manager && explicitKinds.some((kind) => kind !== "approvedCanon")) {
    throw serviceError("Players cannot search raw campaign evidence.", 403, "EVIDENCE_RAW_SEARCH_DENIED");
  }
  const allowedKinds = explicitKinds.length
    ? explicitKinds
    : manager
      ? [...SOURCE_KINDS]
      : ["approvedCanon"];
  return { manager, viewer: manager ? "manager" : "player", allowedKinds };
}

function canonicalOrNull(value) {
  const text = String(value || "").trim();
  const parsed = Date.parse(text);
  return CANONICAL_INSTANT.test(text) && Number.isFinite(parsed) && new Date(parsed).toISOString() === text
    ? text
    : null;
}

function safeIdOrNull(value) {
  const result = idString(value).trim();
  return SAFE_ID.test(result) ? result : null;
}

function safeInternalLink(value) {
  const link = String(value || "").trim();
  if (!link || link.length > 1024 || !link.startsWith("/") || link.startsWith("//") || /[\u0000-\u001f\u007f\s]/.test(link)) return null;
  return link;
}

function truncateUtf8(value, maximum = 8192) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (utf8ByteLength(text) <= maximum) return text;
  let result = "";
  for (const character of text) {
    if (utf8ByteLength(result + character) > maximum - 3) break;
    result += character;
  }
  return `${result}...`;
}

function queryTerms(query) {
  return [...new Set(String(query || "").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [])]
    .filter((term) => term.length >= 2)
    .slice(0, 16);
}

function relevance(text, query) {
  const haystack = String(text || "").toLocaleLowerCase();
  const phrase = String(query || "").trim().toLocaleLowerCase();
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  let hits = 0;
  for (const term of terms) if (haystack.includes(term)) hits += 1;
  if (!hits) return 0;
  const coverage = hits / terms.length;
  const phraseBonus = phrase.length >= 4 && haystack.includes(phrase) ? 250 : 0;
  return Math.min(1000, Math.round(250 + coverage * 500 + phraseBonus));
}

function legacyEntryPolicy(entry, scope) {
  const policy = entry?.policy;
  if (policy && typeof policy === "object" && !Array.isArray(policy)) {
    const editorialState = ["draft", "needsReview", "active", "archived"].includes(policy.editorialState) ? policy.editorialState : null;
    const audience = ["gmOnly", "party", "specificPlayers"].includes(policy.audience) ? policy.audience : null;
    const releaseState = ["hidden", "public", "revealed"].includes(policy.releaseState) ? policy.releaseState : null;
    if (editorialState && audience && releaseState) {
      return {
        ...scope,
        editorialState,
        audience,
        releaseState,
        contentClass: "approvedCanon",
        explicitUserIds: Array.isArray(policy.explicitUserIds) ? policy.explicitUserIds.map(idString).filter(Boolean) : [],
        explicitCharacterIds: Array.isArray(policy.explicitCharacterIds) ? policy.explicitCharacterIds.map(idString).filter(Boolean) : []
      };
    }
  }
  const visibility = String(entry?.visibility || "public");
  const party = visibility === "public" || visibility === "revealed";
  return {
    ...scope,
    editorialState: "active",
    audience: party ? "party" : "gmOnly",
    releaseState: visibility === "public" ? "public" : visibility === "revealed" ? "revealed" : "hidden",
    contentClass: "approvedCanon",
    explicitUserIds: [],
    explicitCharacterIds: []
  };
}

function playerCanReadPolicy(subject, policy) {
  if (policy.contentClass !== "approvedCanon" || policy.editorialState !== "active" || policy.releaseState === "hidden") return false;
  if (policy.audience === "party") return true;
  if (policy.audience === "gmOnly") return false;
  if (policy.explicitUserIds.includes(subject.userId)) return true;
  return policy.explicitCharacterIds.some((characterId) => subject.assignedCharacterIds.includes(characterId));
}

function approvedEntryCandidate(entry, request, subject, plan) {
  const occurredAt = canonicalOrNull(entry.updatedAt) || canonicalOrNull(entry.createdAt);
  if (!occurredAt) return null;
  const policy = legacyEntryPolicy(entry, { workspaceId: request.workspaceId, campaignId: request.campaignId });
  if (!plan.manager && !playerCanReadPolicy(subject, policy)) return null;
  if (policy.editorialState !== "active") return null;
  const body = plan.manager
    ? [entry.title, entry.summary, entry.publicContent, entry.gmContent].filter(Boolean).join("\n")
    : [entry.title, entry.summary, entry.publicContent].filter(Boolean).join("\n");
  const confidencePermille = relevance(body, request.query);
  if (!confidencePermille) return null;
  const recordId = safeIdOrNull(entry._id);
  if (!recordId) return null;
  const path = String(entry.path || "");
  return {
    item: {
      resultId: `canon:${recordId}`,
      kind: "approvedCanon",
      recordId,
      sourceId: `canon:${recordId}`,
      sessionId: safeIdOrNull(entry.sessionId || entry.source?.sessionId || entry.metadata?.sessionId),
      entityId: recordId,
      occurredAt,
      snippet: truncateUtf8(body),
      speaker: null,
      visibility: policy.audience === "party" ? "party" : policy.audience === "specificPlayers" ? "specificPlayers" : "managerOnly",
      releaseState: policy.releaseState,
      contentClass: "approvedCanon",
      sourceState: "active",
      approvalState: "approvedCanon",
      confidencePermille,
      references: {
        providerObjectId: null,
        providerEventId: null,
        sourceDocumentId: null,
        foundryRollId: null,
        discordMessageId: null
      },
      deepLink: path ? safeInternalLink(`/page/${encodeURIComponent(path)}`) : null,
      policyVersion: String(entry.policy?.policyVersion || "campaign-policy-v1"),
      contentDisposition: "dataOnlyUntrusted"
    },
    resourcePolicy: policy,
    sourceState: "active",
    purgeAt: null,
    revokedAt: null,
    deletedAt: null
  };
}

function rawVisibility(record) {
  const value = typeof record.visibility === "object" && record.visibility
    ? record.visibility.classification
    : record.visibility;
  return ["restricted", "managerOnly", "participantScoped"].includes(value) ? value : "restricted";
}

function rawKind(record) {
  if (record.provider === "foundry") return "foundry";
  if (record.provider === "discord") return "discord";
  if (record.provider === "transcript") return "transcriptSegment";
  return "manualNote";
}

function projectionText(projection) {
  if (!projection || typeof projection !== "object" || Array.isArray(projection)) return "";
  return [projection.text, projection.summary, projection.content, projection.title].filter((value) => typeof value === "string").join("\n");
}

function projectionSpeaker(projection) {
  const speaker = projection?.speaker || projection?.actor || null;
  if (!speaker || typeof speaker !== "object" || Array.isArray(speaker)) return null;
  const sourceActorId = safeIdOrNull(speaker.sourceActorId || speaker.id);
  const displayName = typeof speaker.displayName === "string"
    ? speaker.displayName.slice(0, 512)
    : typeof speaker.label === "string"
      ? speaker.label.slice(0, 512)
      : null;
  return sourceActorId || displayName ? { sourceActorId, displayName } : null;
}

function rawReferences(record, projection = {}) {
  const references = projection.references && typeof projection.references === "object" ? projection.references : {};
  return {
    providerObjectId: safeIdOrNull(record.providerObjectId || references.providerObjectId),
    providerEventId: safeIdOrNull(record.providerEventId || references.providerEventId),
    sourceDocumentId: safeIdOrNull(record.sourceDocumentId || references.sourceDocumentId),
    foundryRollId: safeIdOrNull(projection.foundryRollId || references.foundryRollId),
    discordMessageId: safeIdOrNull(projection.discordMessageId || references.discordMessageId)
  };
}

function rawCandidate(record, request, plan, override = {}) {
  if (!plan.manager) return null;
  if (record.state === "revoked" || record.state === "deleted" || record.revokedAt || record.deletedAt) return null;
  if (record.purgeAt && Date.parse(record.purgeAt) <= Date.now()) return null;
  const projection = override.projection || record.normalizedProjection || {};
  const text = override.text ?? projectionText(projection);
  const confidencePermille = relevance(text, request.query);
  if (!confidencePermille) return null;
  const occurredAt = canonicalOrNull(override.occurredAt || record.occurredAt || record.ingestedAt);
  const recordId = safeIdOrNull(record._id);
  if (!occurredAt || !recordId) return null;
  const sourceId = safeIdOrNull(record.sourceId) || `evidence:${recordId}`;
  const kind = override.kind || rawKind(record);
  const visibility = rawVisibility(record);
  const sourceState = record.state === "ended" ? "ended" : "active";
  const item = {
    resultId: override.resultId || `evidence:${recordId}`,
    kind,
    recordId,
    sourceId,
    sessionId: safeIdOrNull(record.sessionId),
    entityId: safeIdOrNull(override.entityId || record.entityId || projection.entityId),
    occurredAt,
    snippet: truncateUtf8(text),
    speaker: override.speaker || projectionSpeaker(projection),
    visibility,
    releaseState: null,
    contentClass: "rawEvidence",
    sourceState,
    approvalState: "reviewableRaw",
    confidencePermille,
    references: rawReferences(record, projection),
    deepLink: safeInternalLink(projection.deepLink),
    policyVersion: String(record.policyVersion || "campaign-policy-v1"),
    contentDisposition: "dataOnlyUntrusted"
  };
  return {
    item,
    resourcePolicy: {
      workspaceId: request.workspaceId,
      campaignId: request.campaignId,
      editorialState: "active",
      audience: "gmOnly",
      releaseState: "hidden",
      contentClass: "rawEvidence",
      explicitUserIds: [],
      explicitCharacterIds: []
    },
    sourceState,
    purgeAt: canonicalOrNull(record.purgeAt),
    revokedAt: canonicalOrNull(record.revokedAt),
    deletedAt: canonicalOrNull(record.deletedAt)
  };
}

function transcriptCandidates(record, request, plan) {
  if (!plan.manager || !plan.allowedKinds.includes("transcriptSegment")) return [];
  const segments = Array.isArray(record.normalizedProjection?.segments) ? record.normalizedProjection.segments : [];
  const baseOccurredAt = canonicalOrNull(record.occurredAt || record.ingestedAt);
  const recordId = safeIdOrNull(record._id);
  if (!baseOccurredAt || !recordId) return [];
  return segments.slice(0, 1000).map((segment, index) => {
    const segmentId = safeIdOrNull(segment?.segmentId) || String(index + 1);
    return rawCandidate(record, request, plan, {
      kind: "transcriptSegment",
      resultId: `evidence:${recordId}:segment:${segmentId}`,
      text: segment?.text || "",
      speaker: projectionSpeaker({
        speaker: {
          sourceActorId: segment?.correctedSpeakerId || segment?.suggestedSpeakerId || null,
          displayName: segment?.suggestedSpeakerLabel || null
        }
      }),
      entityId: segment?.entityId || record.entityId || null,
      projection: { ...record.normalizedProjection, ...segment }
    });
  }).filter(Boolean);
}

function manualNoteCandidate(note, request, plan) {
  if (!plan.manager) return null;
  const occurredAt = canonicalOrNull(note.updatedAt) || canonicalOrNull(note.createdAt);
  const recordId = safeIdOrNull(note._id);
  if (!occurredAt || !recordId) return null;
  const text = [note.title, note.body].filter(Boolean).join("\n");
  const confidencePermille = relevance(text, request.query);
  if (!confidencePermille) return null;
  const visibility = ["gmPrivate", "sharedWithGm"].includes(note.visibility) ? "managerOnly" : note.visibility === "partyVisible" ? "participantScoped" : "restricted";
  return {
    item: {
      resultId: `manual-note:${recordId}`,
      kind: "manualNote",
      recordId,
      sourceId: `manual-note:${recordId}`,
      sessionId: safeIdOrNull(note.linkedSessionId),
      entityId: safeIdOrNull(Array.isArray(note.linkedEntryIds) ? note.linkedEntryIds[0] : null),
      occurredAt,
      snippet: truncateUtf8(text),
      speaker: null,
      visibility,
      releaseState: null,
      contentClass: "rawEvidence",
      sourceState: "active",
      approvalState: "reviewableRaw",
      confidencePermille,
      references: {
        providerObjectId: null,
        providerEventId: null,
        sourceDocumentId: null,
        foundryRollId: null,
        discordMessageId: null
      },
      deepLink: null,
      policyVersion: "campaign-policy-v1",
      contentDisposition: "dataOnlyUntrusted"
    },
    resourcePolicy: {
      workspaceId: request.workspaceId,
      campaignId: request.campaignId,
      editorialState: "active",
      audience: "gmOnly",
      releaseState: "hidden",
      contentClass: "rawEvidence",
      explicitUserIds: [],
      explicitCharacterIds: []
    },
    sourceState: "active",
    purgeAt: null,
    revokedAt: null,
    deletedAt: null
  };
}

function postGate(candidate, request, subject, plan) {
  if (!candidate) return false;
  if (candidate.sourceState === "revoked" || candidate.sourceState === "deleted" || candidate.revokedAt || candidate.deletedAt) return false;
  if (candidate.purgeAt && Date.parse(candidate.purgeAt) <= Date.now()) return false;
  if (candidate.item.contentClass === "rawEvidence" && !plan.manager) return false;
  if (candidate.item.contentClass === "approvedCanon" && !plan.manager && !playerCanReadPolicy(subject, candidate.resourcePolicy)) return false;
  if (request.mode !== "sourceList" && candidate.item.contentClass === "rawEvidence" && candidate.item.visibility === "managerOnly") return false;
  return true;
}

function compareItems(left, right) {
  if (left.confidencePermille !== right.confidencePermille) return right.confidencePermille - left.confidencePermille;
  const time = String(right.occurredAt).localeCompare(String(left.occurredAt));
  return time || String(left.resultId).localeCompare(String(right.resultId));
}

function bundleFromCandidates(request, candidates, generatedAt) {
  const ordered = candidates.map((candidate) => candidate.item).sort(compareItems);
  const selected = [];
  let usedUtf8Bytes = 0;
  let truncated = false;
  for (const item of ordered) {
    if (selected.length >= request.limit || selected.length >= request.contextBudget.maxItems) {
      truncated = true;
      break;
    }
    const bytes = utf8ByteLength(item.snippet);
    if (usedUtf8Bytes + bytes > request.contextBudget.maxUtf8Bytes) {
      truncated = true;
      continue;
    }
    selected.push(item);
    usedUtf8Bytes += bytes;
  }
  if (selected.length < ordered.length) truncated = true;
  const ambiguous = request.mode !== "sourceList"
    && selected.length >= 2
    && Math.abs(selected[0].confidencePermille - selected[1].confidencePermille) <= 20
    && selected[0].entityId !== selected[1].entityId;
  return {
    schemaVersion: "hed28-evidence-bundle-v1",
    workspaceId: request.workspaceId,
    campaignId: request.campaignId,
    requestingMembershipId: request.requestingMembershipId,
    requestingCharacterId: request.requestingCharacterId,
    mode: request.mode,
    status: selected.length === 0 ? "notFound" : ambiguous ? "ambiguous" : "ok",
    ambiguityCode: ambiguous ? "MULTIPLE_TOP_MATCHES" : null,
    items: selected,
    budget: {
      maxItems: request.contextBudget.maxItems,
      maxUtf8Bytes: request.contextBudget.maxUtf8Bytes,
      usedItems: selected.length,
      usedUtf8Bytes,
      truncated
    },
    policyVersion: "hed28-evidence-retrieval-policy-v1",
    generatedAt
  };
}

export async function searchCampaignEvidence({ request: input, subject, evaluatedAt = new Date().toISOString() } = {}) {
  const request = normalizeEvidenceSearchRequest(input);
  const stamp = canonicalInstant(evaluatedAt, "Evidence evaluation time");
  const plan = accessPlan(request, subject);
  const candidates = [];

  if (plan.allowedKinds.includes("approvedCanon")) {
    const entries = await findApprovedCanonSearchCandidates({
      campaignId: request.campaignId,
      viewer: plan.viewer,
      filters: request.filters,
      limit: MAX_CANDIDATES
    });
    for (const entry of entries) {
      const candidate = approvedEntryCandidate(entry, request, subject, plan);
      if (postGate(candidate, request, subject, plan)) candidates.push(candidate);
    }
  }

  const rawKinds = plan.allowedKinds.filter((kind) => ["foundry", "discord", "transcriptSegment"].includes(kind));
  if (plan.manager && rawKinds.length) {
    const records = await findRawEvidenceSearchCandidates({
      workspaceId: request.workspaceId,
      campaignId: request.campaignId,
      kinds: rawKinds,
      filters: request.filters,
      evaluatedAt: stamp,
      limit: MAX_CANDIDATES
    });
    for (const record of records) {
      if (record.provider === "transcript") {
        for (const candidate of transcriptCandidates(record, request, plan)) {
          if (postGate(candidate, request, subject, plan)) candidates.push(candidate);
        }
      } else {
        const candidate = rawCandidate(record, request, plan);
        if (postGate(candidate, request, subject, plan)) candidates.push(candidate);
      }
    }
  }

  if (plan.manager && plan.allowedKinds.includes("manualNote")) {
    const notes = await findManualNoteSearchCandidates({
      campaignId: request.campaignId,
      userId: subject.userId,
      filters: request.filters,
      limit: MAX_CANDIDATES
    });
    for (const note of notes) {
      const candidate = manualNoteCandidate(note, request, plan);
      if (postGate(candidate, request, subject, plan)) candidates.push(candidate);
    }
  }

  return bundleFromCandidates(request, candidates, stamp);
}
