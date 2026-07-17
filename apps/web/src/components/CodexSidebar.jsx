import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Archive,
  BookOpen,
  CalendarDays,
  Castle,
  CircleHelp,
  Dices,
  FileText,
  Gauge,
  Globe2,
  Home,
  Import,
  Layers3,
  MapPinned,
  NotebookPen,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import {
  buildAppPath,
  campaignHomePath,
  navigationGroupsFor,
  routeForPath
} from "../routing/appRoutes.js";

const ICONS = {
  archive: Archive,
  campaigns: Layers3,
  character: UserRound,
  characters: UsersRound,
  create: Sparkles,
  dice: Dices,
  entry: FileText,
  handouts: Sparkles,
  health: Gauge,
  help: CircleHelp,
  home: Home,
  imports: Import,
  maps: MapPinned,
  notes: NotebookPen,
  players: UsersRound,
  preview: ShieldCheck,
  profile: UserRound,
  session: Dices,
  sessions: CalendarDays,
  settings: Settings,
  timeline: ScrollText,
  visibility: ShieldCheck,
  world: Globe2
};

function role(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function NavGroup({ title, children }) {
  return (
    <div className="nav-group">
      <span className="nav-group-title">{title}</span>
      <div className="nav-group-links">{children}</div>
    </div>
  );
}

function routeTarget(definition, campaignId) {
  if (definition.scope === "campaign") return buildAppPath(definition.id, { campaignId });
  return buildAppPath(definition.id);
}

function NavItem({ definition, campaignId, onClose }) {
  const Icon = ICONS[definition.icon] || BookOpen;
  const to = routeTarget(definition, campaignId);
  return (
    <NavLink to={to} className="nav-link" onClick={onClose}>
      <Icon size={18} aria-hidden="true" />
      <span>{definition.title}</span>
    </NavLink>
  );
}

export default function CodexSidebar({ sidebarRef, isOpen = false, onClose, session, activeWorld = null }) {
  const location = useLocation();
  const signedIn = Boolean(session?.user);
  const hasCampaign = Boolean(session?.activeMembership?.id && session?.activeCampaign?.id);
  const currentRole = role(session);
  const canManage = hasCampaign && (currentRole === "owner" || currentRole === "gm");
  const campaignId = session?.activeCampaign?.id || "";
  const groups = navigationGroupsFor({ signedIn, hasCampaign, canManage });
  const activeRoute = routeForPath(location.pathname).definition;
  const brandTarget = signedIn ? (hasCampaign ? campaignHomePath(campaignId) : buildAppPath("campaignSelect")) : buildAppPath("login");

  return (
    <aside className="sidebar sidebar-shell" id="campaign-sidebar" ref={sidebarRef} aria-label="Навигация Party Codex" aria-hidden={!isOpen} inert={isOpen ? undefined : ""}>
      <div className="sidebar-head">
        <Link to={brandTarget} className="brand" onClick={onClose}>
          <Castle aria-hidden="true" />
          <span>{hasCampaign ? session?.activeCampaign?.name || "Party Codex" : "Party Codex"}</span>
        </Link>
        <button type="button" className="sidebar-close" onClick={onClose} title="Закрыть навигацию" aria-label="Закрыть навигацию">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {hasCampaign ? (
        <div className="sidebar-context-card">
          <span className="kicker">{canManage ? "GM Portal" : "Player Portal"}</span>
          <strong>{activeWorld?.title || session?.activeCampaign?.name || "Кампания"}</strong>
          <p>{activeRoute.title}. Активная роль: {currentRole || "player"}.</p>
        </div>
      ) : null}

      <nav className="nav-stack nav-stack-shell" aria-label="Основная навигация">
        {groups.map((group) => (
          <NavGroup key={group.id} title={group.label}>
            {group.routes.map((definition) => (
              <NavItem key={definition.id} definition={definition} campaignId={campaignId} onClose={onClose} />
            ))}
          </NavGroup>
        ))}
      </nav>
    </aside>
  );
}
