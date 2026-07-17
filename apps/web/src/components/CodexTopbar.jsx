import { Link, useLocation, useNavigate } from "react-router-dom";
import { Globe2, Layers3, LogIn, LogOut, Menu, UserRound } from "lucide-react";
import { getWorlds, worldSlug } from "../utils/worldContext.js";
import {
  buildAppPath,
  campaignHomePath,
  replaceCampaignIdInPath,
  routeTitleFromPath
} from "../routing/appRoutes.js";

function activeRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function roleLabel(role, signedIn) {
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return signedIn ? "Без кампании" : "Гость";
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
  sidebarAvailable = false,
  sidebarOpen,
  setSidebarOpen,
  sidebarToggleRef,
  activeWorld,
  scope,
  onLogout
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasMembership = Boolean(session?.activeMembership?.id);
  const signedIn = Boolean(session?.user);
  const campaignNavAvailable = scope === "campaign" && signedIn && hasMembership;
  const sourcePages = campaignNavAvailable ? allPages || pages : [];
  const worlds = getWorlds(sourcePages);
  const role = activeRole(session);
  const campaignName = session?.activeCampaign?.name || "Party Codex";
  const campaignId = session?.activeCampaign?.id || "";
  const accountLabel = session?.user?.name || session?.user?.displayName || session?.user?.email || "Гость";
  const selectedWorld = activeWorld ? worldSlug(activeWorld) : new URLSearchParams(location.search).get("world") || "";
  const campaignOptions = campaigns.filter((item) => item?.campaign?.id);
  const currentCampaignListed = campaignOptions.some((item) => item.campaign.id === campaignId);
  const hasAlternativeCampaign = campaignOptions.some((item) => item.campaign.id !== campaignId);
  const brandTarget = signedIn ? campaignHomePath(campaignId) : buildAppPath("login");
  const currentTitle = routeTitleFromPath(location.pathname);

  function changeCampaign(event) {
    const nextCampaignId = event.target.value;
    if (!nextCampaignId || nextCampaignId === campaignId || campaignSwitching) return;
    const nextPathname = replaceCampaignIdInPath(location.pathname, nextCampaignId);
    const targetPath = `${nextPathname}${location.search || ""}`;
    Promise.resolve(onCampaignChange?.(nextCampaignId, { targetPath })).catch(() => {});
  }

  function changeWorld(event) {
    const nextSlug = event.target.value;
    const params = new URLSearchParams(location.search);
    if (nextSlug) params.set("world", nextSlug);
    else params.delete("world");
    const query = params.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ""}`);
  }

  return (
    <header className="topbar topbar-shell topbar-clean">
      {sidebarAvailable ? (
        <button ref={sidebarToggleRef} type="button" className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Открыть навигацию" aria-expanded={sidebarOpen} aria-controls="campaign-sidebar">
          <Menu size={20} aria-hidden="true" />
        </button>
      ) : null}

      <Link to={brandTarget} className="topbar-brand-compact" title={campaignName}>
        <span>Party Codex</span>
        <strong>{scope === "campaign" ? campaignName : currentTitle}</strong>
      </Link>

      {signedIn ? (
        <div className="topbar-clean-controls">
          <label className="topbar-native-select topbar-native-select--campaign" title={campaignSwitching ? "Переключение кампании…" : "Активная кампания"}>
            <Layers3 size={16} aria-hidden="true" />
            <select aria-label="Активная кампания" aria-busy={campaignSwitching} value={campaignId} onChange={changeCampaign} disabled={campaignSwitching || !hasAlternativeCampaign}>
              {!campaignId && campaignOptions.length === 0 ? <option value="">Нет доступных кампаний</option> : null}
              {campaignId && !currentCampaignListed ? <option value={campaignId}>{campaignName} · {roleLabel(role, true)}</option> : null}
              {campaignOptions.map((item) => {
                const itemId = item.campaign.id;
                const itemRole = roleLabel(item.role || item.membership?.role, true);
                return <option key={itemId} value={itemId}>{item.campaign?.name || "Кампания без названия"} · {itemRole}</option>;
              })}
            </select>
          </label>

          {campaignNavAvailable && worlds.length ? (
            <label className="topbar-native-select topbar-native-select--world">
              <Globe2 size={16} aria-hidden="true" />
              <select aria-label="Контекст мира" value={selectedWorld} onChange={changeWorld}>
                <option value="">Вся кампания</option>
                {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
              </select>
            </label>
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
          {session?.user ? <Link to={buildAppPath("accountProfile")} onClick={closeAccountMenu}>Профиль</Link> : null}
          {hasMembership && (role === "owner" || role === "gm") ? <Link to={buildAppPath("manageSettings", { campaignId })} onClick={closeAccountMenu}>Настройки кампании</Link> : null}
          {session?.user ? <Link to={buildAppPath("campaignSelect")} onClick={closeAccountMenu}>Кампании</Link> : null}
          {session?.user ? (
            <button type="button" onClick={(event) => { closeAccountMenu(event); onLogout?.(); }}><LogOut size={14} aria-hidden="true" /> Выйти</button>
          ) : (
            <Link to={buildAppPath("login")} onClick={closeAccountMenu}><LogIn size={14} aria-hidden="true" /> Войти</Link>
          )}
        </div>
      </details>
    </header>
  );
}
