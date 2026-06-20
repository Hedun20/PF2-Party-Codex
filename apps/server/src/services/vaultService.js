import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";
import { parseMarkdown, stringifyMarkdown } from "../utils/frontmatter.js";
import { ensureMarkdownPath, normalizeVaultPath, resolveInside } from "../utils/safePath.js";
import { slugify, titleFromPath } from "../utils/slugify.js";
import { repairMojibake, repairTextDeep, looksLikeMojibake } from "../utils/encoding.js";
import { extractWikiLinks, renderWikiMarkdown } from "./markdownService.js";
import { filterByMode } from "./visibilityService.js";

let pages = [];
let pageByPath = new Map();

const bootstrapDirs = [
  "_guides", "_examples",
  "worlds", "countries", "cities", "locations", "characters", "npcs", "enemies", "quests", "sessions",
  "lore", "lore/factions", "lore/gods", "lore/cults", "lore/history", "lore/planes",
  "lore/artifacts", "lore/magic", "lore/prophecies", "lore/timeline",
  "maps", "timeline", "assets", "images", "handouts", "templates"
];

const starterFiles = {
  "index.md": `---
title: PF2 Party Codex
category: dashboard
type: dashboard
visibility: public
summary: Стартовая страница локального кодекса кампании.
tags: [guide, start]
---

# PF2 Party Codex

Это чистый vault для твоей кампании. Реальный канон лучше создавать в папках \`worlds/\`, \`cities/\`, \`npcs/\`, \`quests/\`, \`maps/\` и \`timeline/\`.

## Быстрый старт

- Открой [[Getting Started|гайд для старта]].
- Посмотри примеры в \`_examples/\`.
- Создай первый мир в \`worlds/\` или через редактор.
- Добавляй связи через wiki-ссылки: \`[[Название статьи]]\`.

## Важно

Папки \`_guides/\` и \`_examples/\` — обучающие материалы. Это не канон твоей кампании, их можно удалить или переписать.
`,
  "_guides/getting-started.md": `---
title: Getting Started
category: _guides
type: guide
visibility: public
summary: Как начать вести кампанию в PF2 Party Codex.
tags: [guide, onboarding]
---

# Getting Started

PF2 Party Codex хранит кампанию как обычные Markdown-файлы. Это значит: ты можешь редактировать статьи в приложении, в Obsidian, VS Code или любом текстовом редакторе.

## Рекомендуемый порядок

1. Создай первый мир в \`worlds/\`.
2. Создай 1–2 города в \`cities/\`.
3. Добавь важных NPC в \`npcs/\` или персонажей игроков в \`characters/\`.
4. Подключи карту через \`mapImage\` или страницу типа \`map\`.
5. Добавь события в \`timeline/\` или \`lore/timeline/\`.

## Wiki-ссылки

Пиши \`[[Название статьи]]\`, чтобы связать материалы между собой. Если статьи ещё нет, она появится в разделе missing links.

## GM-секреты

Игроки не должны видеть всё. Используй:

\`\`\`md
## GM Secrets
То, что игрокам пока нельзя знать.
\`\`\`

Или целиком скрывай файл:

\`\`\`yaml
visibility: gm
\`\`\`
`,
  "_guides/how-to-create-a-world.md": `---
title: How to Create a World
category: _guides
type: guide
visibility: public
summary: Структура хорошей страницы мира.
tags: [guide, world]
---

# How to Create a World

Страница мира должна быстро отвечать на вопрос: почему игрокам и мастеру интересно здесь играть?

## Пример frontmatter

\`\`\`yaml
---
title: Пепельные Княжества
category: worlds
type: world
visibility: public
summary: Вулканические земли, где мёртвые рыцари охраняют границы старых клятв.
tags: [fire, undead, kingdoms]
theme: fire
---
\`\`\`

## Хорошие секции

- **Pitch:** одна сильная фраза о мире.
- **Главный конфликт:** что двигает историю.
- **Фракции:** кто борется за власть.
- **Ключевые места:** города, храмы, руины, порталы.
- **Что знают игроки:** player-safe описание.
- **GM Secrets:** скрытая правда мира.
`,
  "_guides/how-to-create-a-city.md": `---
title: How to Create a City
category: _guides
type: guide
visibility: public
summary: Как оформить город, чтобы он был полезен за столом.
tags: [guide, city]
---

# How to Create a City

Город — это не энциклопедия. Это игровой инструмент: куда идти, кого встретить, какие проблемы начнутся сегодня.

## Пример frontmatter

\`\`\`yaml
---
title: Черный Порт
category: cities
type: city
world: Пепельные Княжества
visibility: public
summary: Порт на обсидиановой бухте, где контрабандисты торгуют реликвиями павших домов.
tags: [port, crime, fire]
---
\`\`\`

## Секции

- Впечатление при входе
- Районы
- Важные NPC
- Законы и опасности
- Слухи
- GM Secrets
`,
  "_guides/how-to-create-a-pc.md": `---
title: How to Create a PC
category: _guides
type: guide
visibility: public
summary: Как вести персонажа игрока или важного союзника.
tags: [guide, pc, character]
---

# How to Create a PC

Для персонажей игроков лучше хранить не весь лист персонажа, а то, что помогает кампании: связи, цели, обещания, долги, личные арки.

## Пример frontmatter

\`\`\`yaml
---
title: Каэлин Рунный
category: characters
type: pc
world: Пепельные Княжества
visibility: public
summary: Кинетик, который ищет источник голоса из вулканического разлома.
tags: [pc, kineticist, fire]
related: [Черный Порт]
---
\`\`\`

## Секции

- Концепт
- Цели персонажа
- Союзники и враги
- Нерешённые крючки
- Награды / долги / обещания
`,
  "_guides/how-to-create-a-map.md": `---
title: How to Create a Map
category: _guides
type: guide
visibility: public
summary: Как подключать карты, пины и области.
tags: [guide, map]
---

# How to Create a Map

Карта может жить как отдельная статья или внутри страницы города/локации.

## Пример frontmatter

\`\`\`yaml
---
title: Карта Черного Порта
category: maps
type: map
world: Пепельные Княжества
mapImage: black-harbor.png
visibility: public
summary: Игровая карта обсидиановой бухты и портовых районов.
pins:
  - label: Старый маяк
    x: 42
    y: 31
    target: Старый маяк
---
\`\`\`

## Совет

Храни картинки локально в \`vault/images\`. Игрокам показывай только player-safe слой, а секретные пины отмечай как GM-only.
`,
  "_guides/how-to-create-a-timeline.md": `---
title: How to Create a Timeline
category: _guides
type: guide
visibility: public
summary: Как готовить события для Living Timeline Branch Explorer.
tags: [guide, timeline]
---

# How to Create a Timeline

Timeline работает лучше всего, когда каждое событие связано с миром, местом, NPC или фракцией. Тогда это не просто список дат, а живое древо истории.

## Минимальный frontmatter

\`\`\`yaml
---
title: Падение Красного Маяка
category: timeline
type: timelineEvent
world: Пепельные Княжества
era: Война Маяков
year: 1666
importance: major
visibility: public
summary: Ночь, когда маяк погас, а мёртвые рыцари впервые вышли из лавовых ворот.
related: [Пепельные Княжества, Красный Маяк, Орден Пепла]
---
\`\`\`

## Поля, которые усиливают branch timeline

- \`year\` или \`timelineYear\` — положение на линии времени.
- \`era\`, \`arc\` или \`chapter\` — крупная эпоха/ветка.
- \`world\` — фильтр мира.
- \`city\`, \`country\`, \`faction\` — быстрые связи.
- \`related\` — список связанных статей.
- Wiki-ссылки \`[[Название статьи]]\` внутри текста — тоже становятся связями.

## Принцип

Каждое событие должно отвечать не только “когда?”, но и “с чем оно связано?”. Тогда Timeline сможет подсвечивать NPC, города, фракции и соседние статьи при hover/focus.
`,
  "_examples/example-world.md": `---
title: Example World — Ember Marches
category: _examples
type: example
visibility: public
summary: Учебный пример мира. Не является каноном кампании.
tags: [example, world, fire]
theme: fire
---

# Example World — Ember Marches

Это пример, а не реальный мир кампании. Скопируй структуру, но создай собственную страницу в \`worlds/\`.

## Pitch

Королевства на лавовых плато живут на границе между торговлей, некромантией и старыми клятвами.

## Player-safe truth

Игроки знают, что дороги здесь строят из обсидиана, а ночами в горах слышны колокола мёртвых крепостей.

## GM Secrets

Настоящая причина пробуждения мёртвых — не проклятие, а древний договор с планом Огня.
`,
  "_examples/example-city.md": `---
title: Example City — Black Harbor
category: _examples
type: example
visibility: public
summary: Учебный пример города с игровыми крючками.
tags: [example, city, port]
---

# Example City — Black Harbor

## Что видно игрокам

Порт пахнет серой, мокрой древесиной и дорогими обещаниями. У каждого причала свой закон.

## Быстрые крючки

- Капитан исчез после сделки с храмом.
- На маяке каждую ночь горит зелёный огонь.
- Контрабандисты продают карту, которой ещё не должно существовать.
`,
  "_examples/example-pc.md": `---
title: Example PC — Kaelin Runehand
category: _examples
type: example
visibility: public
summary: Учебный пример страницы персонажа игрока.
tags: [example, pc]
---

# Example PC — Kaelin Runehand

## Концепт

Кинетик, который считает свой дар проклятием, но слишком часто спасает им чужие жизни.

## Крючки для мастера

- Кто оставил руну на его ладони?
- Почему огонь не причиняет ему боли только рядом с древними маяками?
`,
  "_examples/example-map.md": `---
title: Example Map — Black Harbor Districts
category: _examples
type: example
visibility: public
summary: Учебный пример описания карты и пинов.
tags: [example, map]
---

# Example Map — Black Harbor Districts

Карту можно добавить позже как файл в \`vault/images\`, а пока опиши районы текстом.

## Районы

- Старый маяк
- Рыбный рынок
- Обсидиановая пристань
- Нижние склады
`,
  "_examples/example-timeline-event.md": `---
title: Example Timeline Event — Fall of the Red Beacon
category: _examples
type: example
visibility: public
summary: Учебный пример события для timeline.
tags: [example, timeline]
year: 1666
related: [Example World — Ember Marches, Example City — Black Harbor]
---

# Example Timeline Event — Fall of the Red Beacon

В эту ночь погас главный маяк, а на рассвете караваны нашли ворота, которых вчера не было.

## Как использовать

Создай реальное событие в \`timeline/\` или \`lore/timeline/\`, добавь \`year\`, \`world\` и \`related\`.
`
};

