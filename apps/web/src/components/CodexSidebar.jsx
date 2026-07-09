import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  Castle,
  Clock3,
  Crosshair,
  FileQuestion,
  Globe2,
  Hammer,
  Home,
  Map,
  MapPinned,
  NotebookPen,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  UsersRound,
  Wrench,
  X
} from "lucide-react";
import LoreDropdown from "./LoreDropdown.jsx";
import { worldRoute } from "../utils/worldContext.js";

const codexSections = [
  ["Миры", "/category/worlds", Globe2],
  ["Страны", "/category/countries", Map],
  ["Города", "/category/cities", Castle],
  ["Локации", "/category/locations", MapPinned],
  ["NPC", "/category/npcs", UsersRound],
  ["Враги", "/category/enemies", Swords],
  ["Квесты", "/category/quests", ScrollText]
];

const playerSections = [
  ["Домой", "/player", Home],
  ["Известный архив", "/archive", BookOpen],
  ["Материалы", "/handouts", Sparkles],
  ["Карты", "/maps", MapPinned],
  ["Timeline", "/timeline", Clock3],
  ["Мой персонаж", "/characters", UserRound],
  ["Мои заметки", "/notes", NotebookPen],
  ["Кубики", "/dice", Crosshair],
  ["Профиль", "/profile", UserRound]
];

function scopedPath(activeWorld, path) {
  if (!activeWorld) return path;
  if (path === "/") return worldRoute(activeWorld);
  if (path === "/maps" || path === "/timeline") return `${worldRoute(activeWorld)}${path}`;
  if (path.startsWith("/category/")) return `${worldRoute(activeWorld)}${path}`;
  return path;
}

function NavGroup({ title, children }) {
  return (
    <div className="nav-group">
      <span className="nav-group-title">{title}</span>
      <div className="nav-group-links">{children}</div>
    </div>
  );
}

function NavItem({ to, icon: Icon, label, onClose, className = "" }) {
  return (
    <NavLink to={to} className={`nav-link ${className}`.trim()} onClick={onClose}>
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function CodexSidebar({ onClose, canEdit = false, activeWorld = null, signedIn = false, hasCampaignMembership = true }) {
  const brandTarget = activeWorld ? worldRoute(activeWorld) : "/";
  const showOnboardingNav = signedIn && !hasCampaignMembership;

  return (
    <aside className="sidebar sidebar-v2">
      <div className="sidebar-head">
        <Link to={brandTarget} className="brand" onClick={onClose}>
          <Castle />
          <span>{activeWorld ? activeWorld.title : "PF2 Party Codex"}</span>
        </Link>
        <button className="sidebar-close" onClick={onClose} title="Закрыть навигацию">
          <X size={18} />
        </button>
      </div>

      {activeWorld && !showOnboardingNav && (
        <div className="sidebar-world-card">
          <span className="kicker">Активный мир</span>
          <strong>{activeWorld.title}</strong>
          <p>{activeWorld.summary || "Фильтр мира активен. Навигация ниже показывает материалы этого мира."}</p>
          <Link to="/" onClick={onClose}><Home size={15} /> Все миры</Link>
        </div>
      )}

      <nav className="nav-stack nav-stack-v2" aria-label="Main navigation">
        {showOnboardingNav ? (
          <>
            <NavGroup title="Настройка аккаунта">
              <NavItem to="/" icon={Sparkles} label="Создать или присоединиться" onClose={onClose} />
              <NavItem to="/profile" icon={UserRound} label="Профиль" onClose={onClose} />
            </NavGroup>
            <NavGroup title="Помощь">
              <NavItem to="/guide" icon={BookOpen} label="Гайд" onClose={onClose} />
            </NavGroup>
          </>
        ) : canEdit ? (
          <>
            <NavGroup title="GM Portal">
              <NavItem to="/" icon={Home} label="Dashboard" onClose={onClose} />
              <NavItem to="/archive" icon={BookOpen} label="Архив кампании" onClose={onClose} />
              <NavItem to="/my" icon={UserRound} label="Рабочий стол" onClose={onClose} />
              <NavItem to="/players" icon={UsersRound} label="Игроки" onClose={onClose} />
            </NavGroup>

            <NavGroup title="World Codex">
              {codexSections.map(([label, path, Icon]) => (
                <NavItem key={path} to={scopedPath(activeWorld, path)} icon={Icon} label={label} onClose={onClose} />
              ))}
              <NavItem to={scopedPath(activeWorld, "/maps")} icon={MapPinned} label={activeWorld ? "Карты мира" : "Карты"} onClose={onClose} />
              <NavItem to={scopedPath(activeWorld, "/timeline")} icon={Clock3} label={activeWorld ? "Timeline мира" : "Timeline"} onClose={onClose} />
              {!activeWorld && <LoreDropdown />}
            </NavGroup>

            <NavGroup title="GM Operations">
              <NavItem to={activeWorld ? `/editor?world=${encodeURIComponent(activeWorld.title)}` : "/editor"} icon={Crosshair} label={activeWorld ? "Создать в мире" : "Создать статью"} onClose={onClose} className="primary-link" />
              <NavItem to={activeWorld ? `${worldRoute(activeWorld)}/session` : "/sessions"} icon={BookOpen} label="Сессии" onClose={onClose} />
              <NavItem to={activeWorld ? `${worldRoute(activeWorld)}/reveal` : "/handouts"} icon={Sparkles} label="Материалы / Reveal" onClose={onClose} />
              <NavItem to="/characters" icon={UsersRound} label="Персонажи" onClose={onClose} />
              <NavItem to="/notes" icon={NotebookPen} label="Заметки" onClose={onClose} />
              <NavItem to="/dice" icon={Crosshair} label="Кубики" onClose={onClose} />
            </NavGroup>

            <NavGroup title="System">
              <NavItem to="/settings" icon={Settings} label="Настройки" onClose={onClose} />
              <NavItem to="/gm-tools" icon={Wrench} label="GM Tools" onClose={onClose} />
              <NavItem to="/health" icon={ShieldCheck} label="Vault Control" onClose={onClose} />
              <NavItem to="/foundry" icon={Hammer} label="Foundry Import/Export" onClose={onClose} />
              <NavItem to="/missing" icon={FileQuestion} label="Недостающие статьи" onClose={onClose} />
              <NavItem to="/player-safety" icon={ShieldAlert} label="Player Safety" onClose={onClose} />
              <NavItem to="/guide" icon={BookOpen} label="Гайд" onClose={onClose} />
            </NavGroup>
          </>
        ) : (
          <>
            <NavGroup title="Player Portal">
              {playerSections.map(([label, path, Icon]) => (
                <NavItem key={path} to={scopedPath(activeWorld, path)} icon={Icon} label={label} onClose={onClose} />
              ))}
            </NavGroup>

            <NavGroup title="Архив кампании">
              <NavItem to={scopedPath(activeWorld, "/category/worlds")} icon={Globe2} label="Миры" onClose={onClose} />
              <NavItem to={scopedPath(activeWorld, "/category/npcs")} icon={UsersRound} label="Известные NPC" onClose={onClose} />
              <NavItem to={scopedPath(activeWorld, "/category/locations")} icon={Map} label="Локации" onClose={onClose} />
              <NavItem to="/guide" icon={BookOpen} label="Гайд" onClose={onClose} />
            </NavGroup>
          </>
        )}
      </nav>
    </aside>
  );
}
