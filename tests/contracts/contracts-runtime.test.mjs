import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ContractValidationError,
  normalizeLegacyEntryVisibility,
  parseCompatibilityResponse,
  parseGmArchiveEntryDto,
  parsePlayerArchiveEntryDto
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
});
