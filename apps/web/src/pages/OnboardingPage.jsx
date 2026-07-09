import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, MailCheck, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

export default function OnboardingPage({ session, onCreated }) {
  const [form, setForm] = useState({
    workspaceName: "",
    campaignName: "",
    gameSystem: "pf2e"
  });
  const [state, setState] = useState({ loading: false, error: "", success: "" });
  const emailVerified = Boolean(session?.user?.emailVerified);

  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: "", success: "" });
    try {
      await api.createWorkspaceOnboarding(form);
      setState({ loading: false, error: "", success: "Campaign workspace created." });
      if (onCreated) await onCreated();
    } catch (error) {
      setState({ loading: false, error: error.message || "Workspace onboarding failed.", success: "" });
    }
  }

  return (
    <div className="page-stack onboarding-page">
      <section className="hero-panel">
        <span className="kicker">Campaign onboarding</span>
        <h1>Start or join a campaign</h1>
        <p>Your account is registered, but it is not connected to a campaign yet. Create a GM workspace or accept an invitation from another GM.</p>
        <div className="workspace-identity-strip">
          <span>{session?.user?.email || "Signed-in account"}</span>
          <span>{emailVerified ? "Email verified" : "Email verification required"}</span>
          <span>Campaign role: none</span>
        </div>
      </section>

      {!emailVerified ? (
        <section className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Verify email first</span>
          <p>Campaign workspace creation is locked until the account email is confirmed. Check the local outbox or your configured email provider for the verification link.</p>
        </section>
      ) : null}

      <section className="archive-recent-grid" aria-label="Onboarding paths">
        <article className="codex-card workspace-status-card">
          <Sparkles size={22} />
          <span className="kicker">GM path</span>
          <h2>Create campaign workspace</h2>
          <p>This creates a workspace, a campaign, and an owner membership for your account. Players are added later through invitations only.</p>
          <form className="character-import-grid" onSubmit={submit}>
            <label>Workspace name
              <input value={form.workspaceName} onChange={(event) => setForm((draft) => ({ ...draft, workspaceName: event.target.value }))} placeholder="My Campaign Workspace" />
            </label>
            <label>Campaign name
              <input value={form.campaignName} onChange={(event) => setForm((draft) => ({ ...draft, campaignName: event.target.value }))} placeholder="Age of Ashes" />
            </label>
            <label>Game system
              <select value={form.gameSystem} onChange={(event) => setForm((draft) => ({ ...draft, gameSystem: event.target.value }))}>
                <option value="pf2e">Pathfinder 2e</option>
                <option value="dnd5e" disabled>DnD 5e later</option>
                <option value="starfinder" disabled>Starfinder later</option>
              </select>
            </label>
            <button type="submit" className="notes-icon-action" disabled={state.loading || !emailVerified}>{state.loading ? "Creating..." : "Create workspace"}</button>
          </form>
          {state.error ? <div className="status-message danger-message"><AlertTriangle size={16} /> {state.error}</div> : null}
          {state.success ? <div className="status-message success-message"><CheckCircle2 size={16} /> {state.success}</div> : null}
        </article>

        <article className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Player path</span>
          <h2>Join by invitation</h2>
          <p>Players do not auto-join a default campaign. Open the invite link from your GM after login or registration. The invitation email must match this account email.</p>
          <CodexButton as={Link} to="/profile">Review profile</CodexButton>
        </article>
      </section>
    </div>
  );
}
