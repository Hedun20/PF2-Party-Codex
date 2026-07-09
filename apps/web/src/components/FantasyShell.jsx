import { useState } from "react";
import CodexSidebar from "./CodexSidebar.jsx";
import CodexTopbar from "./CodexTopbar.jsx";
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

  return (
    <div className={shellClassName} data-world-theme={worldTheme.key} style={getThemeStyle(worldTheme)}>
      <CinematicWorldBackground theme={worldTheme} />
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Закрыть навигацию"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <CodexSidebar
        categories={props.categories}
        canEdit={props.mode === "gm" && canManage}
        signedIn={signedIn}
        hasCampaignMembership={hasMembership}
        activeWorld={props.activeWorld}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-stage">
        <CodexTopbar {...props} worldTheme={worldTheme} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <section className="content-stage">{children}</section>
      </main>
    </div>
  );
}