async function directoryHasUserContent(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".pf2-codex.json") continue;
      const full = path.join(dir, entry.name);
      if (entry.isFile()) return true;
      if (entry.isDirectory() && await directoryHasUserContent(full)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function writeStarterFile(relativePath, content) {
  const target = path.join(config.vaultDir, relativePath);
  try {
    await fs.access(target);
  } catch {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  }
}

async function ensureVaultBootstrap() {
  const hadContent = await directoryHasUserContent(config.vaultDir);
  await fs.mkdir(config.vaultDir, { recursive: true });
  await Promise.all(bootstrapDirs.map((dir) => fs.mkdir(path.join(config.vaultDir, dir), { recursive: true })));

  const manifest = path.join(config.vaultDir, ".pf2-codex.json");
  try {
    await fs.access(manifest);
  } catch {
    await fs.writeFile(manifest, `${JSON.stringify({
      campaignName: "Новая кампания",
      createdAt: new Date().toISOString(),
      storage: "local-markdown-vault",
      gmMode: "localhost-only",
      playerAccess: "lan-player",
      bootstrap: "empty-vault-with-guides-and-examples"
    }, null, 2)}
`, "utf8");
  }

  if (!hadContent) {
    await Promise.all(Object.entries(starterFiles).map(([relativePath, content]) => writeStarterFile(relativePath, content)));
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith(".md")) return [full];
    return [];
  }));
  return nested.flat();
}

