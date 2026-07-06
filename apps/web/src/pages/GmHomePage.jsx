import { Link } from "react-router-dom";

export default function GmHomePage({ session }) {
  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">GM Portal</span>
        <h1>GM Home</h1>
        <p>Full campaign management begins with the archive and links into the existing GM tools.</p>
        <div className="workspace-identity-strip">
          <span>{session?.user?.name || session?.user?.email || "GM"}</span>
          {session?.activeCampaign?.name ? <span>Campaign: {session.activeCampaign.name}</span> : null}
        </div>
      </section>
      <section className="workspace-grid">
        <Link to="/archive" className="codex-card workspace-card primary-workspace-card"><strong>Campaign Archive</strong><span>Archive summary and section overview.</span></Link>
        <Link to="/gm-tools" className="codex-card workspace-card"><strong>GM Tools</strong><span>Existing preparation and vault utilities.</span></Link>
        <Link to="/maps" className="codex-card workspace-card"><strong>Maps</strong><span>Existing map workspace.</span></Link>
        <Link to="/timeline" className="codex-card workspace-card"><strong>Timeline</strong><span>Existing campaign chronology.</span></Link>
      </section>
    </div>
  );
}