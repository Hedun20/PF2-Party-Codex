import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Flame, Globe2, Network, Sparkles } from "lucide-react";
import CodexButton from "./ui/CodexButton.jsx";
import { getWorlds, worldRoute } from "../utils/worldContext.js";

function normalizeTags(tags = []) {
  return tags.map((tag) => String(tag).toLowerCase());
}

function getAffinity(page) {
  const explicit = String(page.frontmatter?.theme || page.frontmatter?.affinity || "").toLowerCase();
  const tags = normalizeTags(page.tags);
  const text = [explicit, page.title, page.summary, ...tags].join(" ").toLowerCase();
  if (/fire|flame|lava|ash|пеп|огонь|лава|вулкан|solar|солн/.test(text)) return "fire";
  if (/ocean|sea|tide|мор|океан|пират|порт|water/.test(text)) return "tide";
  if (/shadow|night|dark|некро|нежить|ноч|тень|undead/.test(text)) return "shadow";
  if (/forest|wild|fey|лес|чаща|феи|nature/.test(text)) return "forest";
  if (/frost|ice|snow|север|лед|дракон/.test(text)) return "frost";
  if (/portal|astral|arcane|magic|маг|план|разлом/.test(text)) return "arcane";
  return "neutral";
}

function countWorldChildren(world, pages, predicate) {
  return pages.filter((page) => page.path !== world.path)
    .filter((page) => page.world === world.title || page.parent === world.title)
    .filter(predicate).length;
}

function WorldCard({ world, pages }) {
  const locations = countWorldChildren(world, pages, (page) => ["countries", "cities", "locations", "maps"].includes(page.category));
  const characters = countWorldChildren(world, pages, (page) => ["characters", "npcs", "enemies"].includes(page.category));
  const events = countWorldChildren(world, pages, (page) => page.type === "timelineEvent" || page.category === "timeline" || page.category === "lore/timeline" || page.frontmatter?.year || page.frontmatter?.timelineYear);
  const affinity = getAffinity(world);
  const tags = world.tags?.length ? world.tags.slice(0, 4) : [world.frontmatter?.theme || affinity];

  return (
    <article className={`world-shell-card world-shell-card--wide ${affinity}`}>
      <span className="world-constellation" aria-hidden="true" />
      <span className="world-orbit orbit-main" aria-hidden="true" />
      <span className="world-orbit orbit-cross" aria-hidden="true" />
      <span className="world-liquid" aria-hidden="true" />
      <span className="world-card-flare" aria-hidden="true" />

      <div className="world-shell-top">
        <span className="world-kind">{world.frontmatter?.kind || world.frontmatter?.tone || "world entry"}</span>
        <Globe2 size={22} />
      </div>

      <div className="world-plane" aria-hidden="true">
        <span className="plane-core" />
        <span className="plane-ring ring-one" />
        <span className="plane-ring ring-two" />
        <span className="plane-sigil">✦</span>
      </div>

      <div className="world-copy">
        <h3>{world.title}</h3>
        <p>{world.summary || "Мир пока ждёт описания. Добавь pitch, главный конфликт и player-safe вводную."}</p>
      </div>

      <div className="world-tag-row">
        {tags.map((tag) => <span key={tag}>{tag}</span>)}
      </div>

      <div className="world-stat-row" aria-label="Связанные материалы мира">
        <span><strong>{locations}</strong><em>места</em></span>
        <span><strong>{characters}</strong><em>лица</em></span>
        <span><strong>{events}</strong><em>события</em></span>
      </div>

      <div className="world-card-actions">
        <CodexButton as={Link} to={worldRoute(world)} size="md" className="world-open-button">
          <span>Войти в мир</span>
          <ArrowRight size={16} />
        </CodexButton>
      </div>
    </article>
  );
}

function WorldsEmptyState() {
  return (
    <div className="worlds-empty-state">
      <Sparkles size={28} />
      <h3>Реальные миры ещё не созданы</h3>
      <p>Кампания стартует честно пустой. Открой руководство, затем создай первый мир через структурированный редактор.</p>
      <div className="worlds-empty-actions">
        <CodexButton as={Link} to="/category/_guides" variant="secondary"><BookOpen size={16} /> Гайды</CodexButton>
        <CodexButton as={Link} to="/category/_examples" variant="ghost">Примеры</CodexButton>
      </div>
    </div>
  );
}

export default function WorldAtlas({ pages = [] }) {
  const worlds = getWorlds(pages);

  return (
    <section className="atlas-layout worlds-only-layout worlds-cinematic-layout" aria-label="Миры кампании">
      <div className="worlds-panel worlds-cinematic-panel">
        <span className="cosmic-line line-one" aria-hidden="true" />
        <span className="cosmic-line line-two" aria-hidden="true" />
        <span className="cosmic-star star-one" aria-hidden="true">✦</span>
        <span className="cosmic-star star-two" aria-hidden="true">✧</span>

        <div className="atlas-title-row worlds-title-row">
          <div>
            <span className="kicker">World Hub</span>
            <h2>Миры кампании</h2>
            <p>Широкие входные карточки: атмосфера, быстрый смысл, связанные места, персонажи и события.</p>
          </div>
          <div className="atlas-badge">
            <Network size={18} />
            <span>world → places → people → timeline</span>
          </div>
        </div>

        {worlds.length > 0 ? (
          <div className="world-shell-grid world-shell-grid--wide">
            {worlds.map((world) => <WorldCard key={world.path} world={world} pages={pages} />)}
          </div>
        ) : <WorldsEmptyState />}
      </div>

      <aside className="minor-worlds-panel worlds-command-panel">
        <span className="minor-orbit" aria-hidden="true" />
        <span className="kicker">Следующий слой</span>
        <h2>Living Timeline</h2>
        <p>Timeline живёт отдельно: события, NPC, города и подсветка связей не мешают обзору миров.</p>
        <CodexButton as={Link} to="/timeline" variant="secondary"><Flame size={16} /> Открыть Timeline</CodexButton>
        <div className="world-notes">
          <strong>Что готовим дальше</strong>
          <span>ветки событий вместо плоской ленты</span>
          <span>hover-подсветка связанных городов/NPC</span>
          <span>player-safe режим без GM-секретов</span>
        </div>
      </aside>
    </section>
  );
}