function inferCategory(relativePath, frontmatter) {
  if (frontmatter.category) return frontmatter.category;
  const parts = normalizeVaultPath(relativePath).split("/");
  if (parts[0] === "lore" && parts[1]) return parts.slice(0, 2).join("/");
  return parts.length > 1 ? parts[0] : "dashboard";
}

function summarize(content, frontmatter) {
  if (frontmatter.summary) return repairMojibake(frontmatter.summary);
  return content
    .replace(/^---[\s\S]*?---/, "")
    .replace(/[#>*_[\]()`]/g, "")
    .split(/\n+/)
    .find((line) => line.trim().length > 20)
    ?.trim()
    .slice(0, 220) || "";
}

export async function rebuildVaultIndex() {
  await ensureVaultBootstrap();
  const files = await walk(config.vaultDir);
  const nextPages = await Promise.all(files.map(async (file) => {
    const raw = await fs.readFile(file, "utf8");
    const relativePath = normalizeVaultPath(path.relative(config.vaultDir, file));
    const stat = await fs.stat(file);
    const { frontmatter: parsedFrontmatter, content: parsedContent } = parseMarkdown(raw);
    const frontmatter = repairTextDeep(parsedFrontmatter);
    const content = repairMojibake(parsedContent);
    const title = repairMojibake(frontmatter.name || frontmatter.title || titleFromPath(relativePath));
    return {
      path: relativePath,
      title,
      category: inferCategory(relativePath, frontmatter),
      type: frontmatter.type || inferCategory(relativePath, frontmatter),
      world: frontmatter.world || undefined,
      country: frontmatter.country || undefined,
      city: frontmatter.city || undefined,
      parent: frontmatter.parent || undefined,
      mapImage: frontmatter.mapImage || undefined,
      avatarImage: frontmatter.avatarImage || undefined,
      tokenImage: frontmatter.tokenImage || undefined,
      handoutImage: frontmatter.handoutImage || undefined,
      image: frontmatter.image || undefined,
      pins: Array.isArray(frontmatter.pins) ? frontmatter.pins : [],
      mapObjects: Array.isArray(frontmatter.mapObjects) ? frontmatter.mapObjects : [],
      summary: summarize(content, frontmatter),
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      visibility: frontmatter.visibility || "public",
      frontmatter,
      content,
      html: renderWikiMarkdown(content),
      links: extractWikiLinks(content),
      modifiedAt: stat.mtime.toISOString()
    };
  }));
  pages = nextPages.sort((a, b) => a.title.localeCompare(b.title));
  pageByPath = new Map(pages.map((page) => [page.path, page]));
  return pages;
}

export function listPages(mode = "gm") {
  const visiblePages = pages.map((page) => filterByMode(page, mode)).filter(Boolean);
  return visiblePages.map((page) => withBacklinks(page, visiblePages));
}

export function listMissingLinks(mode = "gm") {
  const visiblePages = pages.map((page) => filterByMode(page, mode)).filter(Boolean);
  const missing = new Map();

  for (const page of visiblePages) {
    for (const link of page.links || []) {
      if (findLinkedPage(link.target, visiblePages)) continue;
      const key = slugify(link.target);
      const entry = missing.get(key) || {
        title: link.target,
        slug: key,
        count: 0,
        sources: []
      };
      entry.count += 1;
      if (!entry.sources.some((source) => source.path === page.path)) {
        entry.sources.push(compactPage(page));
      }
      missing.set(key, entry);
    }
  }

  return [...missing.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
}

export function getPage(requestedPath, mode = "gm") {
  const normalized = normalizeVaultPath(requestedPath);
  const direct = pageByPath.get(normalized);
  const byTitle = pages.find((page) => page.title.toLowerCase() === normalized.toLowerCase());
  const bySlug = pages.find((page) => slugify(page.title) === slugify(normalized));
  const page = direct || byTitle || bySlug;
  const filtered = page ? filterByMode(page, mode) : null;
  if (!filtered) return null;
  const visiblePages = pages.map((item) => filterByMode(item, mode)).filter(Boolean);
  return withBacklinks(filtered, visiblePages);
}

function compactPage(page) {
  return {
    title: page.title,
    path: page.path,
    category: page.category,
    type: page.type,
    summary: page.summary
  };
}

function linkMatchesPage(link, page) {
  const target = slugify(link.target || "");
  return target === slugify(page.title) || target === slugify(page.path.replace(/\.md$/i, ""));
}

function findLinkedPage(target, visiblePages) {
  const normalized = slugify(target || "");
  return visiblePages.find((page) => (
    normalized === slugify(page.title)
    || normalized === slugify(page.path)
    || normalized === slugify(page.path.replace(/\.md$/i, ""))
  ));
}

function relatedMatchesPage(related, page) {
  const target = slugify(String(related || ""));
  return target === slugify(page.title) || target === slugify(page.path);
}

function withBacklinks(page, visiblePages) {
  const backlinks = visiblePages
    .filter((candidate) => candidate.path !== page.path)
    .filter((candidate) => {
      const wikiLinked = candidate.links?.some((link) => linkMatchesPage(link, page));
      const relatedLinked = Array.isArray(candidate.frontmatter?.related)
        && candidate.frontmatter.related.some((item) => relatedMatchesPage(item, page));
      return wikiLinked || relatedLinked;
    })
    .map(compactPage);

  const related = Array.isArray(page.frontmatter?.related)
    ? page.frontmatter.related
      .map((item) => visiblePages.find((candidate) => relatedMatchesPage(item, candidate)))
      .filter(Boolean)
      .map(compactPage)
    : [];

  const children = visiblePages
    .filter((candidate) => candidate.path !== page.path)
    .filter((candidate) => {
      if (page.type === "world") return candidate.world === page.title || candidate.parent === page.title;
      if (page.type === "country") return candidate.country === page.title || candidate.parent === page.title;
      if (page.type === "city") return candidate.city === page.title || candidate.parent === page.title;
      return false;
    })
    .map(compactPage);

  const missingLinks = (page.links || [])
    .filter((link) => !findLinkedPage(link.target, visiblePages))
    .map((link) => ({ title: link.target, label: link.label, slug: slugify(link.target) }));

  return { ...page, backlinks, relatedPages: related, children, missingLinks };
}

export function getCategories(mode = "gm") {
  const grouped = new Map();
  for (const page of listPages(mode)) {
    const key = page.category || "uncategorized";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(page);
  }
  return [...grouped.entries()].map(([category, items]) => ({ category, count: items.length, pages: items }));
}

export async function savePage({ requestedPath, frontmatter = {}, content = "" }) {
  const safe = ensureMarkdownPath(requestedPath);
  const target = resolveInside(config.vaultDir, safe);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, stringifyMarkdown(cleanFrontmatter(frontmatter), content), "utf8");
  await rebuildVaultIndex();
  return getPage(safe, "gm");
}

export async function readRawPage(requestedPath, mode = "gm") {
  const page = getPage(requestedPath, mode);
  if (!page) return null;
  const safe = ensureMarkdownPath(page.path);
  const raw = await fs.readFile(resolveInside(config.vaultDir, safe), "utf8");
  const { frontmatter, content } = parseMarkdown(raw);
  return { page: compactPage(page), raw, frontmatter, content };
}

export async function saveRawPage({ requestedPath, raw }) {
  const safe = ensureMarkdownPath(requestedPath);
  const target = resolveInside(config.vaultDir, safe);
  parseMarkdown(raw || "");
  await fs.writeFile(target, raw.endsWith("\n") ? raw : `${raw}\n`, "utf8");
  await rebuildVaultIndex();
  return getPage(safe, "gm");
}

export function previewMarkdownImports(files = []) {
  return files.map((file) => {
    const raw = repairMojibake(file.content || "");
    const { frontmatter: parsedFrontmatter, content: parsedContent } = parseMarkdown(raw);
    const frontmatter = repairTextDeep(parsedFrontmatter);
    const content = repairMojibake(parsedContent);
    const obsidianInfo = parseObsidianShortcut(raw) || parseObsidianShortcut(content);
    const cleanContent = obsidianInfo ? stripObsidianShortcutLines(content || raw) : content;
    const safeFrontmatter = obsidianInfo ? cleanObsidianShortcutFrontmatter(frontmatter) : frontmatter;
    const filenameTitle = titleFromImportedFilename(file.originalName);
    const cleanTitle = pickCleanTitle([safeFrontmatter.title, safeFrontmatter.name, firstHeading(cleanContent), filenameTitle]);
    const title = obsidianInfo ? filenameTitle : cleanTitle;
    const loreSubtype = inferLoreSubtype(title, cleanContent, safeFrontmatter);
    const inferredType = inferTypeFromText(title, cleanContent, loreSubtype);
    const type = obsidianInfo || safeFrontmatter.type === "link"
      ? inferredType
      : (safeFrontmatter.type || inferredType);
    const category = obsidianInfo || safeFrontmatter.category === "link"
      ? defaultCategory(type, loreSubtype)
      : normalizeImportCategory(safeFrontmatter.category || defaultCategory(type, loreSubtype), type, loreSubtype);
    const targetPath = `${category}/${slugify(title)}.md`;
    const splitCandidates = detectFactionSplitCandidates(cleanContent, file.id);
    const existing = pageByPath.has(targetPath);
    const warnings = [];
    if (existing) warnings.push("Файл с таким путём уже существует");
    if (obsidianInfo) {
      warnings.push("Похоже, это Obsidian-ссылка/ярлык. Название взято из имени загруженного файла, а служебные строки Obsidian будут очищены.");
      if (obsidianInfo.file) warnings.push(`Obsidian path: ${obsidianInfo.file}`);
      if (obsidianInfo.vault) warnings.push(`Obsidian vault: ${obsidianInfo.vault}`);
    }
    if (file.encoding && file.encoding !== "utf-8") warnings.push(`Кодировка распознана как ${file.encoding}`);
    return {
      id: file.id,
      originalName: file.originalName,
      title,
      type,
      category,
      targetPath,
      summary: summarize(cleanContent, safeFrontmatter),
      frontmatter: { ...safeFrontmatter, loreSubtype: safeFrontmatter.loreSubtype || loreSubtype },
      content: cleanContent,
      loreSubtype,
      splitCandidates,
      encoding: file.encoding,
      obsidianInfo,
      warnings
    };
  });
}

export async function commitMarkdownImports({ items = [], conflictMode = "skip" }) {
  const written = [];
  const skipped = [];

  for (const item of items) {
    const safe = ensureMarkdownPath(item.targetPath);
    const exists = pageByPath.has(safe);
    if (exists && conflictMode === "skip") {
      skipped.push({ ...item, reason: "Конфликт: файл уже существует" });
      continue;
    }

    const finalPath = exists && conflictMode === "copy"
      ? await nextCopyPath(safe)
      : safe;

    const content = stringifyMarkdown(
      cleanFrontmatter({
        ...item.frontmatter,
        title: item.title,
        name: item.title,
        type: item.type,
        category: normalizeImportCategory(item.category, item.type, item.loreSubtype),
        loreSubtype: item.loreSubtype,
        summary: repairMojibake(item.summary),
        visibility: item.frontmatter?.visibility || "public"
      }),
      repairMojibake(item.content || "")
    );

    const target = resolveInside(config.vaultDir, finalPath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf8");
    written.push({ ...item, targetPath: finalPath });
  }

  await rebuildVaultIndex();
  return { written, skipped };
}

export async function createPage(payload) {
  const type = payload.type || "lore";
  const loreSubtype = payload.loreSubtype || inferLoreSubtype(payload.name || payload.title || "", payload.summary || payload.publicNotes || "", payload);
  const category = normalizeImportCategory(payload.category || defaultCategory(type, loreSubtype), type, loreSubtype);
  const title = repairMojibake(payload.title || payload.name || payload.mapObjects?.[0]?.label || payload.pins?.[0]?.label || draftTitle(type));
  const requestedPath = payload.path || `${category}/${slugify(title)}.md`;
  const content = [
    payload.summary || "",
    "",
    "## Публичные заметки",
    payload.publicNotes || "",
    "",
    payload.gmSecrets ? `## GM Secrets\n${payload.gmSecrets}` : ""
  ].join("\n").trim();

  const excluded = new Set(["path", "requestedPath", "content", "publicNotes", "gmSecrets"]);
  const structuredFields = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !excluded.has(key))
  );

  return savePage({
    requestedPath,
    frontmatter: {
      ...structuredFields,
      title,
      name: repairMojibake(payload.name || title),
      type,
      category,
      loreSubtype: type === "lore" ? loreSubtype : undefined,
      summary: repairMojibake(payload.summary || ""),
      tags: payload.tags || [],
      related: payload.related || [],
      pins: payload.pins || [],
      mapObjects: payload.mapObjects || [],
      visibility: payload.visibility || "public"
    },
    content
  });
}

function cleanFrontmatter(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanFrontmatter(item))
      .filter((item) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, cleanFrontmatter(item)])
        .filter(([, item]) => item !== undefined && item !== "" && !(Array.isArray(item) && item.length === 0))
    );
  }
  return value === null ? undefined : value;
}

