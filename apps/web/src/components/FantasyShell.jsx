import CodexSidebar from "./CodexSidebar.jsx";
import CodexTopbar from "./CodexTopbar.jsx";

export default function FantasyShell({ children, ...props }) {
  return (
    <div className="app-shell">
      <div className="ambient" />
      <CodexSidebar categories={props.categories} />
      <main className="main-stage">
        <CodexTopbar {...props} />
        <section className="content-stage">{children}</section>
      </main>
    </div>
  );
}
