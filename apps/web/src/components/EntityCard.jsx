import {
  BookOpenText,
  Building2,
  CalendarDays,
  Castle,
  History,
  Landmark,
  Map,
  MapPin,
  ScrollText,
  ShieldAlert,
  UserRound,
  UsersRound
} from "lucide-react";
import HoverPreviewCard from "./HoverPreviewCard.jsx";
import CodexCard from "./ui/CodexCard.jsx";
import { labelCategory } from "../utils/labels.js";

const TYPE_META = {
  world: { label: "Мир", icon: Castle },
  country: { label: "Страна", icon: Landmark },
  city: { label: "Город", icon: Building2 },
  location: { label: "Локация", icon: MapPin },
  npc: { label: "NPC", icon: UsersRound },
  pc: { label: "Персонаж", icon: UserRound },
  enemy: { label: "Враг", icon: ShieldAlert },
  quest: { label: "Квест", icon: ScrollText },
  session: { label: "Сессия", icon: CalendarDays },
  lore: { label: "Лор", icon: BookOpenText },
  timelineEvent: { label: "Событие", icon: History },
  map: { label: "Карта", icon: Map }
};

function textValue(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function typeFacts(page = {}) {
  const fm = page.frontmatter || {};
  const values = {
    world: [["Тема", fm.theme], ["Тон", fm.tone]],
    country: [["Столица", fm.capital], ["Власть", fm.ruler]],
    city: [["Регион", fm.region], ["Население", fm.population]],
    location: [["Тип", fm.locationType], ["Владелец", fm.owner]],
    npc: [["Роль", fm.role], ["Статус", fm.status], ["Фракция", fm.faction]],
    pc: [["Класс", fm.className], ["Уровень", fm.level], ["Игрок", fm.playerName]],
    enemy: [["Уровень", fm.level], ["Угроза", fm.threat], ["Тип", fm.creatureType]],
    quest: [["Статус", fm.status], ["Квестодатель", fm.giver]],
    session: [["Сессия", fm.sessionNumber], ["Дата", fm.sessionDate]],
    lore: [["Подтип", fm.subtype], ["Эпоха", fm.timelineYear]],
    timelineEvent: [["Дата", fm.year], ["Эра", fm.era], ["Важность", fm.importance]],
    map: [["Регион", fm.mapRegion], ["Масштаб", fm.mapScale]]
  };
  return (values[page.type] || []).map(([label, value]) => [label, textValue(value)]).filter(([, value]) => value).slice(0, 3);
}

function contextLabel(page = {}) {
  return [page.world, page.country, page.city].filter(Boolean).join(" · ");
}

function visibilityLabel(value = "public") {
  if (value === "gm") return "Только GM";
  if (value === "draft") return "Черновик";
  if (value === "revealed") return "Открыто партии";
  return "Public";
}

export default function EntityCard({ page, mode }) {
  const meta = TYPE_META[page.type] || { label: labelCategory(page.category), icon: BookOpenText };
  const Icon = meta.icon;
  const facts = typeFacts(page);
  const context = contextLabel(page);
  const tags = Array.isArray(page.tags) ? page.tags.slice(0, 3) : [];

  return (
    <CodexCard className="entity-card entity-card-v2" to={`/page/${encodeURIComponent(page.path)}`} tone={page.type || page.category || "article"}>
      <header className="entity-card__header">
        <span className="entity-card__icon" aria-hidden="true"><Icon size={20} /></span>
        <div>
          <span className="codex-card__eyebrow">{meta.label} · {labelCategory(page.category)}</span>
          <h3 className="codex-card__title">{page.title}</h3>
        </div>
        <span className={`entity-card__visibility entity-card__visibility--${page.visibility || "public"}`}>{visibilityLabel(page.visibility)}</span>
      </header>

      {context ? <p className="entity-card__context"><MapPin size={14} /> {context}</p> : null}
      <p className="codex-card__summary">{page.summary || "Краткое описание пока не заполнено."}</p>

      {facts.length ? (
        <dl className="entity-card__facts">
          {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      ) : null}

      <div className="codex-card__meta tag-row entity-card__tags">
        {tags.map((tag) => <span key={tag}>{tag}</span>)}
        {!tags.length && mode === "gm" ? <span className="entity-card__tag-empty">Без тегов</span> : null}
      </div>
      <HoverPreviewCard page={page} mode={mode} />
    </CodexCard>
  );
}
