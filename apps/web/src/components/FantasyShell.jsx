import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import CodexSidebar from "./CodexSidebar.jsx";
import CodexTopbar from "./CodexTopbar.jsx";
import PageBackButton from "./PageBackButton.jsx";
import MagicSelectLayer from "./ui/MagicSelectLayer.jsx";
import CinematicWorldBackground from "./world/CinematicWorldBackground.jsx";
import { getThemeStyle, getWorldTheme } from "../theme/worldThemes.js";

function activeMembershipRole(session) {
  return String(session?.activeMembership?.role || "").toLowerCase();
}

function hasCampaignMembership(session) {
  return Boolean(session?.activeMembership?.id);
}

export default function FantasyShell({ children, ...props }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  const sidebarToggleRef = useRef(null);
  const location = useLocation();
  const worldTheme = getWorldTheme(props.activeWorld);
  const signedIn = Boolean(props.session?.user);
  const hasMembership = hasCampaignMembership(props.session);
  const role = activeMembershipRole(props.session);
  const canManage = hasMembership && (role === "owner" || role === "gm");
  const shellClassName = [
    "app-shell",
    sidebarOpen ? "sidebar-open" : "sidebar-closed",
    `world-theme-${worldTheme.key}`
  ].join(" ");

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
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
  }, [sidebarOpen]);

  return (
    <div className={shellClassName} data-world-theme={worldTheme.key} style={getThemeStyle(worldTheme)}>
      <a className="skip-link" href="#main-content">Skip to campaign content</a>
      <CinematicWorldBackground theme={worldTheme} />
      <MagicSelectLayer />
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Закрыть навигацию"
          onClick={() => {
            setSidebarOpen(false);
            window.requestAnimationFrame(() => sidebarToggleRef.current?.focus());
          }}
        />
      )}
      <CodexSidebar
        sidebarRef={sidebarRef}
        isOpen={sidebarOpen}
        categories={props.categories}
        canEdit={props.mode === "gm" && canManage}
        signedIn={signedIn}
        hasCampaignMembership={hasMembership}
        activeWorld={props.activeWorld}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-stage" id="main-content" tabIndex="-1">
        <CodexTopbar {...props} worldTheme={worldTheme} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} sidebarToggleRef={sidebarToggleRef} />
        <section className="content-stage">
          <PageBackButton />
          {children}
        </section>
      </main>
    </div>
  );
}
