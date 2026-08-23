import { expectString } from "./validation.js";

declare const aggregateIdBrand: unique symbol;

export type AggregateId<Name extends string> = string & {
  readonly [aggregateIdBrand]: Name;
};

export type UserId = AggregateId<"UserId">;
export type WorkspaceId = AggregateId<"WorkspaceId">;
export type CampaignId = AggregateId<"CampaignId">;
export type MembershipId = AggregateId<"MembershipId">;
export type EntryId = AggregateId<"EntryId">;
export type WorldId = AggregateId<"WorldId">;
export type CharacterId = AggregateId<"CharacterId">;
export type IntegrationConnectionId = AggregateId<"IntegrationConnectionId">;
export type IntegrationEventId = AggregateId<"IntegrationEventId">;
export type SessionId = AggregateId<"SessionId">;

function parseAggregateId<Name extends string>(value: unknown, path: string): AggregateId<Name> {
  return expectString(value, path) as AggregateId<Name>;
}

export function parseUserId(value: unknown, path = "userId"): UserId {
  return parseAggregateId<"UserId">(value, path);
}

export function parseWorkspaceId(value: unknown, path = "workspaceId"): WorkspaceId {
  return parseAggregateId<"WorkspaceId">(value, path);
}

export function parseCampaignId(value: unknown, path = "campaignId"): CampaignId {
  return parseAggregateId<"CampaignId">(value, path);
}

export function parseMembershipId(value: unknown, path = "membershipId"): MembershipId {
  return parseAggregateId<"MembershipId">(value, path);
}

export function parseEntryId(value: unknown, path = "entryId"): EntryId {
  return parseAggregateId<"EntryId">(value, path);
}

export function parseWorldId(value: unknown, path = "worldId"): WorldId {
  return parseAggregateId<"WorldId">(value, path);
}

export function parseCharacterId(value: unknown, path = "characterId"): CharacterId {
  return parseAggregateId<"CharacterId">(value, path);
}

export function parseIntegrationConnectionId(
  value: unknown,
  path = "connectionId"
): IntegrationConnectionId {
  return parseAggregateId<"IntegrationConnectionId">(value, path);
}

export function parseIntegrationEventId(value: unknown, path = "eventId"): IntegrationEventId {
  return parseAggregateId<"IntegrationEventId">(value, path);
}

export function parseSessionId(value: unknown, path = "sessionId"): SessionId {
  return parseAggregateId<"SessionId">(value, path);
}
