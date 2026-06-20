import { useState } from "react";
import CodexSidebar from "./CodexSidebar.jsx";
import CodexTopbar from "./CodexTopbar.jsx";

export default function FantasyShell({ children, ...props }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={sidebarOpen ? "app-shell sidebar-open" : "app-shell sidebar-closed"}>
      <div className="ambient" />
      <CodexSidebar categories={props.categories} canEdit={Boolean(props.session?.canEdit)} onClose={() => setSidebarOpen(false)} />
      <main className="main-stage">
        <CodexTopbar {...props} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <section className="content-stage">{children}</section>
      </main>
    </div>
  );
}
