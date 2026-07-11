import { Link } from "react-router-dom";
import { BookOpen, Clock3, Dice5, MapPinned, NotebookPen, Sparkles, UserRound, UsersRound } from "lucide-react";

function role(session) {
  return String(session?.activeMembership?.role || "player").toLowerCase();
}

function canManage(session) {
  return ["owner", "gm"].includes(role(session));
}

function roleLabel(value = "player") {
  if (value === "owner") return "Владелец";
  if (value === "gm") return "GM";
  return "Игрок";
}

export default function MyWorkspacePageV2({ session, pages = [] }) {
  const gm = canManage(session);
  const publicCount = pages.filter((page) => page.visibility === "public").length;
  const worldCount = pages.filter((page) => page.category === "worlds" || page.type === "world").length;
  const mapCount = pages.filter((page) => page.mapImage).length;
  const handoutCount = pages.filter((page) => page.handoutImage || page.frontmatter?.handoutImage || page.visibility === "public").length;

  const cards = gm ? [
    ["Игроки", "/players", UsersRound, "Участники кампании, приглашения и ссылки для входа."],
    ["Создать статью", "/editor", BookOpen, "Быстро добавить лор, NPC, квест, локацию, карту или событие."],
    ["Handouts / Reveal", "/handouts", Sparkles, "Материалы, которые мастер открывает игрокам."],
    ["Карты", "/maps", MapPinned, `${mapCount} карт или страниц с картами.`],
    ["Timeline", "/timeline", Clock3, "Хронология мира и кампании."],
    ["Заметки", "/notes", NotebookPen, "Личные, мастерские и партийные заметки."],
    ["Кубики", "/dice", Dice5, "Быстрые броски и история результатов для GM и игроков."],
    ["GM Tools", "/gm-tools", UserRound, "Импорт, health-check, Foundry и системные инструменты."]
  ] : [
    ["Мой персонаж", "/characters", UserRound, "Лист персонажа и заметки по герою."],
    ["Известный лор", "/archive", BookOpen, "Открытые игрокам материалы кампании."],
    ["Handouts", "/handouts", Sparkles, "Материалы, которые уже открыл мастер."],
    ["Карты", "/maps", MapPinned, "Доступные игрокам карты и локации."],
    ["Timeline", "/timeline", Clock3, "Известные события и история."],
    ["Мои заметки", "/notes", NotebookPen, "Личные заметки игрока."],
    ["Кубики", "/dice", Dice5, "Быстрые броски и история результатов."],
    ["Профиль", "/profile", UserRound, "Аккаунт, кампания и текущая роль."]
  ];

  return (
    <div className="page-stack workspace-page">
      <section className="hero-panel workspace-hero">
        <span className="kicker">Workspace</span>
        <h1>{gm ? "Рабочий стол GM" : "Рабочий стол игрока"}</h1>
        <p>{gm ? "Центр управления активной кампанией: игроки, архив, материалы, карты, сессии и инструменты." : "Личная зона игрока: открытый лор, персонаж, handouts, карты и заметки."}</p>
        <div className="workspace-identity-strip">
          <span>{session?.user?.name || session?.user?.email || "Пользователь"}</span>
          <span>{session?.activeCampaign?.name || "Кампания не выбрана"}</span>
          <span>{roleLabel(role(session))}</span>
        </div>
      </section>

      <section className="archive-summary-grid">
        <article className="codex-card archive-count-card"><span>Миры</span><strong>{worldCount}</strong></article>
        <article className="codex-card archive-count-card"><span>Публичные страницы</span><strong>{publicCount}</strong></article>
        <article className="codex-card archive-count-card"><span>Карты</span><strong>{mapCount}</strong></article>
        <article className="codex-card archive-count-card"><span>Handouts</span><strong>{handoutCount}</strong></article>
      </section>

      <section className="workspace-grid">
        {cards.map(([title, to, Icon, text]) => (
          <Link key={to} to={to} className="codex-card workspace-card">
            <Icon size={22} />
            <div><strong>{title}</strong><span>{text}</span></div>
          </Link>
        ))}
      </section>
    </div>
  );
}
