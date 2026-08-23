import {
  AUDIENCES,
  CAMPAIGN_CONTENT_CLASSES,
  CAMPAIGN_POLICY_CACHE_NAMESPACES,
  CAMPAIGN_ROLES,
  EDITORIAL_STATES,
  HUMAN_CAMPAIGN_ACTIONS,
  HUMAN_POLICY_CHANNELS,
  MACHINE_CAMPAIGN_CAPABILITIES,
  MACHINE_CREDENTIAL_STATES,
  MACHINE_POLICY_CHANNELS,
  POLICY_MEMBERSHIP_STATES,
  RELEASE_STATES,
  type CampaignId,
  type CampaignPolicyCacheNamespace,
  type CampaignPolicyDecision,
  type CampaignPolicyDenialCode,
  type CampaignPolicyReadScopeResult,
  type CampaignResourcePolicy,
  type HumanCampaignAction,
  type HumanCampaignPolicyRequest,
  type HumanCampaignPolicySubject,
  type HumanPolicyChannel,
  type MachineCampaignCapability,
  type MachineCampaignPolicyRequest,
  type MachineCampaignPolicySubject,
  type MachinePolicyChannel,
  type WorkspaceId
} from "@pf2-party-codex/contracts";

export const CAMPAIGN_POLICY_VERSION = "campaign-policy-v1";

const HUMAN_ACTIONS_BY_CHANNEL: Readonly<Record<HumanPolicyChannel, ReadonlySet<HumanCampaignAction>>> = {
  web: new Set([
    "campaign.read",
    "campaign.manage",
    "resource.read",
    "resource.write",
    "canon.approve",
    "evidence.raw.read",
    "character.read",
    "character.write",
    "character.ask",
    "check.secret.read",
    "achievement.hidden.read",
    "campaign.delete"
  ]),
  discord: new Set([
    "resource.read",
    "character.read",
    "discord.command.player",
    "discord.command.gm"
  ]),
  ai: new Set(["resource.read", "character.ask"]),
  export: new Set(["export.party.create", "export.gm.create"])
};

const MACHINE_CAPABILITIES_BY_CHANNEL: Readonly<
  Record<MachinePolicyChannel, ReadonlySet<MachineCampaignCapability>>
> = {
  job: new Set([
    "job:execute",
    "archive:read:party",
    "archive:read:gm",
    "export:create:party",
    "export:create:gm"
  ]),
  foundry: new Set([
    "foundry:ingest",
    "archive:read:party",
    "archive:read:gm",
    "export:create:party",
    "export:create:gm"
  ]),
  notification: new Set(["notification:deliver", "archive:read:party", "archive:read:gm"]),
  export: new Set(["export:create:party", "export:create:gm"])
};

const PLAYER_ACTIONS: ReadonlySet<HumanCampaignAction> = new Set([
  "campaign.read",
  "resource.read",
  "resource.write",
  "character.read",
  "character.write",
  "character.ask",
  "discord.command.player",
  "export.party.create"
]);

function deny(code: CampaignPolicyDenialCode): CampaignPolicyDecision {
  return { allowed: false, code, policyVersion: CAMPAIGN_POLICY_VERSION };
}

function allow(effect: "manager" | "playerSafe" | "self" | "machine"): CampaignPolicyDecision {
  return { allowed: true, code: "POLICY_ALLOWED", effect, policyVersion: CAMPAIGN_POLICY_VERSION };
}

