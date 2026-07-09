import { Link } from "react-router-dom";
import { BookOpen, Clock3, Dices, NotebookPen, PenLine, Settings, Sparkles, UserRound, UsersRound } from "lucide-react";
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

function ModeCard({ to, icon: Icon, title, description, links = [], primary = false }) {
  return (
    <article className={`codex-card product-mode-card${primary ? " product-mode-card--primary" : ""}`}>
      <Link to={to} className="product-mode-main-link">
        <Icon size={28} />
        <strong>{title}</strong>
        <span>{description}</span>
      </Link>
      {links.length ? (
        <div className="product-mode-link-row">
          {links.map(([label, path]) => <Link key={path} to={path}>{label}</Link>)}
        </div>
      ) : null}
    </article>
  );
}

function ProductModeDashboard({ pages, canEdit = false, campaignName = "" }) {
  const mapCount = pages.filter((page) => page.mapImage).length;
  const worldCount = pages.filter((page) => page.category === "worlds" || page.type === "world").length;
  const publicCount = pages.filter((page) => page.visibility === "public").length;

  const gmModes = [
    {
      to: "/archive",
      icon: BookOpen,
      title: "Архив кампании",
      description: "Подготовка: миры, NPC, квесты, лор, timeline, карты GM и материалы игрокам.",
      primary: true,
      links: [["Создать", "/editor"], ["Timeline", "/timeline"], ["Материалы", "/handouts"]]
    },
    {
      to: "/session-desk",
      icon: Dices,
      title: "Игровой стол",
      description: "Живая сессия: кубики, быстрые заметки, материалы игрокам и быстрый доступ к архиву.",
      links: [["Кубики", "/dice"], ["Заметки", "/notes"], ["Сессии", "/sessions"]]
    },
    {
      to: "/players",
      icon: Settings,
      title: "Управление",
      description: "Игроки, приглашения, профиль, настройки и диагностика кампании.",
      links: [["Игроки", "/players"], ["Профиль", "/profile"], ["Настройки", "/settings"]]
    }
  ];

  const playerModes = [
    {
      to: "/session-desk",
      icon: UserRound,
      title: "Мой игровой стол",
      description: "Персонаж, кубики, заметки и материалы, которые GM открыл для игры.",
      primary: true,
      links: [["Персонаж", "/characters"], ["Кубики", "/dice"], ["Заметки", "/notes"]]
    },
    {
      to: "/archive",
      icon: BookOpen,
      title: "Известный архив",
      description: "Лор, NPC, квесты и сведения, доступные участнику кампании.",
      links: [["Лор", "/archive"], ["Материалы", "/handouts"]]
    },
    {
      to: "/profile",
      icon: Settings,
      title: "Профиль",
      description: "Аккаунт, кампания и роль участника.",
      links: [["Профиль", "/profile"], ["Настройки", "/settings"]]
    }
  ];

  const modes = canEdit ? gmModes : playerModes;

  return (
    <section className="workbench-panel product-mode-panel">
      <div className="workbench-copy">
        <span className="kicker">{canEdit ? "GM Dashboard" : "Player Dashboard"}</span>
        <h2>{canEdit ? "Выберите рабочую зону" : "Выберите режим игры"}</h2>
        <p>{canEdit
          ? "Проект разделён на три зоны: подготовка в архиве, живая игра за игровым столом и управление кампанией."
          : "Участнику доступны игровой стол, известный архив и профиль. Карты не вынесены отдельно: GM открывает нужные изображения как материалы игрокам."}</p>
        {campaignName ? <p>Кампания: <strong>{campaignName}</strong></p> : null}
      </div>

      <div className="product-mode-grid">
        {modes.map((mode) => <ModeCard key={mode.to} {...mode} />)}
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
        <span className="kicker">PF2 Party Codex</span>
        <h1>{session?.activeCampaign?.name || "Campaign Dashboard"}</h1>
        <p>{dashboard?.summary || "Две главные зоны продукта: Архив кампании для подготовки и Игровой стол для живой сессии."}</p>
      </section>
      <ProductModeDashboard pages={pages} canEdit={canEdit} campaignName={session?.activeCampaign?.name || ""} />
      {dashboard && <MarkdownViewer content={dashboard.content} pages={pages} />}
      {canEdit && blocks.map(([title, category]) => {
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
