import type {
  CampaignId,
  CharacterId,
  MembershipId,
  UserId,
  WorkspaceId
} from "./ids.js";
import type {
  Audience,
  EditorialState,
  ReleaseState
} from "./archive.js";
import type { CampaignRole } from "./identity.js";

export const POLICY_MEMBERSHIP_STATES = ["active", "invited", "removed", "expired"] as const;
export const MACHINE_CREDENTIAL_STATES = ["active", "revoked", "expired"] as const;
export const HUMAN_POLICY_CHANNELS = ["web", "discord", "ai", "export"] as const;
export const MACHINE_POLICY_CHANNELS = ["job", "foundry", "notification", "export"] as const;
export const HUMAN_CAMPAIGN_ACTIONS = [
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
  "discord.command.player",
  "discord.command.gm",
  "export.party.create",
  "export.gm.create",
  "campaign.delete"
] as const;
export const MACHINE_CAMPAIGN_CAPABILITIES = [
  "job:execute",
  "foundry:ingest",
  "notification:deliver",
  "archive:read:party",
  "archive:read:gm",
  "export:create:party",
  "export:create:gm"
] as const;
export const CAMPAIGN_CONTENT_CLASSES = [
  "approvedCanon",
  "rawEvidence",
  "secretCheck",
  "hiddenAchievement"
] as const;
export const CAMPAIGN_POLICY_CACHE_NAMESPACES = [
  "archive",
  "character",
  "ask",
  "discord",
  "foundry",
  "job",
  "notification",
  "export"
] as const;
export const CAMPAIGN_POLICY_DENIAL_CODES = [
  "TENANT_MISMATCH",
  "MEMBERSHIP_INACTIVE",
  "MEMBERSHIP_EXPIRED",
  "MACHINE_CREDENTIAL_INACTIVE",
  "CHANNEL_ACTION_DENIED",
  "ROLE_REQUIRED",
  "OWNERSHIP_REQUIRED",
  "CHARACTER_SCOPE_DENIED",
  "MACHINE_SCOPE_DENIED",
  "RESOURCE_NOT_ACTIVE",
  "RESOURCE_HIDDEN",
  "RESOURCE_SENSITIVE",
  "RESOURCE_SUBJECT_DENIED",
  "POLICY_INPUT_INVALID"
] as const;

export type PolicyMembershipState = (typeof POLICY_MEMBERSHIP_STATES)[number];
export type MachineCredentialState = (typeof MACHINE_CREDENTIAL_STATES)[number];
export type HumanPolicyChannel = (typeof HUMAN_POLICY_CHANNELS)[number];
export type MachinePolicyChannel = (typeof MACHINE_POLICY_CHANNELS)[number];
export type PolicyChannel = HumanPolicyChannel | MachinePolicyChannel;
export type HumanCampaignAction = (typeof HUMAN_CAMPAIGN_ACTIONS)[number];
export type MachineCampaignCapability = (typeof MACHINE_CAMPAIGN_CAPABILITIES)[number];
export type CampaignContentClass = (typeof CAMPAIGN_CONTENT_CLASSES)[number];
export type CampaignPolicyCacheNamespace = (typeof CAMPAIGN_POLICY_CACHE_NAMESPACES)[number];
export type CampaignPolicyDenialCode = (typeof CAMPAIGN_POLICY_DENIAL_CODES)[number];
export type CampaignPolicyEffect = "manager" | "playerSafe" | "self" | "machine";

export type CampaignPolicyCacheDiscriminator =
  | {
      readonly kind: "humanAction";
      readonly requestedWorkspaceId: WorkspaceId;
      readonly requestedCampaignId: CampaignId;
      readonly channel: HumanPolicyChannel;
      readonly action: HumanCampaignAction;
      readonly resourceOwnerUserId: UserId | null;
      readonly targetCharacterId: CharacterId | null;
    }
  | {
      readonly kind: "machineCapability";
      readonly requestedWorkspaceId: WorkspaceId;
      readonly requestedCampaignId: CampaignId;
      readonly channel: MachinePolicyChannel;
      readonly capability: MachineCampaignCapability;
    }
  | {
      readonly kind: "resourceRead";
      readonly requestedWorkspaceId: WorkspaceId;
      readonly requestedCampaignId: CampaignId;
      readonly resourceId: string;
      readonly resourcePolicyVersion: string;
    }
  | {
      readonly kind: "readScope";
      readonly requestedWorkspaceId: WorkspaceId;
      readonly requestedCampaignId: CampaignId;
    };

export interface HumanCampaignPolicySubject {
  readonly kind: "human";
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly membershipId: MembershipId;
  readonly role: CampaignRole;
  readonly membershipState: PolicyMembershipState;
  readonly membershipExpiresAt: string | null;
  readonly membershipUpdatedAt: string;
  readonly assignedCharacterIds: readonly CharacterId[];
  readonly characterGrantVersion: string;
}

export interface MachineCampaignPolicySubject {
  readonly kind: "machine";
  readonly principalKind: "connector" | "service";
  readonly principalId: string;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly credentialState: MachineCredentialState;
  readonly credentialVersion: string;
  readonly capabilities: readonly MachineCampaignCapability[];
}

export type CampaignPolicySubject = HumanCampaignPolicySubject | MachineCampaignPolicySubject;

export interface HumanCampaignPolicyRequest {
  readonly channel: HumanPolicyChannel;
  readonly action: HumanCampaignAction;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly resourceOwnerUserId?: UserId | null;
  readonly targetCharacterId?: CharacterId | null;
}

export interface MachineCampaignPolicyRequest {
  readonly channel: MachinePolicyChannel;
  readonly capability: MachineCampaignCapability;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
}

export interface CampaignResourcePolicy {
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly editorialState: EditorialState;
  readonly audience: Audience;
  readonly releaseState: ReleaseState;
  readonly contentClass: CampaignContentClass;
  readonly explicitUserIds: readonly UserId[];
  readonly explicitCharacterIds: readonly CharacterId[];
}

export interface CampaignPolicyAllowed {
  readonly allowed: true;
  readonly code: "POLICY_ALLOWED";
  readonly effect: CampaignPolicyEffect;
  readonly policyVersion: string;
}

export interface CampaignPolicyDenied {
  readonly allowed: false;
  readonly code: CampaignPolicyDenialCode;
  readonly policyVersion: string;
}

export type CampaignPolicyDecision = CampaignPolicyAllowed | CampaignPolicyDenied;

export interface CampaignPolicyReadScope {
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly viewer: "manager" | "player";
  readonly editorialStates: readonly EditorialState[];
  readonly audiences: readonly Audience[];
  readonly releaseStates: readonly ReleaseState[];
  readonly contentClasses: readonly CampaignContentClass[];
  readonly explicitUserId: UserId | null;
  readonly explicitCharacterIds: readonly CharacterId[];
  readonly policyVersion: string;
}

export interface CampaignPolicyReadScopeResult {
  readonly decision: CampaignPolicyDecision;
  readonly scope: CampaignPolicyReadScope | null;
}