function draftTitle(type) {
  const labels = {
    world: "Новый мир",
    country: "Новая страна",
    city: "Новый город",
    npc: "Новый NPC",
    enemy: "Новый враг",
    quest: "Новый квест",
    session: "Новая сессия",
    location: "Новая локация",
    timelineEvent: "Новое событие",
    lore: "Новая статья"
  };
  return `${labels[type] || "Новая статья"} ${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
}

function firstHeading(content = "") {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function titleFromImportedFilename(originalName = "") {
  const base = repairMojibake(String(originalName || "untitled.md"))
    .split(/[\\/]/)
    .pop()
    .replace(/\.md$/i, "")
    .trim();
  if (!base) return "Untitled";
  if (/[\p{L}]/u.test(base) && /\s/.test(base)) {
    return base.replace(/\s+-\s+/g, " — ").replace(/[_]+/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  return titleFromPath(base);
}

function cleanObsidianShortcutFrontmatter(frontmatter = {}) {
  const cleaned = { ...frontmatter };
  if (String(cleaned.type || "").toLowerCase() === "link") delete cleaned.type;
  if (String(cleaned.category || "").toLowerCase() === "link") delete cleaned.category;
  if (cleaned.action && String(cleaned.action).includes("obsidian://")) delete cleaned.action;
  if (cleaned.url && String(cleaned.url).includes("obsidian://")) delete cleaned.url;
  if (cleaned.name && String(cleaned.name).trim().toLowerCase() === "фракции") delete cleaned.name;
  return cleaned;
}

function stripObsidianShortcutLines(value = "") {
  const lines = String(value || "").split(/\r?\n/);
  const cleaned = lines.filter((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (/^action\s+obsidian:\/\/open\?/i.test(trimmed)) return false;
    if (/^action:\s*obsidian:\/\/open\?/i.test(trimmed)) return false;
    if (/^type\s*:?\s*link\s*$/i.test(trimmed)) return false;
    if (/^url:\s*obsidian:\/\/open\?/i.test(trimmed)) return false;
    if (index < 8 && /^name\s+/i.test(trimmed)) return false;
    return true;
  });
  return cleaned.join("\n").replace(/^\n+/, "").trim();
}

function parseObsidianShortcut(raw = "") {
  const match = raw.match(/obsidian:\/\/open\?([^\s]+)/i);
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const file = params.get("file") ? decodeURIComponent(params.get("file")) : "";
  const vault = params.get("vault") ? decodeURIComponent(params.get("vault")) : "";
  const title = file ? titleFromPath(file.replace(/\\/g, "/").replace(/\.md$/i, "")) : "Obsidian shortcut";
  return { file, vault, title };
}

function inferTypeFromText(title = "", content = "") {
  const text = `${title}\n${content}`.toLowerCase();
  if (/(восстание|битва|война|эпоха|история|событие|revolt|uprising|battle|war|history|event)/i.test(text)) return "lore";
  if (/(мир|план|plane|world)/i.test(text)) return "world";
  if (/(страна|королевство|империя|country|kingdom|empire)/i.test(text)) return "country";
  if (/(город|поселение|city|town)/i.test(text)) return "city";
  if (/(npc|персонаж|капитан|магистр|торговец)/i.test(text)) return "npc";
  if (/(враг|монстр|enemy|monster|creature)/i.test(text)) return "enemy";
  if (/(квест|задание|quest)/i.test(text)) return "quest";
  if (/(сессия|session|recap)/i.test(text)) return "session";
  if (/(локация|таверна|башня|храм|location)/i.test(text)) return "location";
  return "lore";
}

async function nextCopyPath(safePath) {
  const ext = ".md";
  const base = safePath.endsWith(ext) ? safePath.slice(0, -ext.length) : safePath;
  let index = 2;
  while (pageByPath.has(`${base}-${index}${ext}`)) index += 1;
  return `${base}-${index}${ext}`;
}

function pickCleanTitle(candidates = []) {
  for (const candidate of candidates) {
    const fixed = repairMojibake(candidate || "").trim();
    if (!fixed || fixed.toLowerCase() === "link" || looksLikeMojibake(fixed)) continue;
    return fixed;
  }
  return "Untitled";
}

function inferLoreSubtype(title = "", content = "", frontmatter = {}) {
  const existing = repairMojibake(frontmatter.loreSubtype || frontmatter.subtype || "").trim();
  if (existing && existing !== "general") return existing;
  const text = `${title}
${content}`.toLowerCase();
  if (/(фракц|гильд|синдикат|орден|легат|банд|guild|faction|syndicate|order)/i.test(text)) return "faction";
  if (/(культ|cult)/i.test(text)) return "cult";
  if (/(бог|бож|религ|церковь|god|deity|religion|church)/i.test(text)) return "god";
  if (/(артефакт|реликв|artifact|relic)/i.test(text)) return "artifact";
  if (/(истор|война|битва|эпох|history|war|battle|era)/i.test(text)) return "history";
  if (/(пророч|prophecy|omen)/i.test(text)) return "prophecy";
  if (/(маг|заклин|magic|arcane)/i.test(text)) return "magic";
  if (/(план|измерен|plane|realm)/i.test(text)) return "plane";
  return "general";
}

function normalizeImportCategory(category, type = "lore", loreSubtype = "general") {
  if (type !== "lore") return category || defaultCategory(type, loreSubtype);
  if (category && category !== "lore") return category;
  const subtypeCategories = {
    faction: "lore/factions",
    cult: "lore/cults",
    god: "lore/gods",
    artifact: "lore/artifacts",
    history: "lore/history",
    prophecy: "lore/prophecies",
    magic: "lore/magic",
    plane: "lore/planes"
  };
  return subtypeCategories[loreSubtype] || "lore";
}

function detectFactionSplitCandidates(content = "", sourceId = "import") {
  const text = repairMojibake(content || "").trim();
  const matches = [...text.matchAll(/^\s*(\d+)\.\s+(.+?)\s*$/gmu)];
  if (matches.length < 2) return [];
  return matches.map((match, index) => {
    const title = repairMojibake(match[2]).replace(/[*_`]/g, "").replace(/[.。:：]+$/u, "").trim();
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const body = text.slice(start, end).trim();
    const summary = summarize(body, {});
    return {
      id: `${sourceId}-split-${index}`,
      originalName: `${title}.md`,
      title,
      type: "lore",
      category: "lore/factions",
      loreSubtype: "faction",
      targetPath: `lore/factions/${slugify(title)}.md`,
      summary,
      frontmatter: { type: "lore", category: "lore/factions", loreSubtype: "faction", visibility: "gm" },
      content: body,
      encoding: "split-from-md",
      obsidianInfo: null,
      warnings: ["Разбито из общего файла фракций"]
    };
  });
}

function defaultCategory(type, loreSubtype = "general") {
  const categories = {
    world: "worlds",
    country: "countries",
    city: "cities",
    npc: "npcs",
    enemy: "enemies",
    quest: "quests",
    session: "sessions",
    location: "locations",
    timelineEvent: "lore/timeline"
  };
  return categories[type] || normalizeImportCategory("lore", "lore", loreSubtype);
}

export async function pageExists(relativePath) {
  try {
    await fs.access(resolveInside(config.vaultDir, ensureMarkdownPath(relativePath)));
    return true;
  } catch {
    return false;
  }
}

export { pages };
