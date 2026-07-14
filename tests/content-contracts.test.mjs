import assert from "node:assert/strict";
import test from "node:test";

import {
  ARTICLE_TYPE_CONFIG,
  buildArticleForm,
  buildArticlePayload,
  changeArticleTypeForm,
  validateArticleForm
} from "../apps/web/src/utils/articleFormConfig.js";
import { DEMO_ARTICLES, DEMO_THAUMATURGE } from "../apps/server/scripts/demoCampaignData.mjs";

const EXPECTED_TYPES = ["world", "country", "city", "location", "npc", "pc", "enemy", "quest", "session", "lore", "timelineEvent", "map"];

test("article creation exposes one complete contract for every archive type", () => {
  assert.deepEqual(ARTICLE_TYPE_CONFIG.map((item) => item.value), EXPECTED_TYPES);
  assert.equal(new Set(ARTICLE_TYPE_CONFIG.map((item) => item.value)).size, EXPECTED_TYPES.length);
  for (const config of ARTICLE_TYPE_CONFIG) {
    assert.ok(config.label, `${config.value} needs a label`);
    assert.ok(config.category, `${config.value} needs a category`);
    assert.ok(config.description, `${config.value} needs UX copy`);
    assert.ok(config.fields.length > 0, `${config.value} needs type-specific fields`);
  }
});

test("changing article type removes stale fields from the previous card contract", () => {
  const world = {
    ...buildArticleForm({ initialType: "world", initialTitle: "Old world" }),
    cosmology: "This must not leak",
    magicRules: "Neither should this"
  };
  const npc = changeArticleTypeForm(world, "npc");
  npc.name = "Captain Voss";
  npc.role = "Captain";
  npc.world = "Valdran";
  const payload = buildArticlePayload(npc);

  assert.equal(payload.type, "npc");
  assert.equal(payload.category, "npcs");
  assert.equal(payload.role, "Captain");
  assert.equal(payload.world, "Valdran");
  assert.equal("cosmology" in payload, false);
  assert.equal("magicRules" in payload, false);
});

test("article hierarchy validation prevents orphan countries and cities", () => {
  const country = buildArticleForm({ initialType: "country", initialTitle: "Arkven" });
  assert.deepEqual(validateArticleForm(country), ["Для страны сначала выберите мир."]);

  const city = buildArticleForm({ initialType: "city", initialTitle: "Noctgard", initialWorld: "Valdran" });
  assert.deepEqual(validateArticleForm(city), ["Для города выберите страну."]);

  city.country = "Arkven";
  assert.deepEqual(validateArticleForm(city), []);
});

test("demo campaign contains exactly one representative entry per article type", () => {
  assert.equal(DEMO_ARTICLES.length, EXPECTED_TYPES.length);
  assert.deepEqual([...DEMO_ARTICLES.map((item) => item.type)].sort(), [...EXPECTED_TYPES].sort());
  assert.equal(new Set(DEMO_ARTICLES.map((item) => item.type)).size, EXPECTED_TYPES.length);
  assert.equal(new Set(DEMO_ARTICLES.map((item) => item.path)).size, EXPECTED_TYPES.length);
  for (const article of DEMO_ARTICLES) {
    assert.ok(article.seedKey, `${article.type} is missing an idempotent seed key`);
    assert.ok(article.title, `${article.type} is missing a title`);
    assert.ok(article.summary, `${article.type} is missing a summary`);
    assert.ok(article.publicContent, `${article.type} is missing player-safe content`);
    assert.ok(article.frontmatter && Object.keys(article.frontmatter).length, `${article.type} is missing representative fields`);
  }
});

test("demo character is the level 6 Nephilim Thaumaturge reference dossier", () => {
  const character = DEMO_THAUMATURGE;
  assert.equal(character.identity.className, "Тавматург");
  assert.equal(character.identity.level, 6);
  assert.equal(character.identity.ancestry, "Человек");
  assert.equal(character.identity.heritage, "Нефилим");
  assert.ok(character.progression.classFeatures.some((item) => item.name.includes("Регалия")));
  assert.ok(character.progression.feats.some((item) => item.name.includes("Дальняя Хватка")));
  assert.ok(character.magic.spells.some((item) => item.name.includes("Телекинетический манёвр")));
  assert.ok(character.combat.attacks.length >= 2);
  assert.ok(character.stats.skills.length >= 4);
  assert.ok(character.inventory.armor.some((item) => item.name.includes("латный")));
  assert.equal(character.visibility.visibleToParty, true);
  assert.equal(character.visibility.sharedWithGm, true);
});
