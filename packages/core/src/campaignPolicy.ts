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
  type CampaignPolicyCacheDiscriminator,
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

function isCanonicalInstant(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const instant = Date.parse(value);
  return Number.isFinite(instant) && new Date(instant).toISOString() === value;
}

function isDenseArrayOf(value: unknown, predicate: (item: unknown) => boolean): boolean {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index) || !predicate(value[index])) return false;
  }
  return true;
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
    && isCanonicalInstant(subject.membershipUpdatedAt)
    && isNonEmptyString(subject.characterGrantVersion)
    && (CAMPAIGN_ROLES as readonly string[]).includes(subject.role)
    && (POLICY_MEMBERSHIP_STATES as readonly string[]).includes(subject.membershipState)
    && isDenseArrayOf(subject.assignedCharacterIds, isNonEmptyString)
    && (subject.membershipExpiresAt === null
      || isCanonicalInstant(subject.membershipExpiresAt));
}

function validMachineSubject(subject: MachineCampaignPolicySubject): boolean {
  return Boolean(subject)
    && subject.kind === "machine"
    && validScope(subject)
    && (subject.principalKind === "connector" || subject.principalKind === "service")
    && isNonEmptyString(subject.principalId)
    && isNonEmptyString(subject.credentialVersion)
    && (MACHINE_CREDENTIAL_STATES as readonly string[]).includes(subject.credentialState)
    && isDenseArrayOf(subject.capabilities, (capability) =>
      isNonEmptyString(capability)
        && (MACHINE_CAMPAIGN_CAPABILITIES as readonly string[]).includes(capability)
    );
}

