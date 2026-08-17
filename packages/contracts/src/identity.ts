import {
  parseCampaignId,
  parseMembershipId,
  parseUserId,
  parseWorkspaceId,
  type CampaignId,
  type MembershipId,
  type UserId,
  type WorkspaceId
} from "./ids.js";
import {
  expectBoolean,
  expectEnum,
  expectExactKeys,
  expectInteger,
  expectJsonObject,
  expectNullableString,
  expectRecord,
  expectString,
  type JsonObject
} from "./validation.js";

export const CAMPAIGN_ROLES: readonly ["owner", "gm", "player"] = ["owner", "gm", "player"];
export const RECORD_STATUSES: readonly ["active", "inactive", "archived"] = ["active", "inactive", "archived"];
export const MEMBERSHIP_STATUSES: readonly ["active", "removed", "invited"] = ["active", "removed", "invited"];

export type CampaignRole = (typeof CAMPAIGN_ROLES)[number];
export type RecordStatus = (typeof RECORD_STATUSES)[number];
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface UserContract {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly status: RecordStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SessionPrincipalContract {
  readonly userId: UserId;
  readonly sessionVersion: number;
  readonly platformAdmin: boolean;
  readonly activeWorkspaceId: WorkspaceId | null;
  readonly activeCampaignId: CampaignId | null;
  readonly membershipId: MembershipId | null;
  readonly role: CampaignRole | null;
}

export interface WorkspaceContract {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly ownerUserId: UserId;
  readonly status: RecordStatus;
  readonly plan: string;
  readonly subscriptionStatus: string;
  readonly settings: JsonObject;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CampaignContract {
  readonly id: CampaignId;
  readonly workspaceId: WorkspaceId;
  readonly name: string;
  readonly description: string;
  readonly ownerUserId: UserId;
  readonly status: RecordStatus;
  readonly activeWorldId: string;
  readonly defaultLanguage: string;
  readonly settings: JsonObject;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MembershipContract {
  readonly id: MembershipId;
  readonly userId: UserId;
  readonly workspaceId: WorkspaceId;
  readonly campaignId: CampaignId;
  readonly role: CampaignRole;
  readonly status: MembershipStatus;
  readonly displayName: string;
  readonly joinedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function nullableWorkspaceId(value: unknown, path: string): WorkspaceId | null {
  const parsed = expectNullableString(value, path);
  return parsed === null ? null : parseWorkspaceId(parsed, path);
}

function nullableCampaignId(value: unknown, path: string): CampaignId | null {
  const parsed = expectNullableString(value, path);
  return parsed === null ? null : parseCampaignId(parsed, path);
}

function nullableMembershipId(value: unknown, path: string): MembershipId | null {
  const parsed = expectNullableString(value, path);
  return parsed === null ? null : parseMembershipId(parsed, path);
}

export function parseCampaignRole(value: unknown, path = "role"): CampaignRole {
  return expectEnum(value, CAMPAIGN_ROLES, path);
}

export function parseUserContract(value: unknown, path = "user"): UserContract {
  const item = expectRecord(value, path);
  expectExactKeys(item, ["id", "email", "displayName", "status", "createdAt", "updatedAt"], path);
  return {
    id: parseUserId(item["id"], `${path}.id`),
    email: expectString(item["email"], `${path}.email`),
    displayName: expectString(item["displayName"], `${path}.displayName`),
    status: expectEnum(item["status"], RECORD_STATUSES, `${path}.status`),
    createdAt: expectString(item["createdAt"], `${path}.createdAt`),
    updatedAt: expectString(item["updatedAt"], `${path}.updatedAt`)
  };
}

export function parseSessionPrincipalContract(
  value: unknown,
  path = "principal"
): SessionPrincipalContract {
  const item = expectRecord(value, path);
  expectExactKeys(
    item,
    [
      "userId",
      "sessionVersion",
      "platformAdmin",
      "activeWorkspaceId",
      "activeCampaignId",
      "membershipId",
      "role"
    ],
    path
  );
  const roleValue = item["role"];
  return {
    userId: parseUserId(item["userId"], `${path}.userId`),
    sessionVersion: expectInteger(item["sessionVersion"], `${path}.sessionVersion`),
    platformAdmin: expectBoolean(item["platformAdmin"], `${path}.platformAdmin`),
    activeWorkspaceId: nullableWorkspaceId(item["activeWorkspaceId"], `${path}.activeWorkspaceId`),
    activeCampaignId: nullableCampaignId(item["activeCampaignId"], `${path}.activeCampaignId`),
    membershipId: nullableMembershipId(item["membershipId"], `${path}.membershipId`),
    role: roleValue === null ? null : parseCampaignRole(roleValue, `${path}.role`)
  };
}

export function parseWorkspaceContract(value: unknown, path = "workspace"): WorkspaceContract {
  const item = expectRecord(value, path);
  expectExactKeys(
    item,
    ["id", "name", "ownerUserId", "status", "plan", "subscriptionStatus", "settings", "createdAt", "updatedAt"],
    path
  );
  return {
    id: parseWorkspaceId(item["id"], `${path}.id`),
    name: expectString(item["name"], `${path}.name`),
    ownerUserId: parseUserId(item["ownerUserId"], `${path}.ownerUserId`),
    status: expectEnum(item["status"], RECORD_STATUSES, `${path}.status`),
    plan: expectString(item["plan"], `${path}.plan`),
    subscriptionStatus: expectString(item["subscriptionStatus"], `${path}.subscriptionStatus`),
    settings: expectJsonObject(item["settings"], `${path}.settings`),
    createdAt: expectString(item["createdAt"], `${path}.createdAt`),
    updatedAt: expectString(item["updatedAt"], `${path}.updatedAt`)
  };
}

export function parseCampaignContract(value: unknown, path = "campaign"): CampaignContract {
  const item = expectRecord(value, path);
  expectExactKeys(
    item,
    [
      "id",
      "workspaceId",
      "name",
      "description",
      "ownerUserId",
      "status",
      "activeWorldId",
      "defaultLanguage",
      "settings",
      "createdAt",
      "updatedAt"
    ],
    path
  );
  return {
    id: parseCampaignId(item["id"], `${path}.id`),
    workspaceId: parseWorkspaceId(item["workspaceId"], `${path}.workspaceId`),
    name: expectString(item["name"], `${path}.name`),
    description: expectString(item["description"], `${path}.description`, true),
    ownerUserId: parseUserId(item["ownerUserId"], `${path}.ownerUserId`),
    status: expectEnum(item["status"], RECORD_STATUSES, `${path}.status`),
    activeWorldId: expectString(item["activeWorldId"], `${path}.activeWorldId`, true),
    defaultLanguage: expectString(item["defaultLanguage"], `${path}.defaultLanguage`),
    settings: expectJsonObject(item["settings"], `${path}.settings`),
    createdAt: expectString(item["createdAt"], `${path}.createdAt`),
    updatedAt: expectString(item["updatedAt"], `${path}.updatedAt`)
  };
}

export function parseMembershipContract(value: unknown, path = "membership"): MembershipContract {
  const item = expectRecord(value, path);
  expectExactKeys(
    item,
    ["id", "userId", "workspaceId", "campaignId", "role", "status", "displayName", "joinedAt", "createdAt", "updatedAt"],
    path
  );
  return {
    id: parseMembershipId(item["id"], `${path}.id`),
    userId: parseUserId(item["userId"], `${path}.userId`),
    workspaceId: parseWorkspaceId(item["workspaceId"], `${path}.workspaceId`),
    campaignId: parseCampaignId(item["campaignId"], `${path}.campaignId`),
    role: parseCampaignRole(item["role"], `${path}.role`),
    status: expectEnum(item["status"], MEMBERSHIP_STATUSES, `${path}.status`),
    displayName: expectString(item["displayName"], `${path}.displayName`, true),
    joinedAt: expectString(item["joinedAt"], `${path}.joinedAt`, true),
    createdAt: expectString(item["createdAt"], `${path}.createdAt`),
    updatedAt: expectString(item["updatedAt"], `${path}.updatedAt`)
  };
}
