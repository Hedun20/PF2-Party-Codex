import { Link } from "react-router-dom";

function role(session) {
  return session?.activeMembership?.role || session?.membership?.role || session?.role || "player";
}

const playerCards = [
  ["Known Lore", "/archive", "Player-safe campaign archive and revealed knowledge."],
  ["Handouts", "/handouts", "Shared campaign materials returned by the backend."],
  ["Maps", "/maps", "Player-visible maps and map objects."],
  ["Timeline", "/timeline", "Known campaign events and public history."],
  ["My Character", "/characters", "Your campaign character workspace."],
  ["My Notes", "/notes", "Your campaign notes from the notes API."],
  ["Profile", "/profile", "Your session, campaign, and membership details."]
];

export default function PlayerHomePage({ session }) {
  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">Player Portal</span>
        <h1>Player Home</h1>
        <p>Player-safe access to the campaign archive, handouts, maps, timeline, character, and notes.</p>
        <div className="workspace-identity-strip">
          <span>{session?.user?.name || session?.user?.displayName || session?.user?.email || "Player"}</span>
          {session?.activeCampaign?.name ? <span>Campaign: {session.activeCampaign.name}</span> : null}
          <span>Role: {role(session)}</span>
        </div>
      </section>
      <section className="workspace-grid">
        {playerCards.map(([title, to, description], index) => (
          <Link key={to} to={to} className={`codex-card workspace-card${index === 0 ? " primary-workspace-card" : ""}`}>
            <strong>{title}</strong>
            <span>{description}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}