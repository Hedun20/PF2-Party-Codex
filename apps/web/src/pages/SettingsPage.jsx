import { Database, Mail, Settings, ShieldCheck, UsersRound } from "lucide-react";

export default function SettingsPage({ session }) {
  return (
    <div className="page-stack settings-page">
      <section className="hero-panel">
        <span className="kicker">Settings</span>
        <h1>Workspace settings shell</h1>
        <p>This is the stable place for campaign, account, email, billing and SaaS settings as the platform moves toward production.</p>
      </section>

      <section className="workspace-grid settings-grid">
        <article className="codex-card workspace-card">
          <Settings size={22} />
          <div>
            <strong>Campaign</strong>
            <span>{session?.activeCampaign?.name || "Default campaign"}</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <UsersRound size={22} />
          <div>
            <strong>Membership</strong>
            <span>{session?.membership?.role || session?.role || "guest"}</span>
          </div>
        </article>
        <article className="codex-card workspace-card" id="mongo">
          <Database size={22} />
          <div>
            <strong>MongoDB</strong>
            <span>Source of truth for platform data.</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <Mail size={22} />
          <div>
            <strong>Email</strong>
            <span>Outbox now, SMTP later for production invites.</span>
          </div>
        </article>
      </section>

      <section className="codex-card workspace-status-card">
        <ShieldCheck size={20} />
        <p>Production billing, plans, subdomains and admin controls will attach here during the SaaS shell stage.</p>
      </section>
    </div>
  );
}
