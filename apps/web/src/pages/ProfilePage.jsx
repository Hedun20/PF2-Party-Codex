export default function ProfilePage({ session }) {
  const user = session?.user || {};
  const membership = session?.activeMembership || session?.membership || {};
  const campaign = session?.activeCampaign || {};

  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">Player Portal</span>
        <h1>Profile</h1>
        <p>Safe account and campaign identity details from the current session.</p>
        <div className="workspace-identity-strip">
          <span>{user.displayName || user.name || "Player"}</span>
          {user.email ? <span>{user.email}</span> : null}
          {campaign.name ? <span>Campaign: {campaign.name}</span> : null}
          <span>Role: {membership.role || session?.role || "player"}</span>
        </div>
      </section>
    </div>
  );
}