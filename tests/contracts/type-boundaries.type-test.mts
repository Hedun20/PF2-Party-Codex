import {
  parseCampaignId,
  parseEntryId,
  parseMembershipId,
  parseUserId,
  parseWorkspaceId,
  type CampaignId,
  type EntryId,
  type MembershipId,
  type PlayerArchiveEntryDto,
  type UserId,
  type WorkspaceId
} from "@pf2-party-codex/contracts";

function requireCampaignId(_value: CampaignId): void {}
function requireEntryId(_value: EntryId): void {}
function requireMembershipId(_value: MembershipId): void {}
function requireUserId(_value: UserId): void {}
function requireWorkspaceId(_value: WorkspaceId): void {}

const campaignId = parseCampaignId("campaign-redacted-001");
const entryId = parseEntryId("entry-redacted-001");
const membershipId = parseMembershipId("membership-redacted-001");
const userId = parseUserId("user-redacted-001");
const workspaceId = parseWorkspaceId("workspace-redacted-001");

requireCampaignId(campaignId);
requireEntryId(entryId);
requireMembershipId(membershipId);
requireUserId(userId);
requireWorkspaceId(workspaceId);

// @ts-expect-error workspace IDs must never cross a campaign boundary.
requireCampaignId(workspaceId);
// @ts-expect-error campaign IDs must never cross a user boundary.
requireUserId(campaignId);
// @ts-expect-error entry IDs must never cross a membership boundary.
requireMembershipId(entryId);

declare const playerEntry: PlayerArchiveEntryDto;
// @ts-expect-error player DTOs intentionally expose no GM content field.
playerEntry.gmContent;
