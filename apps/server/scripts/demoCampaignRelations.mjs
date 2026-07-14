export const DEMO_ARTICLE_CHAIN = [
  { seedKey: "demo-world-valdran", category: "worlds" },
  { seedKey: "demo-country-arkven", category: "countries" },
  { seedKey: "demo-city-noctgard", category: "cities" },
  { seedKey: "demo-location-ash-throne", category: "locations" },
  { seedKey: "demo-npc-elira-voss", category: "npcs" },
  { seedKey: "demo-pc-vaanar", category: "characters" },
  { seedKey: "demo-enemy-ash-praetorian", category: "enemies" },
  { seedKey: "demo-quest-void-seal", category: "quests" },
  { seedKey: "demo-session-gates", category: "sessions" },
  { seedKey: "demo-lore-broken-crown", category: "lore" },
  { seedKey: "demo-timeline-red-moon", category: "timeline" },
  { seedKey: "demo-map-noctgard", category: "maps" }
];

export const REQUIRED_DEMO_CATEGORIES = DEMO_ARTICLE_CHAIN.map((item) => item.category);

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function uniqueStrings(values = []) {
  const result = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function validateDemoArticles(articles) {
  if (!Array.isArray(articles)) throw new TypeError("Demo articles must be an array.");

  const bySeedKey = new Map();
  const categoryCounts = new Map();
  const titles = new Set();

  for (const article of articles) {
    if (!article?.seedKey) throw new Error("Every demo article must have a seedKey.");
    if (bySeedKey.has(article.seedKey)) throw new Error(`Duplicate demo seedKey: ${article.seedKey}`);
    if (!article.title) throw new Error(`Demo article ${article.seedKey} has no title.`);
    if (titles.has(article.title)) throw new Error(`Duplicate demo title: ${article.title}`);

    bySeedKey.set(article.seedKey, article);
    titles.add(article.title);
    categoryCounts.set(article.category, (categoryCounts.get(article.category) || 0) + 1);
  }

  for (const expected of DEMO_ARTICLE_CHAIN) {
    const article = bySeedKey.get(expected.seedKey);
    if (!article) throw new Error(`Missing demo article: ${expected.seedKey}`);
    if (article.category !== expected.category) {
      throw new Error(`Demo article ${expected.seedKey} must use category ${expected.category}, received ${article.category}.`);
    }
    if (categoryCounts.get(expected.category) !== 1) {
      throw new Error(`Demo category ${expected.category} must contain exactly one article.`);
    }
  }

  return bySeedKey;
}

export function linkDemoArticles(articles) {
  const bySeedKey = validateDemoArticles(articles);
  const chainLength = DEMO_ARTICLE_CHAIN.length;
  const chainIndexBySeedKey = new Map(DEMO_ARTICLE_CHAIN.map((item, index) => [item.seedKey, index]));

  return articles.map((article) => {
    const chainIndex = chainIndexBySeedKey.get(article.seedKey);
    if (chainIndex === undefined) return article;

    const previousDescriptor = DEMO_ARTICLE_CHAIN[(chainIndex - 1 + chainLength) % chainLength];
    const nextDescriptor = DEMO_ARTICLE_CHAIN[(chainIndex + 1) % chainLength];
    const previousArticle = bySeedKey.get(previousDescriptor.seedKey);
    const nextArticle = bySeedKey.get(nextDescriptor.seedKey);
    const related = uniqueStrings([
      ...asList(article.frontmatter?.related),
      previousArticle.title,
      nextArticle.title
    ]);

    return {
      ...article,
      frontmatter: {
        ...(article.frontmatter || {}),
        related,
        chainPosition: chainIndex + 1,
        chainTotal: chainLength,
        chainPrevious: previousArticle.title,
        chainNext: nextArticle.title
      }
    };
  });
}
