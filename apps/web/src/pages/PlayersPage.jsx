import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, MailPlus, ShieldCheck, UsersRound } from "lucide-react";
import { api } from "../api/client.js";

function formatDate(value = "") {
  if (!value) return "Not available";
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function entityId(entity) {
  return entity?.id || entity?._id || "";
}

function activeCampaignId(session) {
  return entityId(session?.activeCampaign) || session?.activeMembership?.campaignId || "";
}

function roleFromSession(session) {
  return String(session?.activeMembership?.role || "player").toLowerCase();
}

function canManagePlayers(session) {
  return ["owner", "gm"].includes(roleFromSession(session));
}

function emailLooksValid(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function StatusCard({ icon: Icon = AlertTriangle, kicker, children }) {
  return (
    <section className="codex-card workspace-status-card">
      <Icon size={22} />
      <span className="kicker">{kicker}</span>
      <p>{children}</p>
    </section>
  );
}

export default function PlayersPage({ session }) {
  const campaignId = useMemo(() => activeCampaignId(session), [session]);
  const canManage = canManagePlayers(session);
  const [membersState, setMembersState] = useState({ loading: false, error: "", memberships: [] });
  const [invitesState, setInvitesState] = useState({ loading: false, error: "", invitations: [] });
  const [inviteDraft, setInviteDraft] = useState({ email: "", role: "player" });
  const [inviteSubmit, setInviteSubmit] = useState({ loading: false, error: "", success: "", inviteUrl: "" });

  async function loadPlayers() {
    if (!campaignId || !canManage) return;
    setMembersState((state) => ({ ...state, loading: true, error: "" }));
    setInvitesState((state) => ({ ...state, loading: true, error: "" }));
    try {
      const data = await api.campaignMemberships(campaignId);
      setMembersState({ loading: false, error: "", memberships: Array.isArray(data.memberships) ? data.memberships : [] });
    } catch (error) {
      setMembersState({ loading: false, error: error.message || "Memberships API failed.", memberships: [] });
    }
    try {
      const data = await api.campaignInvitations(campaignId);
      setInvitesState({ loading: false, error: "", invitations: Array.isArray(data.invitations) ? data.invitations : [] });
    } catch (error) {
      setInvitesState({ loading: false, error: error.message || "Invitations API failed.", invitations: [] });
    }
  }

  useEffect(() => {
    loadPlayers();
  }, [campaignId, canManage]);

  async function submitInvite(event) {
    event.preventDefault();
    setInviteSubmit({ loading: false, error: "", success: "", inviteUrl: "" });
    if (!emailLooksValid(inviteDraft.email)) {
      setInviteSubmit({ loading: false, error: "Enter a valid email address.", success: "", inviteUrl: "" });
      return;
    }
    setInviteSubmit({ loading: true, error: "", success: "", inviteUrl: "" });
    try {
      const data = await api.createCampaignInvitation(campaignId, inviteDraft);
      setInviteSubmit({ loading: false, error: "", success: data.emailDelivery === "local-outbox" ? "Invitation queued in local outbox." : "Invitation created.", inviteUrl: data.invitation?.inviteUrl || "" });
      setInviteDraft({ email: "", role: "player" });
      await loadPlayers();
    } catch (error) {
      setInviteSubmit({ loading: false, error: error.message || "Invitation failed.", success: "", inviteUrl: "" });
    }
  }

  async function copyInviteUrl() {
    if (!inviteSubmit.inviteUrl || !navigator.clipboard) return;
    await navigator.clipboard.writeText(inviteSubmit.inviteUrl);
  }

  return (
    <div className="page-stack players-page">
      <section className="hero-panel">
        <span className="kicker">GM Portal</span>
        <h1>Players</h1>
        <p>Campaign members and pending invitations for the active workspace campaign.</p>
        <div className="workspace-identity-strip">
          <span>{session?.activeWorkspace?.name || "Workspace"}</span>
          <span>{session?.activeCampaign?.name || "Active campaign"}</span>
          <span>Role: {roleFromSession(session)}</span>
        </div>
      </section>

      {!campaignId ? <StatusCard kicker="No active campaign">Join or create a campaign before managing players.</StatusCard> : null}
      {!canManage ? <StatusCard icon={ShieldCheck} kicker="Restricted">GM or owner access is required. Backend permissions remain the source of truth.</StatusCard> : null}

      {canManage && campaignId ? (
        <>
          {membersState.loading ? <StatusCard icon={UsersRound} kicker="Loading members">Fetching campaign memberships.</StatusCard> : null}
          {membersState.error ? <StatusCard kicker="Members unavailable">{membersState.error}</StatusCard> : null}
          {invitesState.error ? <StatusCard kicker="Invitations unavailable">{invitesState.error}</StatusCard> : null}

          <section className="archive-recent-grid" aria-label="Campaign members and invitations">
            <article className="codex-card archive-recent-card">
              <span className="kicker">Campaign members</span>
              {membersState.memberships.length ? (
                <ul>
                  {membersState.memberships.map((member) => (
                    <li key={member.id || `${member.userId}-${member.role}`}>
                      <strong>{member.displayName || member.email || "Campaign member"}</strong>
                      {member.email ? <span> · {member.email}</span> : null}
                      <span> · {member.role || "player"}</span>
                      <span> · {member.status || "active"}</span>
                      <small> · Joined: {formatDate(member.joinedAt || member.createdAt)}</small>
                    </li>
                  ))}
                </ul>
              ) : !membersState.loading && !membersState.error ? (
                <p>No campaign members were returned.</p>
              ) : null}
            </article>

            <article className="codex-card archive-recent-card">
              <span className="kicker">Pending invitations</span>
              {invitesState.loading ? <p>Loading invitations...</p> : null}
              {invitesState.invitations.length ? (
                <ul>
                  {invitesState.invitations.map((invitation) => (
                    <li key={invitation.id || invitation.email}>
                      <strong>{invitation.email}</strong>
                      <span> · {invitation.role || "player"}</span>
                      <span> · {invitation.status || "pending"}</span>
                      <small> · Expires: {formatDate(invitation.expiresAt)}</small>
                    </li>
                  ))}
                </ul>
              ) : !invitesState.loading && !invitesState.error ? (
                <p>No pending invitations.</p>
              ) : null}
            </article>
          </section>

          <section className="codex-card workspace-status-card">
            <MailPlus size={22} />
            <span className="kicker">Invite player</span>
            <p>Create a campaign invitation. Delivery is queued through the local outbox; the one-time invite URL is shown only after creation.</p>
            <form className="character-import-grid" onSubmit={submitInvite}>
              <label>Email
                <input value={inviteDraft.email} onChange={(event) => setInviteDraft((draft) => ({ ...draft, email: event.target.value }))} placeholder="player@example.com" />
              </label>
              <label>Role
                <select value={inviteDraft.role} onChange={(event) => setInviteDraft((draft) => ({ ...draft, role: event.target.value }))}>
                  <option value="player">Player</option>
                  <option value="gm">GM</option>
                </select>
              </label>
              <button type="submit" className="notes-icon-action" disabled={inviteSubmit.loading || !campaignId}>{inviteSubmit.loading ? "Sending..." : "Invite"}</button>
            </form>
            {inviteSubmit.error ? <div className="status-message danger-message"><AlertTriangle size={16} /> {inviteSubmit.error}</div> : null}
            {inviteSubmit.success ? <div className="status-message success-message"><CheckCircle2 size={16} /> {inviteSubmit.success}</div> : null}
            {inviteSubmit.inviteUrl ? (
              <div className="notes-linked-card">
                <span>{inviteSubmit.inviteUrl}</span>
                <button type="button" className="notes-icon-action" onClick={copyInviteUrl} title="Copy invite URL"><Copy size={16} /></button>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
