import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Crown,
  FileJson,
  KeyRound,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  UserRound,
  Users
} from "lucide-react";
import {
  Button,
  Chip,
  Field,
  IconButton,
  Panel,
  SelectInput,
  Tabs,
  TextareaInput,
  TextInput
} from "../components/Ui.jsx";

const initialMembers = [
  { id: "timur", name: "Tymur Abbasov", email: "gm@silverleaf.test", role: "Owner", character: "Game Master", status: "Active", initials: "TA" },
  { id: "anna", name: "Anna R.", email: "anna@silverleaf.test", role: "Player", character: "Mira Voss", status: "Active", initials: "AR" },
  { id: "leon", name: "Leon M.", email: "leon@silverleaf.test", role: "Player", character: "Kael Thornwalker", status: "Active", initials: "LM" },
  { id: "tavian", name: "Tavian V.", email: "tavian@silverleaf.test", role: "Assistant GM", character: "Ilyan", status: "Active", initials: "TV" },
  { id: "sera", name: "Sera K.", email: "sera@silverleaf.test", role: "Player", character: "Sera Dawnshield", status: "Away", initials: "SK" }
];

const characters = [
  { name: "Mira Voss", owner: "Anna R.", source: "Pathbuilder JSON", updated: "Today", status: "Assigned" },
  { name: "Kael Thornwalker", owner: "Leon M.", source: "Foundry Actor JSON", updated: "Yesterday", status: "Assigned" },
  { name: "Ilyan", owner: "Tavian V.", source: "Pathbuilder JSON", updated: "May 15", status: "Assigned" },
  { name: "Lirael Moonwhisper", owner: "Unassigned", source: "Manual sheet", updated: "May 14", status: "GM NPC" },
  { name: "Sera Dawnshield", owner: "Sera K.", source: "Foundry Actor JSON", updated: "May 10", status: "Review" }
];

