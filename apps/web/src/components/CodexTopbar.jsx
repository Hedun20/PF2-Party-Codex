import { Link, useLocation, useNavigate } from "react-router-dom";
import { Globe2, Layers3, LogIn, LogOut, Menu, Settings, UserRound } from "lucide-react";
import { SelectInput } from "./ui/Silverleaf.jsx";
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
  canManage = false,
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
          <Menu size={20} strokeWidth={1.45} aria-hidden="true" />
        </button>
      ) : null}

      <Link to={brandTarget} className="topbar-brand-compact" title={campaignName}>
        <span>Royal Archive</span>
        <strong>{scope === "campaign" ? campaignName : currentTitle}</strong>
      </Link>

      {signedIn ? (
        <div className="topbar-clean-controls">
          <SelectInput
            className="topbar-select topbar-select--campaign"
            aria-label="Активная кампания"
            aria-busy={campaignSwitching}
            value={campaignId}
            onChange={changeCampaign}
            disabled={campaignSwitching || !hasAlternativeCampaign}
          >
            {!campaignId && campaignOptions.length === 0 ? <option value="">Нет доступных кампаний</option> : null}
            {campaignId && !currentCampaignListed ? <option value={campaignId}>{campaignName} · {roleLabel(role, true)}</option> : null}
            {campaignOptions.map((item) => <option key={item.campaign.id} value={item.campaign.id}>{item.campaign?.name || "Кампания без названия"} · {roleLabel(item.role || item.membership?.role, true)}</option>)}
          </SelectInput>

          {campaignNavAvailable && worlds.length ? (
            <SelectInput className="topbar-select topbar-select--world" aria-label="Контекст мира" value={selectedWorld} onChange={changeWorld}>
              <option value="">Вся кампания</option>
              {worlds.map((world) => <option key={world.path} value={worldSlug(world)}>{world.title}</option>)}
            </SelectInput>
          ) : <span />}
        </div>
      ) : <span />}

      <div className="topbar-tools">
        {canManage && campaignId ? <Link className="topbar-settings-link" to={buildAppPath("manageSettings", { campaignId })} aria-label="Настройки кампании" title="Настройки кампании"><Settings size={18} strokeWidth={1.45} aria-hidden="true" /></Link> : null}
        <details className="topbar-account-details">
          <summary className="topbar-account-summary" title={accountLabel} aria-label={`Аккаунт: ${accountLabel}`}>
            <UserRound size={17} strokeWidth={1.45} aria-hidden="true" />
            <span>{accountLabel}</span>
          </summary>
          <div className="topbar-account-popover">
            <span className="topbar-account-meta">{accountLabel} · {roleLabel(role, signedIn)}</span>
            {session?.user ? <Link to={buildAppPath("accountProfile")} onClick={closeAccountMenu}>Профиль</Link> : null}
            {canManage && campaignId ? <Link to={buildAppPath("manageSettings", { campaignId })} onClick={closeAccountMenu}>Настройки кампании</Link> : null}
            {session?.user ? <Link to={buildAppPath("campaignSelect")} onClick={closeAccountMenu}>Кампании</Link> : null}
            {session?.user ? <button type="button" onClick={(event) => { closeAccountMenu(event); onLogout?.(); }}><LogOut size={14} aria-hidden="true" /> Выйти</button> : <Link to={buildAppPath("login")} onClick={closeAccountMenu}><LogIn size={14} aria-hidden="true" /> Войти</Link>}
          </div>
        </details>
      </div>
    </header>
  );
}
