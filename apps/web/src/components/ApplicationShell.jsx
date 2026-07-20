import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import CodexSidebar from "./CodexSidebar.jsx";
import CodexTopbar from "./CodexTopbar.jsx";
import PageBackButton from "./PageBackButton.jsx";
import RouteBreadcrumbs from "./RouteBreadcrumbs.jsx";
import { Notice } from "./ui/Silverleaf.jsx";
import CinematicWorldBackground from "./world/CinematicWorldBackground.jsx";
import { getThemeStyle, getWorldTheme } from "../theme/worldThemes.js";
import { routeScopeFromPath } from "../routing/appRoutes.js";

const DESKTOP_SIDEBAR_QUERY = "(min-width: 1280px)";

function activeMembershipRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function hasCampaignMembership(session) {
  return Boolean(session?.activeMembership?.id);
}

function desktopSidebarMatches() {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches;
}

export default function ApplicationShell({ children, ...props }) {
  const [desktopSidebar, setDesktopSidebar] = useState(desktopSidebarMatches);
  const [sidebarOpen, setSidebarOpen] = useState(desktopSidebarMatches);
  const sidebarRef = useRef(null);
  const sidebarToggleRef = useRef(null);
  const location = useLocation();
  const scope = routeScopeFromPath(location.pathname);
  const worldTheme = getWorldTheme(props.activeWorld);
  const signedIn = Boolean(props.session?.user);
  const hasMembership = hasCampaignMembership(props.session);
  const role = activeMembershipRole(props.session);
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const campaignChrome = scope === "campaign" && signedIn && hasMembership;
  const accountChrome = scope === "account" && signedIn;
  const showSidebar = campaignChrome || accountChrome;
  const sidebarVisible = showSidebar && (desktopSidebar || sidebarOpen);
  const shellClassName = [
    "app-shell",
    `app-shell--${scope}`,
    desktopSidebar ? "app-shell--sidebar-persistent" : "app-shell--sidebar-overlay",
    sidebarVisible ? "sidebar-open" : "sidebar-closed",
    showSidebar ? "sidebar-available" : "sidebar-unavailable",
    campaignChrome ? `world-theme-${worldTheme.key}` : "world-theme-neutral"
  ].join(" ");

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_SIDEBAR_QUERY);
    const sync = (event) => {
      const matches = "matches" in event ? event.matches : media.matches;
      setDesktopSidebar(matches);
      setSidebarOpen(matches);
    };
    sync(media);
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (!desktopSidebar) setSidebarOpen(false);
  }, [location.pathname, location.search, desktopSidebar]);

  useEffect(() => {
    if (!sidebarOpen || !showSidebar || desktopSidebar) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => sidebarRef.current?.querySelector(".sidebar-close")?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        window.requestAnimationFrame(() => sidebarToggleRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(sidebarRef.current?.querySelectorAll('a[href], button:not([disabled]), [role="combobox"], input, textarea, [tabindex]:not([tabindex="-1"])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen, showSidebar, desktopSidebar]);

  return (
    <div className={shellClassName} data-shell-scope={scope} data-world-theme={campaignChrome ? worldTheme.key : "neutral"} style={campaignChrome ? getThemeStyle(worldTheme) : undefined}>
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      {campaignChrome ? <CinematicWorldBackground theme={worldTheme} /> : null}
      {showSidebar && sidebarOpen && !desktopSidebar ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Закрыть навигацию"
          onClick={() => {
            setSidebarOpen(false);
            window.requestAnimationFrame(() => sidebarToggleRef.current?.focus());
          }}
        />
      ) : null}
      {showSidebar ? (
        <CodexSidebar
          sidebarRef={sidebarRef}
          isOpen={sidebarVisible}
          persistent={desktopSidebar}
          session={props.session}
          activeWorld={props.activeWorld}
          onClose={() => setSidebarOpen(false)}
        />
      ) : null}
      <main className="main-stage" id="main-content" tabIndex="-1">
        <CodexTopbar
          {...props}
          scope={scope}
          canManage={canManage}
          worldTheme={worldTheme}
          sidebarAvailable={showSidebar}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sidebarToggleRef={sidebarToggleRef}
        />
        <section className="content-stage">
          <Notice tone={props.campaignNotice?.tone || "info"}>{props.campaignNotice?.message || ""}</Notice>
          <RouteBreadcrumbs session={props.session} activeWorld={props.activeWorld} />
          <PageBackButton />
          {children}
        </section>
      </main>
    </div>
  );
}
