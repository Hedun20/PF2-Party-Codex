import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ContractValidationError,
  normalizeLegacyEntryVisibility,
  parseCampaignContract,
  parseCompatibilityResponse,
  parseGmArchiveEntryDto,
  parseMembershipContract,
  parsePlayerArchiveEntryDto,
  parseSessionPrincipalContract,
  resolveVerifiedCampaignContextContract
} from "../../packages/contracts/dist/index.js";
import {
  evaluatePlayerArchiveRead,
  toPlayerArchiveEntryDto
} from "../../packages/core/dist/index.js";

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
}

test("the synthetic current GM entry shape validates", async () => {
  const currentGmEntry = await fixture("gm-entry.json");
  const parsed = parseGmArchiveEntryDto(currentGmEntry);
  assert.equal(parsed.id, "entry-redacted-001");
  assert.equal(parsed.gmContent, currentGmEntry.gmContent);
});

test("the target player DTO omits GM fields and validates", async () => {
  const currentGmEntry = await fixture("gm-entry.json");
  const expectedPlayerEntry = await fixture("target-player-entry.json");
  const playerEntry = toPlayerArchiveEntryDto(currentGmEntry);

  assert.deepEqual(playerEntry, expectedPlayerEntry);
  assert.deepEqual(parsePlayerArchiveEntryDto(playerEntry), expectedPlayerEntry);
  assert.doesNotMatch(
    JSON.stringify(playerEntry),
    /"(?:gmContent|gmNotes|gmSecrets|secret|secrets|source|createdBy|updatedBy|password)"\s*:/i
  );
});

test("the current player serializer incompatibility is explicit", async () => {
  const currentPlayerEntry = await fixture("current-player-entry.json");
  assert.throws(
    () => parsePlayerArchiveEntryDto(currentPlayerEntry),
    (error) => error instanceof ContractValidationError && error.path === "entry.gmContent"
  );
});

test("player DTOs reject nested GM-only keys and private records", async () => {
  const targetPlayerEntry = await fixture("target-player-entry.json");
  const withNestedGmField = structuredClone(targetPlayerEntry);
  withNestedGmField.metadata.frontmatter.gmNotes = "must fail";
  assert.throws(
    () => parsePlayerArchiveEntryDto(withNestedGmField),
    (error) => error instanceof ContractValidationError && error.path.endsWith("gmNotes")
  );

  const withHiddenRecord = structuredClone(targetPlayerEntry);
  withHiddenRecord.metadata.pins.push({ id: "hidden", label: "Hidden", visibility: "hidden" });
  assert.throws(
    () => parsePlayerArchiveEntryDto(withHiddenRecord),
    (error) => error instanceof ContractValidationError && error.path.endsWith("visibility")
  );

  for (const credentialKey of ["password", "reset_token", "sessionToken", "invitation-token"]) {
    const withCredential = structuredClone(targetPlayerEntry);
    withCredential.metadata.related = [{ label: "safe", [credentialKey]: "must fail" }];
    assert.throws(
      () => parsePlayerArchiveEntryDto(withCredential),
      (error) => error instanceof ContractValidationError && error.path.endsWith(credentialKey)
    );
  }

  const gmEntryWithCredentials = await fixture("gm-entry.json");
  gmEntryWithCredentials.metadata.related = [{
    label: "safe",
    password: "remove",
    resetToken: "remove",
    session_token: "remove",
    invitationToken: "remove"
  }];
  assert.deepEqual(toPlayerArchiveEntryDto(gmEntryWithCredentials).metadata.related, [{ label: "safe" }]);
});

test("legacy visibility mapping is exact and invalid values fail closed", () => {
  assert.deepEqual(normalizeLegacyEntryVisibility("public"), {
    editorialState: "active",
    audience: "party",
    releaseState: "public"
  });
  assert.deepEqual(normalizeLegacyEntryVisibility("revealed"), {
    editorialState: "active",
    audience: "party",
    releaseState: "revealed"
  });
  for (const visibility of ["gmOnly", "hidden"]) {
    assert.deepEqual(normalizeLegacyEntryVisibility(visibility), {
      editorialState: "active",
      audience: "gmOnly",
      releaseState: "hidden"
    });
  }
  assert.deepEqual(normalizeLegacyEntryVisibility("needsReview"), {
    editorialState: "needsReview",
    audience: "gmOnly",
    releaseState: "hidden"
  });
  assert.throws(() => normalizeLegacyEntryVisibility("partyVisible"), ContractValidationError);
  assert.deepEqual(evaluatePlayerArchiveRead({ status: "active", visibility: "unexpected" }), {
    allowed: false,
    reason: "invalid_visibility"
  });
});

