import {
  parseCampaignId,
  parseCharacterId,
  parseEntryId,
  parseIntegrationConnectionId,
  parseIntegrationEventId,
  parseMembershipId,
  parseSessionId,
  parseUserId,
  parseWorldId,
  parseWorkspaceId,
  resolveVerifiedCampaignContextContract,
  type CampaignContract,
  type CampaignId,
  type CharacterId,
  type EntryId,
  type IntegrationConnectionId,
  type IntegrationEventId,
  type MembershipId,
  type MembershipContract,
  type PlayerArchiveEntryDto,
  type SessionPrincipalContract,
  type SessionId,
  type MachineCampaignPolicySubject,
  type UserId,
  type WorldId,
  type WorkspaceId
} from "@pf2-party-codex/contracts";

function requireCampaignId(_value: CampaignId): void {}
function requireCharacterId(_value: CharacterId): void {}
function requireEntryId(_value: EntryId): void {}
function requireIntegrationConnectionId(_value: IntegrationConnectionId): void {}
function requireIntegrationEventId(_value: IntegrationEventId): void {}
function requireMembershipId(_value: MembershipId): void {}
function requireSessionId(_value: SessionId): void {}
function requireUserId(_value: UserId): void {}
function requireWorldId(_value: WorldId): void {}
function requireWorkspaceId(_value: WorkspaceId): void {}

const campaignId = parseCampaignId("campaign-redacted-001");
const characterId = parseCharacterId("character-redacted-001");
const entryId = parseEntryId("entry-redacted-001");
const integrationConnectionId = parseIntegrationConnectionId("connection-redacted-001");
const integrationEventId = parseIntegrationEventId("event-redacted-001");
const membershipId = parseMembershipId("membership-redacted-001");
const sessionId = parseSessionId("session-redacted-001");
const userId = parseUserId("user-redacted-001");
const worldId = parseWorldId("world-redacted-001");
const workspaceId = parseWorkspaceId("workspace-redacted-001");

requireCampaignId(campaignId);
requireCharacterId(characterId);
requireEntryId(entryId);
requireIntegrationConnectionId(integrationConnectionId);
requireIntegrationEventId(integrationEventId);
requireMembershipId(membershipId);
requireSessionId(sessionId);
requireUserId(userId);
requireWorldId(worldId);
requireWorkspaceId(workspaceId);

// @ts-expect-error workspace IDs must never cross a campaign boundary.
requireCampaignId(workspaceId);
// @ts-expect-error campaign IDs must never cross a user boundary.
requireUserId(campaignId);
// @ts-expect-error entry IDs must never cross a membership boundary.
requireMembershipId(entryId);
// @ts-expect-error connection IDs must never cross an integration-event boundary.
requireIntegrationEventId(integrationConnectionId);
// @ts-expect-error integration-event IDs must never cross a campaign-session boundary.
requireSessionId(integrationEventId);

const activeWorldId: CampaignContract["activeWorldId"] = worldId;
const emptyActiveWorldId: CampaignContract["activeWorldId"] = "";
void activeWorldId;
void emptyActiveWorldId;
// @ts-expect-error campaign IDs cannot be assigned to the active world boundary.
const invalidActiveWorldId: CampaignContract["activeWorldId"] = campaignId;
void invalidActiveWorldId;

declare const principal: SessionPrincipalContract;
// @ts-expect-error campaign authorization is not stored on the session principal.
principal.role;
// @ts-expect-error campaign membership is not stored on the session principal.
principal.membershipId;

declare const membership: MembershipContract;
resolveVerifiedCampaignContextContract(principal, membership, campaignId);
// @ts-expect-error verified campaign resolution requires an exact campaign ID.
resolveVerifiedCampaignContextContract(principal, membership, workspaceId);

declare const playerEntry: PlayerArchiveEntryDto;
// @ts-expect-error player DTOs intentionally expose no GM content field.
playerEntry.gmContent;

declare const machineSubject: MachineCampaignPolicySubject;
// @ts-expect-error machine credentials never receive a campaign role.
machineSubject.role;
// @ts-expect-error campaign IDs cannot cross a character policy boundary.
requireCharacterId(campaignId);
