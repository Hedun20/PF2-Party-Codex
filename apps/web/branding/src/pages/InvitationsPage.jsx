import { useMemo, useState } from "react";
import { Check, Clock3, Copy, Crown, Mail, MoreHorizontal, RefreshCw, Search, ShieldCheck, UserPlus, Users, XCircle } from "lucide-react";
import { Button, Chip, Field, PageHeader, Panel, Stat } from "../components/Ui.jsx";

const initialInvites = [
  { id: 1, email: "thalia@example.com", role: "Player", status: "Pending", sent: "Today, 09:42", expires: "6 days" },
  { id: 2, email: "orin@example.com", role: "Co-GM", status: "Accepted", sent: "Jul 18", expires: "—" },
  { id: 3, email: "mira@example.com", role: "Player", status: "Expired", sent: "Jul 10", expires: "Expired" }
];

const members = [
  { name: "Tymur", email: "timur@example.com", role: "Owner", character: "—", status: "Online" },
  { name: "Alina", email: "alina@example.com", role: "Player", character: "Lirael Moonwhisper", status: "Active" },
  { name: "Oleg", email: "oleg@example.com", role: "Player", character: "Thalion", status: "Active" },
  { name: "Marta", email: "marta@example.com", role: "Player", character: "Unassigned", status: "Invited" }
];

export default function InvitationsPage() {
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Player");
  const [filter, setFilter] = useState("All");
  const [copied, setCopied] = useState(false);
  const filteredInvites = useMemo(() => filter === "All" ? invites : invites.filter((invite) => invite.status === filter), [filter, invites]);

  function submitInvite(event) {
    event.preventDefault();
    if (!email.trim()) return;
    setInvites((items) => [{ id: Date.now(), email: email.trim(), role, status: "Pending", sent: "Just now", expires: "7 days" }, ...items]);
    setEmail("");
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard?.writeText("https://app.pf2partycodex.com/invite/silverleaf-demo");
    } catch {}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="branding-page invitations-page">
      <PageHeader
        eyebrow="Campaign management"
        title="Players & Invitations"
        description="One clear operational page for memberships, invitations, roles and character assignment. The player-facing acceptance flow uses the same brand without exposing the campaign shell before access is granted."
        actions={<Button icon={UserPlus}>Invite player</Button>}
      >
        <div className="sl-inline-chips"><Chip tone="success">Campaign healthy</Chip><Chip>4 members</Chip><Chip tone="gold">2 seats available</Chip></div>
      </PageHeader>

      <div className="branding-grid branding-grid--stats invite-stats">
        <Stat icon={Users} value="4" label="Campaign members" hint="1 owner · 3 players" />
        <Stat icon={Mail} value="1" label="Pending invite" hint="Expires in 6 days" />
        <Stat icon={ShieldCheck} value="3" label="Assigned characters" hint="1 unassigned" />
        <Stat icon={Crown} value="1" label="Co-GM seats" hint="Available" />
      </div>

      <div className="invite-layout">
        <div className="invite-layout__main">
          <Panel eyebrow="Memberships" title="Campaign roster" actions={<label className="sl-inline-search"><Search size={16} /><input placeholder="Search members..." /></label>}>
            <div className="member-table" role="table" aria-label="Campaign members">
              <div className="member-table__head" role="row"><span>Member</span><span>Role</span><span>Character</span><span>Status</span><span>Actions</span></div>
              {members.map((member) => (
                <div className="member-table__row" role="row" key={member.email}>
                  <span className="member-identity"><i>{member.name.slice(0, 2).toUpperCase()}</i><span><strong>{member.name}</strong><small>{member.email}</small></span></span>
                  <span><Chip tone={member.role === "Owner" ? "gold" : "neutral"}>{member.role}</Chip></span>
                  <span>{member.character}</span>
                  <span><Chip tone={member.status === "Online" || member.status === "Active" ? "success" : "warning"}>{member.status}</Chip></span>
                  <span><button className="sl-icon-button" type="button" aria-label={`Actions for ${member.name}`}><MoreHorizontal size={17} /></button></span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="Invitations" title="Invitation history" actions={<div className="invite-filters">{["All", "Pending", "Accepted", "Expired"].map((item) => <button type="button" key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>}>
            <div className="invite-list">
              {filteredInvites.map((invite) => (
                <article key={invite.id}>
                  <span className={`invite-status-icon is-${invite.status.toLowerCase()}`}>{invite.status === "Accepted" ? <Check size={18} /> : invite.status === "Expired" ? <XCircle size={18} /> : <Clock3 size={18} />}</span>
                  <div><strong>{invite.email}</strong><small>Sent {invite.sent} · Expires {invite.expires}</small></div>
                  <Chip tone={invite.role === "Co-GM" ? "gold" : "neutral"}>{invite.role}</Chip>
                  <Chip tone={invite.status === "Accepted" ? "success" : invite.status === "Expired" ? "danger" : "warning"}>{invite.status}</Chip>
                  <button className="sl-text-button" type="button"><RefreshCw size={14} /> Resend</button>
                  <button className="sl-icon-button" type="button" aria-label={`More actions for ${invite.email}`}><MoreHorizontal size={17} /></button>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="invite-layout__rail">
          <Panel eyebrow="New invitation" title="Invite by email">
            <form className="invite-form" onSubmit={submitInvite}>
              <Field label="Email address" hint="The invite is valid for seven days"><input className="sl-input" type="email" placeholder="player@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field>
              <Field label="Campaign role"><select className="sl-input" value={role} onChange={(event) => setRole(event.target.value)}><option>Player</option><option>Co-GM</option></select></Field>
              <label className="sl-check-row"><input type="checkbox" defaultChecked /><span>Send invitation email</span></label>
              <label className="sl-check-row"><input type="checkbox" /><span>Assign character after acceptance</span></label>
              <Button icon={Mail} className="invite-form__submit">Send invitation</Button>
            </form>
          </Panel>

          <Panel eyebrow="Shareable link" title="Campaign invite link">
            <p className="invite-link-copy">Use for trusted players when email delivery is unavailable. The backend still validates token, expiration and campaign membership.</p>
            <div className="invite-link-field"><code>app.pf2partycodex.com/invite/silverleaf-demo</code><button type="button" onClick={copyInviteLink} aria-label="Copy invitation link"><Copy size={16} /></button></div>
            {copied ? <p className="invite-copied"><Check size={14} /> Link copied</p> : null}
          </Panel>

          <Panel eyebrow="Public acceptance preview" title="What the player sees">
            <div className="accept-preview">
              <span className="accept-preview__crest"><Crown size={23} /></span>
              <strong>You are invited to The Lost Sentinel</strong>
              <p>Join as a player and enter the Silverleaf campaign archive.</p>
              <Button size="sm">Accept invitation</Button>
              <small>Sign in or create an account to continue.</small>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
