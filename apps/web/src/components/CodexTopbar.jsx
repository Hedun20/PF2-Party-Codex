import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Archive, ChevronDown, Dices, Globe2, LogIn, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { getWorlds, worldSlug } from "../utils/worldContext.js";
import { changeScopePath, modeHome, modeMeta, shellModeFromLocation } from "../utils/shellContext.js";

function activeRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function roleLabel(role, signedIn) {
  if (role === "owner") return "Owner";
  if (role === "gm") return "GM";
  if (role === "player") return "Player";
  return signedIn ? "No campaign" : "Guest";
}

function modeIcon(mode) {
  if (mode === "table") return Dices;
  if (mode === "management") return Settings;
  return Archive;
}

function HeaderDropdown({ id, open, setOpen, icon: Icon, label, children, className = "" }) {
  const expanded = open === id;
  return (
    <div className={`topbar-dropdown ${expanded ? "is-open" : ""} ${className}`.trim()}>
      <button type="button" className="topbar-dropdown-trigger" onClick={() => setOpen(expanded ? "" : id)} aria-expanded={expanded}>
        {Icon ? <Icon size={16} /> : null}
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>
      {expanded ? <div className="topbar-dropdown-menu">{children}</div> : null}
    </div>
  );
}

export default function CodexTopbar({ session, pages, allPages, sidebarOpen, setSidebarOpen, activeWorld, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState("");
  const currentMode = shellModeFromLocation(location.pathname, location.search);
  const meta = modeMeta(currentMode);
  const ModeIcon = modeIcon(currentMode);
  const hasMembership = Boolean(session?.activeMembership?.id);
  const signedIn = Boolean(session?.user);
  const campaignNavAvailable = signedIn && hasMembership;
  const sourcePages = campaignNavAvailable ? allPages || pages : [];
  const worlds = getWorlds(sourcePages);
  const role = activeRole(session);
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const campaignName = session?.activeCampaign?.name || "PF2 Party Codex";
  const accountLabel = session?.user?.name || session?.user?.email || "Guest";

  function changeWorld(world = null) {
    navigate(changeScopePath(location.pathname, location.search, world));
    setOpenDropdown("");
  }

  function closeDropdown() {
    setOpenDropdown("");
  }

  return (
    <header className="topbar topbar-v2 topbar-clean">
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Open navigation">
        <Menu size={20} />
      </button>

      <Link to="/" className="topbar-brand-compact" title={campaignName}>
        <span>PF2 Party Codex</span>
        <strong>{campaignName}</strong>
      </Link>

      {campaignNavAvailable ? (
        <div className="topbar-clean-controls">
          <HeaderDropdown id="mode" open={openDropdown} setOpen={setOpenDropdown} icon={ModeIcon} label={meta.label} className="topbar-dropdown--mode">
            <Link to={modeHome("archive", canManage, activeWorld)} onClick={closeDropdown}><Archive size={15} /> Архив</Link>
            <Link to={modeHome("table", canManage, activeWorld)} onClick={closeDropdown}><Dices size={15} /> Игровой стол</Link>
            <Link to={modeHome("management", canManage, activeWorld)} onClick={closeDropdown}><Settings size={15} /> {canManage ? "Управление" : "Профиль"}</Link>
          </HeaderDropdown>

          <HeaderDropdown id="world" open={openDropdown} setOpen={setOpenDropdown} icon={Globe2} label={activeWorld?.title || "Вся кампания"} className="topbar-dropdown--world">
            <button type="button" onClick={() => changeWorld(null)} className={!activeWorld ? "is-active" : ""}>Вся кампания</button>
            {worlds.map((world) => (
              <button key={world.path} type="button" onClick={() => changeWorld(world)} className={activeWorld && worldSlug(activeWorld) === worldSlug(world) ? "is-active" : ""}>
                {world.title}
              </button>
            ))}
            {canManage ? <Link to="/category/worlds" onClick={closeDropdown}>+ Создать / открыть миры</Link> : null}
          </HeaderDropdown>
        </div>
      ) : null}

      <div className="topbar-clean-spacer" />

      <HeaderDropdown id="account" open={openDropdown} setOpen={setOpenDropdown} icon={UserRound} label={accountLabel} className="topbar-dropdown--account">
        <span className="topbar-account-meta">{roleLabel(role, signedIn)}</span>
        {session?.user ? <Link to="/profile" onClick={closeDropdown}>Профиль</Link> : null}
        {session?.user ? <Link to="/settings" onClick={closeDropdown}>Настройки</Link> : null}
        {session?.user ? <button type="button" onClick={() => { closeDropdown(); onLogout?.(); }}><LogOut size={14} /> Выйти</button> : <Link to="/login" onClick={closeDropdown}><LogIn size={14} /> Войти</Link>}
      </HeaderDropdown>
    </header>
  );
}