function activeMembershipDecision(
  subject: HumanCampaignPolicySubject,
  evaluatedAt: string
): CampaignPolicyDecision | null {
  if (!isCanonicalInstant(evaluatedAt)) return deny("POLICY_INPUT_INVALID");
  if (!(POLICY_MEMBERSHIP_STATES as readonly string[]).includes(subject.membershipState)) {
    return deny("POLICY_INPUT_INVALID");
  }
  if (subject.membershipState === "expired") return deny("MEMBERSHIP_EXPIRED");
  if (subject.membershipState !== "active") return deny("MEMBERSHIP_INACTIVE");

  if (subject.membershipExpiresAt === null) return null;
  return Date.parse(subject.membershipExpiresAt) <= Date.parse(evaluatedAt)
    ? deny("MEMBERSHIP_EXPIRED")
    : null;
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
    && isDenseArrayOf(resource.explicitUserIds, isNonEmptyString)
    && isDenseArrayOf(resource.explicitCharacterIds, isNonEmptyString);
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

function cacheArraySegment(values: readonly string[]): string {
  return JSON.stringify([...values].sort());
}

function hasExactKeys(value: object, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return actualKeys.length === expectedKeys.length
    && actualKeys.every((key, index) => key === [...expectedKeys].sort()[index]);
}

function validCacheDiscriminator(
  subject: HumanCampaignPolicySubject | MachineCampaignPolicySubject,
  discriminator: CampaignPolicyCacheDiscriminator
): boolean {
  if (!discriminator || typeof discriminator !== "object") return false;
  switch (discriminator.kind) {
    case "humanAction":
      return subject.kind === "human"
        && hasExactKeys(discriminator, [
          "action",
          "channel",
          "kind",
          "requestedCampaignId",
          "requestedWorkspaceId",
          "resourceOwnerUserId",
          "targetCharacterId"
        ])
        && isNonEmptyString(discriminator.requestedWorkspaceId)
        && isNonEmptyString(discriminator.requestedCampaignId)
        && (HUMAN_POLICY_CHANNELS as readonly string[]).includes(discriminator.channel)
        && (HUMAN_CAMPAIGN_ACTIONS as readonly string[]).includes(discriminator.action)
        && (discriminator.resourceOwnerUserId === null
          || isNonEmptyString(discriminator.resourceOwnerUserId))
        && (discriminator.targetCharacterId === null
          || isNonEmptyString(discriminator.targetCharacterId));
    case "machineCapability":
      return subject.kind === "machine"
        && hasExactKeys(discriminator, [
          "capability",
          "channel",
          "kind",
          "requestedCampaignId",
          "requestedWorkspaceId"
        ])
        && isNonEmptyString(discriminator.requestedWorkspaceId)
        && isNonEmptyString(discriminator.requestedCampaignId)
        && (MACHINE_POLICY_CHANNELS as readonly string[]).includes(discriminator.channel)
        && (MACHINE_CAMPAIGN_CAPABILITIES as readonly string[]).includes(discriminator.capability);
    case "resourceRead":
      return subject.kind === "human"
        && hasExactKeys(discriminator, [
          "kind",
          "requestedCampaignId",
          "requestedWorkspaceId",
          "resourceId",
          "resourcePolicyVersion"
        ])
        && isNonEmptyString(discriminator.requestedWorkspaceId)
        && isNonEmptyString(discriminator.requestedCampaignId)
        && isNonEmptyString(discriminator.resourceId)
        && isNonEmptyString(discriminator.resourcePolicyVersion);
    case "readScope":
      return subject.kind === "human"
        && hasExactKeys(discriminator, ["kind", "requestedCampaignId", "requestedWorkspaceId"])
        && isNonEmptyString(discriminator.requestedWorkspaceId)
        && isNonEmptyString(discriminator.requestedCampaignId);
    default:
      return false;
  }
}

function cacheDiscriminatorSegments(discriminator: CampaignPolicyCacheDiscriminator): readonly string[] {
  const requestedTenant = [discriminator.requestedWorkspaceId, discriminator.requestedCampaignId];
  switch (discriminator.kind) {
    case "humanAction":
      return [
        "human-action",
        ...requestedTenant,
        discriminator.channel,
        discriminator.action,
        discriminator.resourceOwnerUserId ?? "",
        discriminator.targetCharacterId ?? ""
      ];
    case "machineCapability":
      return ["machine-capability", ...requestedTenant, discriminator.channel, discriminator.capability];
    case "resourceRead":
      return ["resource-read", ...requestedTenant, discriminator.resourceId, discriminator.resourcePolicyVersion];
    case "readScope":
      return ["read-scope", ...requestedTenant];
  }
}

export function buildCampaignPolicyCacheKey(
  subject: HumanCampaignPolicySubject | MachineCampaignPolicySubject,
  namespace: CampaignPolicyCacheNamespace,
  discriminator: CampaignPolicyCacheDiscriminator,
  evaluatedAt: string
): string {
  if (!(CAMPAIGN_POLICY_CACHE_NAMESPACES as readonly string[]).includes(namespace)) {
    throw new Error("Unknown campaign policy cache namespace");
  }
  if (!subject || typeof subject !== "object") {
    throw new Error("Invalid campaign policy cache subject");
  }
  if (subject.kind === "human" ? !validHumanSubject(subject) : !validMachineSubject(subject)) {
    throw new Error("Invalid campaign policy cache subject");
  }
  if (!isCanonicalInstant(evaluatedAt)) {
    throw new Error("Invalid campaign policy cache evaluation instant");
  }
  if (!validCacheDiscriminator(subject, discriminator)) {
    throw new Error("Invalid campaign policy cache discriminator");
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
        subject.membershipExpiresAt !== null
          && Date.parse(subject.membershipExpiresAt) <= Date.parse(evaluatedAt)
          ? "membership-expired"
          : "membership-current",
        subject.membershipUpdatedAt,
        cacheArraySegment(subject.assignedCharacterIds),
        subject.characterGrantVersion
      ]
    : [
        subject.principalKind,
        subject.principalId,
        subject.credentialState,
        subject.credentialVersion,
        cacheArraySegment(subject.capabilities)
      ];
  return [...common, ...specific, ...cacheDiscriminatorSegments(discriminator)]
    .map(cacheSegment)
    .join("|");
}
