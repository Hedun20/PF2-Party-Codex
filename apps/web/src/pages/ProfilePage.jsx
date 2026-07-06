import OnboardingPage from "./OnboardingPage.jsx";

export default function ProfilePage({ session, onOnboardingCreated }) {
  const user = session?.user || {};
  const membership = session?.activeMembership || {};
  const campaign = session?.activeCampaign || {};
  const hasCampaign = Boolean(membership?.id);

  if (user?.id && !hasCampaign) {
    return <OnboardingPage session={session} onCreated={onOnboardingCreated} />;
  }

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
          <span>Role: {membership.role || "user"}</span>
        </div>
      </section>
    </div>
  );
}