export default function CampaignManagementPage() {
  const [activeTab, setActiveTab] = useState("access");
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Player");
  const [inviteSent, setInviteSent] = useState(false);
  const [campaignName, setCampaignName] = useState("The Lost Sentinel");
  const [worldScope, setWorldScope] = useState("optional");
  const [description, setDescription] = useState("A moonlit Pathfinder campaign about broken oaths, living archives and the last heirs of the Silverleaf Sentinels.");
  const [saved, setSaved] = useState(true);

  const activeMembers = useMemo(() => members.filter((member) => member.status === "Active").length, [members]);

  const updateRole = (memberId, role) => {
    setMembers((current) => current.map((member) => member.id === memberId ? { ...member, role } : member));
  };

  const sendInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteSent(true);
    setInviteEmail("");
  };

  return (
    <div className="management-page">
      <section className="management-hero">
        <div>
          <p className="sl-eyebrow">The Lost Sentinel · campaign operations</p>
          <h1>Campaign Management</h1>
          <p>Manage access, character ownership and campaign settings from one canonical workspace.</p>
          <div className="management-hero__chips">
            <Chip tone="success">{activeMembers} active members</Chip>
            <Chip tone="warning">1 pending invitation</Chip>
            <Chip tone="gold">Owner access</Chip>
          </div>
        </div>
        <div className="management-hero__seal" aria-hidden="true">
          <span><Crown size={38} strokeWidth={1.15} /></span>
          <strong>Campaign Owner</strong>
          <small>Exact membership · protected operations</small>
        </div>
      </section>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        items={[
          { value: "access", label: "Players & Access" },
          { value: "characters", label: "Characters & Assignment" },
          { value: "settings", label: "Campaign Settings" }
        ]}
      />

      {activeTab === "access" ? (
        <div className="management-layout">
          <Panel eyebrow="Campaign membership" title="Players & Roles" className="management-members" actions={<Button size="sm" variant="ghost" icon={RefreshCw}>Refresh</Button>}>
            <div className="management-member-list">
              {members.map((member) => (
                <div className="management-member" key={member.id}>
                  <span className="management-member__avatar">{member.initials}</span>
                  <span className="management-member__identity"><strong>{member.name}</strong><small>{member.email}</small></span>
                  <span className="management-member__character"><UserRound size={15} /><span>{member.character}</span></span>
                  <SelectInput value={member.role} onChange={(event) => updateRole(member.id, event.target.value)} disabled={member.role === "Owner"} aria-label={`Role for ${member.name}`}>
                    <option value="Owner">Owner</option>
                    <option value="Assistant GM">Assistant GM</option>
                    <option value="Player">Player</option>
                  </SelectInput>
                  <Chip tone={member.status === "Active" ? "success" : "warning"}>{member.status}</Chip>
                  <IconButton label={`Actions for ${member.name}`} icon={MoreHorizontal} />
                </div>
              ))}
            </div>
          </Panel>

          <aside className="management-rail">
            <Panel eyebrow="Invite workflow" title="Invite Player" className="management-invite">
              <Field label="Email address" hint="Invitation returns to the correct campaign after authentication">
                <TextInput icon={Mail} value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteSent(false); }} placeholder="player@example.com" aria-label="Invitation email" />
              </Field>
              <Field label="Campaign role">
                <SelectInput value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} aria-label="Invitation role">
                  <option value="Player">Player</option>
                  <option value="Assistant GM">Assistant GM</option>
                </SelectInput>
              </Field>
              {inviteSent ? <div className="management-invite__success"><Check size={16} />Invitation created and ready to copy.</div> : null}
              <Button icon={UserPlus} onClick={sendInvite}>Create Invitation</Button>
            </Panel>

            <Panel eyebrow="Pending invitation" title="player@silverleaf.test" className="management-pending">
              <div className="management-pending__meta"><Chip tone="warning">Expires in 5 days</Chip><span>Player role</span></div>
              <code>invite_7a9f••••••••silverleaf</code>
              <div className="management-pending__actions">
                <Button size="sm" variant="secondary" icon={Copy}>Copy Link</Button>
                <IconButton label="Revoke invitation" icon={Trash2} />
              </div>
            </Panel>

            <Panel eyebrow="Audit" title="Recent Access Changes" className="management-audit">
              <div className="management-audit__list">
                <span><ShieldCheck size={16} /><b>Tavian promoted</b><small>Assistant GM · 2h ago</small></span>
                <span><UserPlus size={16} /><b>Invitation created</b><small>Player · Yesterday</small></span>
                <span><KeyRound size={16} /><b>Role verified</b><small>Owner · May 15</small></span>
              </div>
            </Panel>
          </aside>
        </div>
      ) : null}

      {activeTab === "characters" ? (
        <div className="management-character-layout">
          <Panel eyebrow="Canonical ownership" title="Character Assignments" className="management-characters">
            <div className="management-character-list">
              {characters.map((character) => (
                <button type="button" key={character.name}>
                  <span className="management-character__avatar"><UserRound size={20} /></span>
                  <span><strong>{character.name}</strong><small>{character.source} · Updated {character.updated}</small></span>
                  <span className="management-character__owner"><Users size={15} />{character.owner}</span>
                  <Chip tone={character.status === "Assigned" ? "success" : character.status === "Review" ? "warning" : "gold"}>{character.status}</Chip>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </Panel>

          <aside className="management-rail">
            <Panel eyebrow="Character intake" title="Import Character" className="management-import">
              <div className="management-import__dropzone">
                <FileJson size={32} strokeWidth={1.2} />
                <strong>Pathbuilder or Foundry JSON</strong>
                <span>Raw source is preserved; normalized sheet becomes the campaign view.</span>
              </div>
              <Button variant="secondary" icon={FileJson}>Choose JSON File</Button>
            </Panel>

            <Panel eyebrow="Assignment health" title="Character Coverage" className="management-coverage">
              <div><strong>6 / 7</strong><span>members assigned</span></div>
              <p>One player still needs a campaign character. NPCs remain unassigned and controlled by the GM.</p>
              <Button variant="secondary" icon={UserRound}>Review Unassigned</Button>
            </Panel>
          </aside>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <div className="management-settings-layout">
          <Panel eyebrow="Campaign identity" title="General Settings" className="management-settings-form">
            <div className="management-settings-grid">
              <Field label="Campaign name">
                <TextInput value={campaignName} onChange={(event) => { setCampaignName(event.target.value); setSaved(false); }} aria-label="Campaign name" />
              </Field>
              <Field label="Default world scope" hint="World remains optional and never blocks campaign-wide work">
                <SelectInput value={worldScope} onChange={(event) => { setWorldScope(event.target.value); setSaved(false); }} aria-label="Default world scope">
                  <option value="optional">Optional · campaign-wide first</option>
                  <option value="silverleaf">Silverleaf Vale</option>
                  <option value="none">No default world</option>
                </SelectInput>
              </Field>
              <Field label="Campaign description">
                <TextareaInput value={description} onChange={(event) => { setDescription(event.target.value); setSaved(false); }} aria-label="Campaign description" />
              </Field>
              <Field label="Player archive visibility">
                <SelectInput defaultValue="revealed" aria-label="Player archive visibility">
                  <option value="revealed">Revealed entries only</option>
                  <option value="public">Public and revealed</option>
                </SelectInput>
              </Field>
            </div>
            <div className="management-savebar"><span>{saved ? "All changes saved" : "Unsaved campaign changes"}</span><Button icon={Save} onClick={() => setSaved(true)}>Save Campaign</Button></div>
          </Panel>

          <aside className="management-rail">
            <Panel eyebrow="Campaign protection" title="Ownership & Security" className="management-security">
              <div className="management-security__owner"><span>TA</span><div><strong>Tymur Abbasov</strong><small>Campaign owner</small></div><Chip tone="gold">Protected</Chip></div>
              <p>Ownership cannot be removed through a normal role change. Transfer requires explicit confirmation and audit logging.</p>
              <Button variant="secondary" icon={ShieldCheck}>Review Security</Button>
            </Panel>

            <Panel eyebrow="Destructive actions" title="Danger Zone" className="management-danger">
              <div><AlertTriangle size={21} /><p><strong>Archive export required</strong><span>Campaign deletion remains unavailable until a verified export is created.</span></p></div>
              <Button variant="danger" icon={Trash2} disabled>Delete Campaign</Button>
            </Panel>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
