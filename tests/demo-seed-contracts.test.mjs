import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_ARTICLES, DEMO_THAUMATURGE } from "../apps/server/scripts/demoCampaignData.mjs";
import {
  DEMO_ARTICLE_CHAIN,
  REQUIRED_DEMO_CATEGORIES,
  linkDemoArticles
} from "../apps/server/scripts/demoCampaignRelations.mjs";

const linkedArticles = linkDemoArticles(DEMO_ARTICLES);
const bySeedKey = new Map(linkedArticles.map((article) => [article.seedKey, article]));
const titles = new Set(linkedArticles.map((article) => article.title));
const paths = new Set(linkedArticles.map((article) => article.path));

test("demo campaign has exactly one article for every product category", () => {
  assert.equal(linkedArticles.length, DEMO_ARTICLE_CHAIN.length);
  assert.deepEqual(
    [...new Set(linkedArticles.map((article) => article.category))].sort(),
    [...REQUIRED_DEMO_CATEGORIES].sort()
  );

  for (const category of REQUIRED_DEMO_CATEGORIES) {
    assert.equal(
      linkedArticles.filter((article) => article.category === category).length,
      1,
      `expected exactly one demo article in ${category}`
    );
  }
});

test("every demo article is connected to the previous and next article", () => {
  for (const [index, descriptor] of DEMO_ARTICLE_CHAIN.entries()) {
    const article = bySeedKey.get(descriptor.seedKey);
    const previous = bySeedKey.get(DEMO_ARTICLE_CHAIN[(index - 1 + DEMO_ARTICLE_CHAIN.length) % DEMO_ARTICLE_CHAIN.length].seedKey);
    const next = bySeedKey.get(DEMO_ARTICLE_CHAIN[(index + 1) % DEMO_ARTICLE_CHAIN.length].seedKey);

    assert.ok(article, `missing linked article ${descriptor.seedKey}`);
    assert.equal(article.frontmatter.chainPosition, index + 1);
    assert.equal(article.frontmatter.chainTotal, DEMO_ARTICLE_CHAIN.length);
    assert.equal(article.frontmatter.chainPrevious, previous.title);
    assert.equal(article.frontmatter.chainNext, next.title);
    assert.ok(article.frontmatter.related.includes(previous.title));
    assert.ok(article.frontmatter.related.includes(next.title));
  }
});

test("all related demo titles resolve to real demo articles", () => {
  for (const article of linkedArticles) {
    for (const relatedTitle of article.frontmatter.related) {
      assert.ok(titles.has(relatedTitle), `${article.title} links to missing title ${relatedTitle}`);
    }
  }
});

test("the reference thaumaturge links only to seeded campaign entries", () => {
  assert.equal(DEMO_THAUMATURGE.identity.className, "Тавматург");
  assert.equal(DEMO_THAUMATURGE.identity.level, 6);
  assert.equal(DEMO_THAUMATURGE.identity.heritage, "Нефилим");

  const linkedPaths = [
    ...DEMO_THAUMATURGE.links.linkedEntryIds,
    ...DEMO_THAUMATURGE.links.personalQuestEntryIds,
    ...DEMO_THAUMATURGE.links.knownNpcIds,
    DEMO_THAUMATURGE.links.homeLocationId
  ];

  for (const linkedPath of linkedPaths) {
    assert.ok(paths.has(linkedPath), `thaumaturge link does not resolve: ${linkedPath}`);
  }
});
