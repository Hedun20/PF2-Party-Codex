import { Link, useLocation, useNavigate } from "react-router-dom";
import { Archive, Dices, Globe2, Layers3, LogIn, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { getWorlds, worldSlug } from "../utils/worldContext.js";
import { changeScopePath, modeHome, shellModeFromLocation } from "../utils/shellContext.js";

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

function closeAccountMenu(event) {
  event.currentTarget.closest("details")?.removeAttribute("open");
}

export default function CodexTopbar({
  session,
  pages,
  allPages,
  campaigns = [],
  campaignSwitching = false,
  onCampaignChange,
  sidebarOpen,
  setSidebarOpen,
  sidebarToggleRef,
  activeWorld,
  onLogout
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentMode = shellModeFromLocation(location.pathname, location.search);
  const ModeIcon = modeIcon(currentMode);
  const hasMembership = Boolean(session?.activeMembership?.id);
  const signedIn = Boolean(session?.user);
  const campaignNavAvailable = signedIn && hasMembership;
  const sourcePages = campaignNavAvailable ? allPages || pages : [];
  const worlds = getWorlds(sourcePages);
  const role = activeRole(session);
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const campaignName = session?.activeCampaign?.name || "Party Codex";
  const campaignId = session?.activeCampaign?.id || "";
  const accountLabel = session?.user?.name || session?.user?.email || "Guest";
  const selectedWorld = activeWorld ? worldSlug(activeWorld) : "";
  const campaignOptions = campaigns.filter((item) => item?.campaign?.id);
  const currentCampaignListed = campaignOptions.some((item) => item.campaign.id === campaignId);
  const hasAlternativeCampaign = campaignOptions.some((item) => item.campaign.id !== campaignId);

  function changeCampaign(event) {
    const nextCampaignId = event.target.value;
    if (!nextCampaignId || nextCampaignId === campaignId || campaignSwitching) return;
    Promise.resolve(onCampaignChange?.(nextCampaignId)).catch(() => {});
  }

  function changeMode(event) {
    const nextMode = event.target.value;
    if (!nextMode || nextMode === currentMode) return;
    navigate(modeHome(nextMode, canManage, activeWorld));
  }

  function changeWorld(event) {
    const nextSlug = event.target.value;
    const nextWorld = nextSlug ? worlds.find((world) => worldSlug(world) === nextSlug) || null : null;
    navigate(changeScopePath(location.pathname, location.search, nextWorld));
  }

  return (
    <header className="topbar topbar-shell topbar-clean">
      <button ref={sidebarToggleRef} type="button" className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Open navigation" aria-expanded={sidebarOpen} aria-controls="campaign-sidebar">
        <Menu size={20} />
      </button>

      <Link to="/" className="topbar-brand-compact" title={campaignName}>
        <span>Party Codex</span>
        <strong>{campaignName}</strong>
      </Link>

      {signedIn ? (
        <div className="topbar-clean-controls">
          <label className="topbar-native-select topbar-native-select--campaign" title={campaignSwitching ? "Переключение кампании…" : "Активная кампания"}>
            <Layers3 size={16} aria-hidden="true" />
            <select
              aria-label="Активная кампания"
              aria-busy={campaignSwitching}
              value={campaignId}
              onChange={changeCampaign}
              disabled={campaignSwitching || !hasAlternativeCampaign}
            >
              {!campaignId && campaignOptions.length === 0 ? <option value="">Нет доступных кампаний</option> : null}
              {campaignId && !currentCampaignListed ? <option value={campaignId}>{campaignName} · {roleLabel(role, true)}</option> : null}
              {campaignOptions.map((item) => {
                const itemId = item.campaign.id;
                const itemRole = roleLabel(item.role || item.membership?.role, true);
                return <option key={itemId} value={itemId}>{item.campaign?.name || "Untitled campaign"} · {itemRole}</option>;
              })}
            </select>
          </label>

          {campaignNavAvailable ? (
            <>
              <label className="topbar-native-select topbar-native-select--mode">
                <ModeIcon size={16} aria-hidden="true" />
                <select aria-label="Раздел приложения" value={currentMode} onChange={changeMode}>
                  <option value="dashboard">Dashboard</option>
                  <option value="archive">Архив</option>
                  <option value="table">Игровой стол</option>
                  <option value="management">{canManage ? "Управление" : "Профиль"}</option>
                </select>
              </label>

              <label className="topbar-native-select topbar-native-select--world">
                <Globe2 size={16} aria-hidden="true" />
                <select aria-label="Мир кампании" value={selectedWorld} onChange={changeWorld}>
                  <option value="">Вся кампания</option>
                  {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
                </select>
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="topbar-clean-spacer" />

      <details className="topbar-account-details">
        <summary className="topbar-account-summary">
          <UserRound size={16} aria-hidden="true" />
          <span>{accountLabel}</span>
        </summary>
        <div className="topbar-account-popover">
          <span className="topbar-account-meta">{roleLabel(role, signedIn)}</span>
          {session?.user ? <Link to="/profile" onClick={closeAccountMenu}>Профиль</Link> : null}
          {hasMembership ? <Link to="/settings" onClick={closeAccountMenu}>Настройки кампании</Link> : null}
          {session?.user ? (
            <button type="button" onClick={(event) => { closeAccountMenu(event); onLogout?.(); }}><LogOut size={14} /> Выйти</button>
          ) : (
            <Link to="/login" onClick={closeAccountMenu}><LogIn size={14} /> Войти</Link>
          )}
        </div>
      </details>
    </header>
  );
}