function exactScope(
  subject: { readonly workspaceId: WorkspaceId; readonly campaignId: CampaignId },
  request: { readonly workspaceId: WorkspaceId; readonly campaignId: CampaignId }
): boolean {
  return subject.workspaceId === request.workspaceId && subject.campaignId === request.campaignId;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function validScope(value: { readonly workspaceId: WorkspaceId; readonly campaignId: CampaignId }): boolean {
  return isNonEmptyString(value.workspaceId) && isNonEmptyString(value.campaignId);
}

function validHumanSubject(subject: HumanCampaignPolicySubject): boolean {
  return Boolean(subject)
    && subject.kind === "human"
    && validScope(subject)
    && isNonEmptyString(subject.userId)
    && isNonEmptyString(subject.membershipId)
    && isNonEmptyString(subject.membershipUpdatedAt)
    && Number.isFinite(Date.parse(subject.membershipUpdatedAt))
    && isNonEmptyString(subject.characterGrantVersion)
    && (CAMPAIGN_ROLES as readonly string[]).includes(subject.role)
    && (POLICY_MEMBERSHIP_STATES as readonly string[]).includes(subject.membershipState)
    && Array.isArray(subject.assignedCharacterIds)
    && subject.assignedCharacterIds.every(isNonEmptyString)
    && (subject.membershipExpiresAt === null
      || (isNonEmptyString(subject.membershipExpiresAt) && Number.isFinite(Date.parse(subject.membershipExpiresAt))));
}

function validMachineSubject(subject: MachineCampaignPolicySubject): boolean {
  return Boolean(subject)
    && subject.kind === "machine"
    && validScope(subject)
    && (subject.principalKind === "connector" || subject.principalKind === "service")
    && isNonEmptyString(subject.principalId)
    && isNonEmptyString(subject.credentialVersion)
    && (MACHINE_CREDENTIAL_STATES as readonly string[]).includes(subject.credentialState)
    && Array.isArray(subject.capabilities)
    && subject.capabilities.every((capability) =>
      (MACHINE_CAMPAIGN_CAPABILITIES as readonly string[]).includes(capability)
    );
}

function activeMembershipDecision(
  subject: HumanCampaignPolicySubject,
  evaluatedAt: string
): CampaignPolicyDecision | null {
  if (!(POLICY_MEMBERSHIP_STATES as readonly string[]).includes(subject.membershipState)) {
    return deny("POLICY_INPUT_INVALID");
  }
  if (subject.membershipState === "expired") return deny("MEMBERSHIP_EXPIRED");
  if (subject.membershipState !== "active") return deny("MEMBERSHIP_INACTIVE");

  const evaluatedAtMs = Date.parse(evaluatedAt);
  if (!Number.isFinite(evaluatedAtMs)) return deny("POLICY_INPUT_INVALID");
  if (subject.membershipExpiresAt === null) return null;

  const expiryMs = Date.parse(subject.membershipExpiresAt);
  if (!Number.isFinite(expiryMs)) return deny("POLICY_INPUT_INVALID");
  return expiryMs <= evaluatedAtMs ? deny("MEMBERSHIP_EXPIRED") : null;
}

function isManager(subject: HumanCampaignPolicySubject): boolean {
  return subject.role === "owner" || subject.role === "gm";
}

function hasAssignedCharacter(subject: HumanCampaignPolicySubject, characterId: unknown): boolean {
  return typeof characterId === "string"
    && subject.assignedCharacterIds.some((candidate) => candidate === characterId);
}

function validHumanRequest(request: HumanCampaignPolicyRequest): boolean {
  return Boolean(request)
    && validScope(request)
    && (HUMAN_CAMPAIGN_ACTIONS as readonly string[]).includes(request.action)
    && (HUMAN_POLICY_CHANNELS as readonly string[]).includes(request.channel);
}

export function authorizeHumanCampaignAction(
  subject: HumanCampaignPolicySubject,
  request: HumanCampaignPolicyRequest,
  evaluatedAt: string
): CampaignPolicyDecision {
  if (!validHumanSubject(subject) || !validHumanRequest(request)) return deny("POLICY_INPUT_INVALID");
  if (!exactScope(subject, request)) return deny("TENANT_MISMATCH");

  const membershipDecision = activeMembershipDecision(subject, evaluatedAt);
  if (membershipDecision) return membershipDecision;
  if (!(CAMPAIGN_ROLES as readonly string[]).includes(subject.role)) return deny("POLICY_INPUT_INVALID");
  if (!HUMAN_ACTIONS_BY_CHANNEL[request.channel].has(request.action)) {
    return deny("CHANNEL_ACTION_DENIED");
  }

  if (isManager(subject)) {
    if (request.action === "campaign.delete" && subject.role !== "owner") return deny("ROLE_REQUIRED");
    return allow("manager");
  }
  if (subject.role !== "player" || !PLAYER_ACTIONS.has(request.action)) return deny("ROLE_REQUIRED");

  if (request.action === "resource.write") {
    return request.resourceOwnerUserId === subject.userId ? allow("self") : deny("OWNERSHIP_REQUIRED");
  }
  if (["character.read", "character.write", "character.ask"].includes(request.action)) {
    return hasAssignedCharacter(subject, request.targetCharacterId)
      ? allow("self")
      : deny("CHARACTER_SCOPE_DENIED");
  }
  return allow("playerSafe");
}

function validMachineRequest(request: MachineCampaignPolicyRequest): boolean {
  return Boolean(request)
    && validScope(request)
    && (MACHINE_CAMPAIGN_CAPABILITIES as readonly string[]).includes(request.capability)
    && (MACHINE_POLICY_CHANNELS as readonly string[]).includes(request.channel);
}

export function authorizeMachineCampaignCapability(
  subject: MachineCampaignPolicySubject,
  request: MachineCampaignPolicyRequest
): CampaignPolicyDecision {
  if (!validMachineSubject(subject) || !validMachineRequest(request)) return deny("POLICY_INPUT_INVALID");
  if (!exactScope(subject, request)) return deny("TENANT_MISMATCH");
  if (!(MACHINE_CREDENTIAL_STATES as readonly string[]).includes(subject.credentialState)) {
    return deny("POLICY_INPUT_INVALID");
  }
  if (subject.credentialState !== "active") return deny("MACHINE_CREDENTIAL_INACTIVE");
  if (!MACHINE_CAPABILITIES_BY_CHANNEL[request.channel].has(request.capability)) {
    return deny("CHANNEL_ACTION_DENIED");
  }
  if (subject.principalKind === "connector" && ["job:execute", "notification:deliver"].includes(request.capability)) {
    return deny("MACHINE_SCOPE_DENIED");
  }
  if (subject.principalKind === "service" && request.capability === "foundry:ingest") {
    return deny("MACHINE_SCOPE_DENIED");
  }
  if (!subject.capabilities.includes(request.capability)) return deny("MACHINE_SCOPE_DENIED");
  return allow("machine");
}

function validResourcePolicy(resource: CampaignResourcePolicy): boolean {
  return Boolean(resource)
    && validScope(resource)
    && (EDITORIAL_STATES as readonly string[]).includes(resource.editorialState)
    && (AUDIENCES as readonly string[]).includes(resource.audience)
    && (RELEASE_STATES as readonly string[]).includes(resource.releaseState)
    && (CAMPAIGN_CONTENT_CLASSES as readonly string[]).includes(resource.contentClass)
    && Array.isArray(resource.explicitUserIds)
    && resource.explicitUserIds.every(isNonEmptyString)
    && Array.isArray(resource.explicitCharacterIds)
    && resource.explicitCharacterIds.every(isNonEmptyString);
}

export function evaluateCampaignResourceRead(
  subject: HumanCampaignPolicySubject,
  resource: CampaignResourcePolicy,
  evaluatedAt: string
): CampaignPolicyDecision {
  if (!validHumanSubject(subject) || !validResourcePolicy(resource)) return deny("POLICY_INPUT_INVALID");
  if (!exactScope(subject, resource)) return deny("TENANT_MISMATCH");

  const membershipDecision = activeMembershipDecision(subject, evaluatedAt);
  if (membershipDecision) return membershipDecision;
  if (!(CAMPAIGN_ROLES as readonly string[]).includes(subject.role)) return deny("POLICY_INPUT_INVALID");
  if (isManager(subject)) return allow("manager");
  if (subject.role !== "player") return deny("ROLE_REQUIRED");

  if (resource.contentClass !== "approvedCanon") return deny("RESOURCE_SENSITIVE");
  if (resource.editorialState !== "active") return deny("RESOURCE_NOT_ACTIVE");
  if (resource.releaseState === "hidden") return deny("RESOURCE_HIDDEN");
  if (resource.audience === "party") return allow("playerSafe");
  if (resource.audience === "gmOnly") return deny("ROLE_REQUIRED");

  const userGrant = resource.explicitUserIds.includes(subject.userId);
  const characterGrant = resource.explicitCharacterIds.some((characterId) =>
    subject.assignedCharacterIds.includes(characterId)
  );
  return userGrant || characterGrant ? allow("self") : deny("RESOURCE_SUBJECT_DENIED");
}

export function deriveCampaignReadScope(
  subject: HumanCampaignPolicySubject,
  workspaceId: WorkspaceId,
  campaignId: CampaignId,
  evaluatedAt: string
): CampaignPolicyReadScopeResult {
  if (!validHumanSubject(subject) || !validScope({ workspaceId, campaignId })) {
    return { decision: deny("POLICY_INPUT_INVALID"), scope: null };
  }
  if (!exactScope(subject, { workspaceId, campaignId })) {
    return { decision: deny("TENANT_MISMATCH"), scope: null };
  }
  const membershipDecision = activeMembershipDecision(subject, evaluatedAt);
  if (membershipDecision) return { decision: membershipDecision, scope: null };
  if (!(CAMPAIGN_ROLES as readonly string[]).includes(subject.role)) {
    return { decision: deny("POLICY_INPUT_INVALID"), scope: null };
  }

  if (isManager(subject)) {
    return {
      decision: allow("manager"),
      scope: {
        workspaceId,
        campaignId,
        viewer: "manager",
        editorialStates: [...EDITORIAL_STATES],
        audiences: [...AUDIENCES],
        releaseStates: [...RELEASE_STATES],
        contentClasses: [...CAMPAIGN_CONTENT_CLASSES],
        explicitUserId: null,
        explicitCharacterIds: [],
        policyVersion: CAMPAIGN_POLICY_VERSION
      }
    };
  }
  if (subject.role !== "player") return { decision: deny("ROLE_REQUIRED"), scope: null };
  return {
    decision: allow("playerSafe"),
    scope: {
      workspaceId,
      campaignId,
      viewer: "player",
      editorialStates: ["active"],
      audiences: ["party", "specificPlayers"],
      releaseStates: ["public", "revealed"],
      contentClasses: ["approvedCanon"],
      explicitUserId: subject.userId,
      explicitCharacterIds: [...subject.assignedCharacterIds].sort(),
      policyVersion: CAMPAIGN_POLICY_VERSION
    }
  };
}

function cacheSegment(value: unknown): string {
  return encodeURIComponent(String(value ?? ""));
}

export function buildCampaignPolicyCacheKey(
  subject: HumanCampaignPolicySubject | MachineCampaignPolicySubject,
  namespace: CampaignPolicyCacheNamespace
): string {
  if (!(CAMPAIGN_POLICY_CACHE_NAMESPACES as readonly string[]).includes(namespace)) {
    throw new Error("Unknown campaign policy cache namespace");
  }
  if (subject.kind === "human" ? !validHumanSubject(subject) : !validMachineSubject(subject)) {
    throw new Error("Invalid campaign policy cache subject");
  }
  const common = [
    CAMPAIGN_POLICY_VERSION,
    namespace,
    subject.kind,
    subject.workspaceId,
    subject.campaignId
  ];
  const specific = subject.kind === "human"
    ? [
        subject.userId,
        subject.membershipId,
        subject.role,
        subject.membershipState,
        subject.membershipExpiresAt ?? "",
        subject.membershipUpdatedAt,
        [...subject.assignedCharacterIds].sort().join(","),
        subject.characterGrantVersion
      ]
    : [
        subject.principalKind,
        subject.principalId,
        subject.credentialState,
        subject.credentialVersion,
        [...subject.capabilities].sort().join(",")
      ];
  return [...common, ...specific].map(cacheSegment).join("|");
}
