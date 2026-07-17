import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import CodexSidebar from "./CodexSidebar.jsx";
import CodexTopbar from "./CodexTopbar.jsx";
import PageBackButton from "./PageBackButton.jsx";
import RouteBreadcrumbs from "./RouteBreadcrumbs.jsx";
import StatusMessage from "./ui/StatusMessage.jsx";
import CinematicWorldBackground from "./world/CinematicWorldBackground.jsx";
import { getThemeStyle, getWorldTheme } from "../theme/worldThemes.js";
import { routeScopeFromPath } from "../routing/appRoutes.js";

function activeMembershipRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function hasCampaignMembership(session) {
  return Boolean(session?.activeMembership?.id);
}

export default function ApplicationShell({ children, ...props }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const shellClassName = [
    "app-shell",
    `app-shell--${scope}`,
    showSidebar ? (sidebarOpen ? "sidebar-open" : "sidebar-closed") : "sidebar-unavailable",
    campaignChrome ? `world-theme-${worldTheme.key}` : "world-theme-neutral"
  ].join(" ");

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!sidebarOpen || !showSidebar) return undefined;
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
      const focusable = [...(sidebarRef.current?.querySelectorAll('a[href], button:not([disabled]), select, input, textarea, [tabindex]:not([tabindex="-1"])') || [])];
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
  }, [sidebarOpen, showSidebar]);

  return (
    <div className={shellClassName} data-shell-scope={scope} data-world-theme={campaignChrome ? worldTheme.key : "neutral"} style={campaignChrome ? getThemeStyle(worldTheme) : undefined}>
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>
      {campaignChrome ? <CinematicWorldBackground theme={worldTheme} /> : null}
      {showSidebar && sidebarOpen ? (
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
          isOpen={sidebarOpen}
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
          <StatusMessage tone={props.campaignNotice?.tone || "info"} role={props.campaignNotice?.tone === "danger" ? "alert" : "status"}>
            {props.campaignNotice?.message || ""}
          </StatusMessage>
          <RouteBreadcrumbs session={props.session} activeWorld={props.activeWorld} />
          <PageBackButton />
          {children}
        </section>
      </main>
    </div>
  );
}
