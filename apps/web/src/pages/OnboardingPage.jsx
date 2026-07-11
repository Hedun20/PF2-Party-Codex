import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Layers3, MailCheck, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import PageHero from "../components/ui/PageHero.jsx";
import PageShell from "../components/ui/PageShell.jsx";
import StatusMessage from "../components/ui/StatusMessage.jsx";

function roleLabel(role = "player") {
  if (role === "owner") return "Owner";
  if (role === "gm") return "GM";
  return "Player";
}

export default function OnboardingPage({
  session,
  campaigns = [],
  onCreated,
  onCampaignChange,
  campaignSwitching = false
}) {
  const [form, setForm] = useState({
    workspaceId: "new",
    workspaceName: "",
    campaignName: "",
    gameSystem: "system-agnostic"
  });
  const [state, setState] = useState({ loading: false, error: "", success: "" });
  const emailVerified = Boolean(session?.user?.emailVerified);
  const activeCampaignId = session?.activeCampaign?.id || "";
  const hasCampaign = Boolean(session?.activeMembership?.id);
  const ownedWorkspaces = useMemo(() => {
    const byId = new Map();
    for (const item of campaigns) {
      if (item?.role !== "owner" || !item.workspace?.id) continue;
      byId.set(item.workspace.id, item.workspace);
    }
    return [...byId.values()];
  }, [campaigns]);

  async function submit(event) {
    event.preventDefault();
    setState({ loading: true, error: "", success: "" });
    try {
      const payload = {
        campaignName: form.campaignName,
        gameSystem: form.gameSystem,
        workspaceId: form.workspaceId === "new" ? "" : form.workspaceId,
        workspaceName: form.workspaceId === "new" ? form.workspaceName : ""
      };
      const data = await api.createCampaign(payload);
      setState({ loading: false, error: "", success: `Campaign “${data.campaign?.name || form.campaignName}” created.` });
      setForm((draft) => ({ ...draft, campaignName: "" }));
      if (onCreated) await onCreated(data);
    } catch (error) {
      setState({ loading: false, error: error.message || "Campaign creation failed.", success: "" });
    }
  }

  async function switchCampaign(campaignId) {
    setState({ loading: false, error: "", success: "" });
    try {
      await onCampaignChange?.(campaignId);
    } catch (error) {
      setState({ loading: false, error: error.message || "Campaign switch failed.", success: "" });
    }
  }

  return (
    <PageShell className="campaign-manager-page">
      <PageHero
        kicker={hasCampaign ? "Campaign context" : "Campaign onboarding"}
        title={hasCampaign ? "Your campaigns" : "Start or join a campaign"}
        description={hasCampaign
          ? "Switch between campaigns without mixing roles, players, notes, characters, or archive data."
          : "Create a campaign workspace or accept an invitation from another GM."}
      >
        <div className="workspace-identity-strip">
          <span>{session?.user?.email || "Signed-in account"}</span>
          <span>{emailVerified ? "Email verified" : "Email verification required"}</span>
          <span>{hasCampaign ? `${roleLabel(session?.activeMembership?.role)} · ${session?.activeCampaign?.name}` : "Campaign role: none"}</span>
        </div>
      </PageHero>

      {!emailVerified ? (
        <section className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Verify email first</span>
          <p>Campaign creation is locked until the account email is confirmed. Invitations can only be accepted by the invited address.</p>
        </section>
      ) : null}

      <section className="campaign-context-section" aria-label="Available campaigns">
        <div className="campaign-context-heading">
          <div>
            <span className="kicker">Available campaigns</span>
            <h2>{campaigns.length} connected</h2>
          </div>
          {activeCampaignId ? <span className="campaign-active-summary"><CheckCircle2 size={15} /> Active context protected</span> : null}
        </div>

        {campaigns.length ? (
          <div className="campaign-context-grid">
            {campaigns.map((item) => {
              const active = item.campaign?.id === activeCampaignId;
              return (
                <article key={item.campaign?.id || item.id} className={`codex-card campaign-context-card ${active ? "is-active" : ""}`}>
                  <div className="campaign-context-card__icon"><Layers3 size={22} /></div>
                  <div className="campaign-context-card__body">
                    <span className="kicker">{item.workspace?.name || "Campaign workspace"}</span>
                    <h3>{item.campaign?.name || "Untitled campaign"}</h3>
                    <p>{roleLabel(item.membership?.role || item.role)} · {item.campaign?.settings?.gameSystem || "System agnostic"}</p>
                  </div>
                  <CodexButton
                    type="button"
                    size="sm"
                    variant={active ? "secondary" : "primary"}
                    disabled={active || campaignSwitching}
                    onClick={() => switchCampaign(item.campaign.id)}
                  >
                    {active ? "Active" : campaignSwitching ? "Switching..." : "Open"}
                  </CodexButton>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Layers3}
            kicker="No campaign yet"
            title="Create or join your first campaign"
            description="A campaign only appears here after explicit creation or invitation acceptance."
          />
        )}
      </section>

      <section className="campaign-create-layout">
        <article className="codex-card campaign-create-card">
          <div className="campaign-context-heading">
            <div>
              <span className="kicker">GM path</span>
              <h2>Create campaign</h2>
              <p>Create a new workspace or add another campaign to a workspace you own.</p>
            </div>
            <Sparkles size={24} />
          </div>

          <form className="campaign-create-form" onSubmit={submit}>
            {ownedWorkspaces.length ? (
              <label>Workspace
                <select value={form.workspaceId} onChange={(event) => setForm((draft) => ({ ...draft, workspaceId: event.target.value }))}>
                  <option value="new">Create a new workspace</option>
                  {ownedWorkspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </label>
            ) : null}
            {form.workspaceId === "new" ? (
              <label>Workspace name
                <input required value={form.workspaceName} onChange={(event) => setForm((draft) => ({ ...draft, workspaceName: event.target.value }))} placeholder="My Campaign Workspace" />
              </label>
            ) : null}
            <label>Campaign name
              <input required value={form.campaignName} onChange={(event) => setForm((draft) => ({ ...draft, campaignName: event.target.value }))} placeholder="The Shattered Crown" />
            </label>
            <label>Game system
              <select value={form.gameSystem} onChange={(event) => setForm((draft) => ({ ...draft, gameSystem: event.target.value }))}>
                <option value="system-agnostic">System agnostic</option>
                <option value="pf2e">Pathfinder 2e adapter</option>
                <option value="dnd5e" disabled>D&amp;D 5e adapter later</option>
                <option value="starfinder" disabled>Starfinder adapter later</option>
              </select>
            </label>
            <CodexButton type="submit" disabled={state.loading || !emailVerified}>
              <Plus size={16} /> {state.loading ? "Creating..." : "Create campaign"}
            </CodexButton>
          </form>
          <StatusMessage tone="danger">{state.error}</StatusMessage>
          <StatusMessage tone="success">{state.success}</StatusMessage>
        </article>

        <article className="codex-card campaign-create-card campaign-join-card">
          <MailCheck size={24} />
          <span className="kicker">Player path</span>
          <h2>Join by invitation</h2>
          <p>Open the invitation link after login. The invitation email must match this account, and accepting it automatically selects the new campaign.</p>
          <div className="campaign-security-note"><ShieldCheck size={17} /> Roles are resolved independently for every campaign.</div>
          <CodexButton as={Link} to="/profile" variant="secondary">Review profile</CodexButton>
        </article>
      </section>
    </PageShell>
  );
}
