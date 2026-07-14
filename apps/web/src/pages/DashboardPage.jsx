import { Link } from "react-router-dom";
import { Archive, BookOpen, Dices, FileQuestion, MapPinned, NotebookPen, Search, Settings, ShieldCheck, Sparkles, UserRound, UsersRound } from "lucide-react";
import { CodexButton, CodexCard, PageHero, PageShell } from "../components/ui/index.js";
import { getWorlds } from "../utils/worldContext.js";

function canManageCampaign(session) {
  const role = String(session?.activeMembership?.role || "").toLowerCase();
  return role === "owner" || role === "gm";
}

function pageCount(pages, predicate) {
  return pages.filter(predicate).length;
}

function ProductPathCard({ icon: Icon, kicker, title, description, stats, actions, primaryTo }) {
  return (
    <CodexCard className="product-path-card" as="article">
      <div className="product-path-card__head">
        <span className="product-path-card__icon"><Icon size={24} /></span>
        <div>
          <span className="kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
      </div>
      <p>{description}</p>
      <ul className="product-path-stat-list">
        {stats.map(([label, value]) => (
          <li key={label}><strong>{value}</strong><span>{label}</span></li>
        ))}
      </ul>
      <div className="product-path-card__actions">
        {actions.map((action, index) => (
          <CodexButton key={action.to} as={Link} to={action.to} variant={index === 0 ? "primary" : "ghost"} size="sm">
            <action.icon size={15} />
            <span>{action.label}</span>
          </CodexButton>
        ))}
      </div>
      <Link className="product-path-card__cover" to={primaryTo} aria-label={title} />
    </CodexCard>
  );
}

export default function DashboardPage({ pages = [], dashboard, mode, session }) {
  const canEdit = mode === "gm" && canManageCampaign(session);
  const worldCount = getWorlds(pages).length;
  const publicCount = pageCount(pages, (page) => page.visibility === "public");
  const mapCount = pageCount(pages, (page) => page.mapImage || page.category === "maps" || page.type === "map");
  const sessionCount = pageCount(pages, (page) => page.category === "sessions" || page.type === "session");
  const handoutCount = pageCount(pages, (page) => page.visibility === "public" && ["handouts", "lore", "quests"].includes(page.category));
  const articleCount = pages.length;

  const managementActions = canEdit
    ? [
        { to: "/players", label: "Players / Invites", icon: UsersRound },
        { to: "/my", label: "Workspace", icon: UserRound },
        { to: "/settings", label: "Settings", icon: Settings },
        { to: "/health", label: "Health", icon: ShieldCheck }
      ]
    : [
        { to: "/profile", label: "Profile", icon: UserRound },
        { to: "/settings", label: "Settings", icon: Settings },
        { to: "/guide", label: "Guide", icon: BookOpen }
      ];

  const cards = [
    {
      icon: Archive,
      kicker: "Campaign Archive",
      title: "Архив кампании",
      description: "Подготовка кампании: вся база знаний, миры, NPC, локации, квесты, карты и player-visible материалы.",
      stats: [["articles", articleCount], ["worlds", worldCount], ["public", publicCount], ["maps", mapCount]],
      actions: [
        { to: "/archive", label: "Archive", icon: Search },
        { to: "/category/worlds", label: "Worlds", icon: BookOpen },
        { to: "/maps", label: "Maps", icon: MapPinned },
        { to: "/handouts", label: "Handouts", icon: Sparkles }
      ],
      primaryTo: "/archive"
    },
    {
      icon: Dices,
      kicker: "Active Session / Game Table",
      title: "Игровой стол",
      description: "Рабочий стол живой игры: кубики, быстрые заметки, handouts, персонажи и быстрый возврат в архив.",
      stats: [["sessions", sessionCount], ["handouts", handoutCount], ["notes", "personal"], ["dice", "ready"]],
      actions: [
        { to: "/session-desk", label: "Session Desk", icon: Dices },
        { to: "/dice", label: "Dice", icon: Dices },
        { to: "/notes", label: "Notes", icon: NotebookPen },
        { to: "/characters", label: "Characters", icon: UserRound }
      ],
      primaryTo: "/session-desk"
    },
    {
      icon: UsersRound,
      kicker: "Management / Campaign Access",
      title: canEdit ? "Управление и игроки" : "Профиль участника",
      description: canEdit
        ? "Участники, приглашения, настройки кампании и техническое состояние workspace."
        : "Ваш профиль, настройки аккаунта и справка без доступа к GM-only инструментам.",
      stats: [["campaign role", session?.activeMembership?.role || "guest"], ["workspace", session?.activeWorkspace?.name || "not selected"], ["campaign", session?.activeCampaign?.name || "not selected"]],
      actions: managementActions,
      primaryTo: canEdit ? "/my" : "/profile"
    }
  ];

  return (
    <PageShell className="dashboard-product-shell">
      <PageHero
        kicker="Campaign Codex"
        title="Party Codex"
        description={dashboard?.summary || "Choose the work mode first: prepare the archive, run the active table, or manage campaign access. World scope is selected inside the mode."}
      />

      <section className="product-path-grid" aria-label="Product areas">
        {cards.map((card) => <ProductPathCard key={card.kicker} {...card} />)}
      </section>

      {canEdit ? (
        <CodexCard className="workspace-status-card dashboard-product-status" as="section">
          <span className="kicker">GM shortcuts</span>
          <div className="product-path-card__actions">
            <CodexButton as={Link} to="/editor" variant="primary" size="sm"><Sparkles size={15} /><span>Create article</span></CodexButton>
            <CodexButton as={Link} to="/missing" variant="ghost" size="sm"><FileQuestion size={15} /><span>Missing links</span></CodexButton>
            <CodexButton as={Link} to="/players" variant="ghost" size="sm"><UsersRound size={15} /><span>Invite player</span></CodexButton>
          </div>
        </CodexCard>
      ) : null}
    </PageShell>
  );
}
