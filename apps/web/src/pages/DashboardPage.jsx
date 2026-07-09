import { Link } from "react-router-dom";
import { BookOpen, Clock3, Dices, FileQuestion, MapPinned, PenLine, Sparkles, UsersRound } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";

const blocks = [
  ["Активные квесты", "quests"],
  ["Важные NPC", "npcs"],
  ["Известные враги", "enemies"],
  ["Свежий лор", "lore"],
  ["Сессии", "sessions"],
  ["Локации", "locations"]
];

function canManageCampaign(session) {
  const role = String(session?.activeMembership?.role || "").toLowerCase();
  return role === "owner" || role === "gm";
}

function DashboardAction({ to, icon: Icon, title, description, primary = false }) {
  return (
    <Link to={to} className={`codex-card workbench-action${primary ? " primary-workbench-card" : ""}`}>
      <Icon size={20} />
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
}

function MasterWorkbench({ pages, canEdit = false, campaignName = "" }) {
  const mapCount = pages.filter((page) => page.mapImage).length;
  const worldCount = pages.filter((page) => page.category === "worlds" || page.type === "world").length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  const gmActions = [
    ["/editor", PenLine, "Создать материал", "Статья, NPC, город, квест, сессия, карта или событие.", true],
    ["/players", UsersRound, "Игроки и приглашения", "Добавить участника и скопировать invite link."],
    ["/archive", BookOpen, "Архив кампании", "Mongo-сводка всех разделов кампании."],
    ["/handouts", Sparkles, "Материалы / Reveal", "Проверить, что открыто участникам."],
    ["/dice", Dices, "Кубики", "Локальный dice tray для быстрых бросков."],
    ["/missing", FileQuestion, "Недостающие статьи", "Wiki-ссылки, для которых ещё нет материала."]
  ];

  const playerActions = [
    ["/archive", BookOpen, "Известный архив", "Лор и материалы, которые доступны участнику."],
    ["/handouts", Sparkles, "Материалы", "Открытые GM подсказки, изображения и handouts."],
    ["/maps", MapPinned, "Карты", `${mapCount} карт в видимых слоях.`],
    ["/timeline", Clock3, "Timeline", "Известные события и публичная история."],
    ["/dice", Dices, "Кубики", "Локальный dice tray для быстрых бросков."]
  ];

  const actions = canEdit ? gmActions : playerActions;

  return (
    <section className="workbench-panel">
      <div className="workbench-copy">
        <span className="kicker">{canEdit ? "GM Dashboard" : "Player Dashboard"}</span>
        <h2>{canEdit ? "Рабочий стол мастера" : "Портал участника"}</h2>
        <p>{canEdit
          ? "Быстрый старт для подготовки и ведения сессии: материалы, игроки, архив, handouts, карты и кубики."
          : "Безопасный доступ к тому, что GM уже открыл: архив, материалы, карты, timeline и кубики."}</p>
        {campaignName ? <p>Кампания: <strong>{campaignName}</strong></p> : null}
      </div>

      <div className="workbench-actions">
        {actions.map(([to, Icon, title, description, primary]) => (
          <DashboardAction key={to} to={to} icon={Icon} title={title} description={description} primary={primary} />
        ))}
      </div>

      <div className="workbench-stats">
        <span><strong>{worldCount}</strong> миров</span>
        <span><strong>{publicCount}</strong> публичных</span>
        <span><strong>{mapCount}</strong> карт</span>
      </div>
    </section>
  );
}

export default function DashboardPage({ pages, dashboard, mode, session }) {
  const canEdit = mode === "gm" && canManageCampaign(session);

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <span className="kicker">Campaign Codex</span>
        <h1>{session?.activeCampaign?.name || "PF2 Party Codex"}</h1>
        <p>{dashboard?.summary || "Архив кампании для миров, лора, сессий, GM-секретов, handouts и playtest-материалов."}</p>
      </section>
      <MasterWorkbench pages={pages} canEdit={canEdit} campaignName={session?.activeCampaign?.name || ""} />
      {dashboard && <MarkdownViewer content={dashboard.content} pages={pages} />}
      {blocks.map(([title, category]) => {
        const items = pages.filter((page) => page.category === category || page.category?.startsWith(`${category}/`)).slice(0, 4);
        return (
          <section className="section-band" key={category}>
            <h2>{title}</h2>
            <div className="codex-card-grid card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