test("compatibility responses normalize current success and error payloads", () => {
  const parseValue = (value) => value;
  assert.deepEqual(
    parseCompatibilityResponse({ ok: true, data: { id: "target-redacted-001" } }, parseValue, parseValue),
    { ok: true, data: { id: "target-redacted-001" } }
  );
  assert.deepEqual(
    parseCompatibilityResponse(
      { ok: true, membership: { id: "membership-redacted-001" } },
      parseValue,
      parseValue
    ),
    {
      ok: true,
      data: { ok: true, membership: { id: "membership-redacted-001" } }
    }
  );
  assert.deepEqual(
    parseCompatibilityResponse({ ok: true }, parseValue, parseValue),
    { ok: true, data: { ok: true } }
  );
  assert.deepEqual(
    parseCompatibilityResponse({ entries: [], campaignId: "campaign-redacted-001", role: "player" }, parseValue, parseValue),
    { ok: true, data: { entries: [], campaignId: "campaign-redacted-001", role: "player" } }
  );
  assert.deepEqual(
    parseCompatibilityResponse(
      { error: "Too many API requests.", code: "RATE_LIMITED", requestId: "request-redacted-001" },
      parseValue,
      parseValue
    ),
    {
      ok: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many API requests.",
        requestId: "request-redacted-001"
      }
    }
  );
  assert.deepEqual(
    parseCompatibilityResponse(
      { error: "Entry not found." },
      parseValue,
      parseValue,
      "response",
      { httpStatus: 404 }
    ),
    { ok: false, error: { code: "NOT_FOUND", message: "Entry not found." } }
  );
  assert.deepEqual(
    parseCompatibilityResponse(
      { ok: false, error: "Storage is unavailable." },
      parseValue,
      parseValue,
      "response",
      { httpStatus: 503 }
    ),
    { ok: false, error: { code: "STORAGE_UNAVAILABLE", message: "Storage is unavailable." } }
  );
});

test("session identity stays separate from verified campaign authorization", () => {
  const principal = {
    userId: "user-redacted-001",
    sessionVersion: 2,
    platformAdmin: false,
    activeWorkspaceId: "workspace-redacted-001",
    activeCampaignId: "campaign-redacted-001"
  };
  assert.deepEqual(parseSessionPrincipalContract(principal), principal);
  assert.throws(
    () => parseSessionPrincipalContract({ ...principal, role: "owner" }),
    (error) => error instanceof ContractValidationError && error.path === "principal.role"
  );
  const membership = parseMembershipContract({
    id: "membership-redacted-001",
    userId: "user-redacted-001",
    workspaceId: "workspace-redacted-001",
    campaignId: "campaign-redacted-001",
    role: "owner",
    status: "active",
    displayName: "Redacted Owner",
    joinedAt: "2026-08-17T00:00:00.000Z",
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z"
  });
  assert.deepEqual(
    resolveVerifiedCampaignContextContract(
      parseSessionPrincipalContract(principal),
      membership,
      membership.campaignId
    ),
    {
      userId: "user-redacted-001",
      workspaceId: "workspace-redacted-001",
      campaignId: "campaign-redacted-001",
      membershipId: "membership-redacted-001",
      role: "owner"
    }
  );
  assert.throws(
    () => resolveVerifiedCampaignContextContract(
      parseSessionPrincipalContract({ ...principal, userId: "user-redacted-002" }),
      membership,
      membership.campaignId
    ),
    (error) => error instanceof ContractValidationError && error.path === "campaignContext.userId"
  );
  assert.throws(
    () => resolveVerifiedCampaignContextContract(
      parseSessionPrincipalContract(principal),
      membership,
      "campaign-redacted-002"
    ),
    (error) => error instanceof ContractValidationError && error.path === "campaignContext.campaignId"
  );
  assert.throws(
    () => resolveVerifiedCampaignContextContract(
      parseSessionPrincipalContract(principal),
      { ...membership, status: "removed" },
      membership.campaignId
    ),
    (error) => error instanceof ContractValidationError && error.path === "campaignContext.membershipId"
  );
});

test("campaign activeWorldId accepts only the branded world boundary or the legacy empty value", () => {
  const campaign = {
    id: "campaign-redacted-001",
    workspaceId: "workspace-redacted-001",
    name: "Redacted Campaign",
    description: "",
    ownerUserId: "user-redacted-001",
    status: "active",
    activeWorldId: "world-redacted-001",
    defaultLanguage: "en",
    settings: {},
    createdAt: "2026-08-17T00:00:00.000Z",
    updatedAt: "2026-08-17T00:00:00.000Z"
  };
  assert.deepEqual(parseCampaignContract(campaign), campaign);
  assert.equal(parseCampaignContract({ ...campaign, activeWorldId: "" }).activeWorldId, "");
});
