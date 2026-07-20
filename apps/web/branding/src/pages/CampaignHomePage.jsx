import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dices,
  Eye,
  FilePlus2,
  History,
  Map,
  MapPin,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  UserPlus,
  Users
} from "lucide-react";
import { Button, Chip, IconButton, Panel } from "../components/Ui.jsx";

const activity = [
  { icon: BookOpen, title: "The Shattered Oath updated", detail: "Lore · 18 minutes ago", tone: "gold" },
  { icon: MapPin, title: "Elderspire Sanctum revealed", detail: "Location · 1 hour ago", tone: "success" },
  { icon: Users, title: "Lirael Moonwhisper linked", detail: "NPC · Yesterday", tone: "neutral" },
  { icon: History, title: "Moonlight Concord added", detail: "Timeline · Yesterday", tone: "success" }
];

const revealQueue = [
  { title: "Starfall Crossing", type: "Location", status: "Ready" },
  { title: "The First Concord", type: "Lore", status: "Review" },
  { title: "Commander Edras", type: "NPC", status: "Hidden" }
];

export default function CampaignHomePage() {
  const navigate = useNavigate();
  const [sessionReady, setSessionReady] = useState(false);

  return (
    <div className="campaign-home-page">
      <section className="campaign-home-hero">
        <div className="campaign-home-hero__copy">
          <p className="sl-eyebrow">The Lost Sentinel · campaign command</p>
          <h1>Welcome back, Game Master.</h1>
          <p>Continue building the archive, prepare the next session, or manage the people and settings behind the campaign.</p>
          <div className="campaign-home-hero__actions">
            <Button icon={FilePlus2} onClick={() => navigate("/entry/new")}>Create Archive Entry</Button>
            <Button variant="secondary" icon={Eye} onClick={() => navigate("/archive")}>Preview as Player</Button>
          </div>
        </div>
        <div className="campaign-home-hero__crest" aria-hidden="true">
          <span><ShieldCheck size={42} strokeWidth={1.15} /></span>
          <strong>The Lost Sentinel</strong>
          <small>Campaign active · Silverleaf Vale optional scope</small>
        </div>
      </section>

      <section className="campaign-home-paths" aria-label="Primary campaign workspaces">
        <button type="button" className="campaign-home-path campaign-home-path--archive" onClick={() => navigate("/archive")}>
          <span className="campaign-home-path__icon"><Archive size={34} strokeWidth={1.2} /></span>
          <span className="campaign-home-path__copy">
            <span className="sl-eyebrow">Knowledge workspace</span>
            <strong>Campaign Archive</strong>
            <span>Lore, NPCs, locations, maps, timeline, handouts and session history.</span>
          </span>
          <span className="campaign-home-path__meta"><b>86</b><small>entries</small><ChevronRight size={20} /></span>
        </button>

        <button type="button" className="campaign-home-path campaign-home-path--session" onClick={() => navigate("/dice")}>
          <span className="campaign-home-path__icon"><Swords size={34} strokeWidth={1.2} /></span>
          <span className="campaign-home-path__copy">
            <span className="sl-eyebrow">Live workspace</span>
            <strong>Active Session</strong>
            <span>Game table, dice, initiative, reveals, handouts and session notes.</span>
          </span>
          <span className="campaign-home-path__meta"><b>12</b><small>next session</small><ChevronRight size={20} /></span>
        </button>

        <button type="button" className="campaign-home-path campaign-home-path--management" onClick={() => navigate("/invitations")}>
          <span className="campaign-home-path__icon"><Settings size={34} strokeWidth={1.2} /></span>
          <span className="campaign-home-path__copy">
            <span className="sl-eyebrow">Campaign operations</span>
            <strong>Campaign Management</strong>
            <span>Players, invitations, memberships, characters and campaign settings.</span>
          </span>
          <span className="campaign-home-path__meta"><b>7</b><small>members</small><ChevronRight size={20} /></span>
        </button>
      </section>

      <div className="campaign-home-grid campaign-home-grid--main">
        <Panel eyebrow="Next gathering" title="Session 13 · The Root Vault" className="campaign-home-session">
          <div className="campaign-home-session__banner">
            <span><CalendarDays size={28} strokeWidth={1.25} /></span>
            <div>
              <strong>Saturday, May 17 · 18:30</strong>
              <small>6 confirmed · 1 awaiting response</small>
            </div>
            <Chip tone={sessionReady ? "success" : "warning"}>{sessionReady ? "Ready" : "Preparation"}</Chip>
          </div>

          <div className="campaign-home-session__checklist">
            <button type="button" className="is-complete"><CheckCircle2 size={17} /><span>Opening recap prepared</span><small>Complete</small></button>
            <button type="button" className="is-complete"><CheckCircle2 size={17} /><span>Moonlight Concord handout</span><small>Revealed</small></button>
            <button type="button"><Map size={17} /><span>Root Vault battle map</span><small>Draft</small></button>
            <button type="button"><Dices size={17} /><span>Encounter and initiative setup</span><small>Pending</small></button>
          </div>

          <div className="campaign-home-session__actions">
            <Button variant="secondary" icon={BookOpen} onClick={() => navigate("/entry")}>Open Session Notes</Button>
            <Button icon={Swords} onClick={() => setSessionReady(true)}>{sessionReady ? "Open Game Table" : "Mark Session Ready"}</Button>
          </div>
        </Panel>

        <Panel eyebrow="Recent work" title="Campaign Activity" className="campaign-home-activity">
          <div className="campaign-home-activity__list">
            {activity.map(({ icon: ActivityIcon, title, detail, tone }) => (
              <button type="button" key={title} onClick={() => navigate(title.includes("Crossing") || title.includes("Sanctum") ? "/locations" : title.includes("Concord") ? "/timeline" : "/entry")}>
                <span><ActivityIcon size={18} strokeWidth={1.35} /></span>
                <span><strong>{title}</strong><small>{detail}</small></span>
                <Chip tone={tone}>Open</Chip>
              </button>
            ))}
          </div>
          <Button variant="secondary" icon={Archive} onClick={() => navigate("/archive")}>View Complete Archive</Button>
        </Panel>
      </div>

      <div className="campaign-home-grid campaign-home-grid--support">
        <Panel eyebrow="Player-safe publishing" title="Reveal Queue" className="campaign-home-reveal">
          <div className="campaign-home-reveal__list">
            {revealQueue.map((item, index) => (
              <button type="button" key={item.title} onClick={() => navigate(index === 0 ? "/locations" : index === 2 ? "/npcs" : "/entry")}>
                <span>{index === 0 ? <MapPin size={17} /> : index === 1 ? <ScrollText size={17} /> : <Users size={17} />}</span>
                <span><strong>{item.title}</strong><small>{item.type}</small></span>
                <Chip tone={item.status === "Ready" ? "success" : item.status === "Review" ? "warning" : "neutral"}>{item.status}</Chip>
              </button>
            ))}
          </div>
          <Button variant="secondary" icon={Eye} onClick={() => navigate("/archive")}>Review Player View</Button>
        </Panel>

        <Panel eyebrow="Knowledge integrity" title="Archive Health" className="campaign-home-health">
          <div className="campaign-home-health__score">
            <span><Sparkles size={25} strokeWidth={1.2} /></span>
            <strong>92%</strong>
            <small>Well connected</small>
          </div>
          <div className="campaign-home-health__metrics">
            <span><b>74</b><small>linked entries</small></span>
            <span><b>9</b><small>drafts</small></span>
            <span><b>3</b><small>orphan records</small></span>
          </div>
          <button type="button" onClick={() => navigate("/archive")}>Review archive relations <ChevronRight size={15} /></button>
        </Panel>

        <Panel eyebrow="Campaign people" title="Players & Characters" className="campaign-home-people" actions={<IconButton label="Invite player" icon={UserPlus} onClick={() => navigate("/invitations")} />}>
          <div className="campaign-home-people__avatars">
            <span>AR</span><span>LM</span><span>TV</span><span>KS</span><span>+3</span>
          </div>
          <div className="campaign-home-people__facts">
            <span><Users size={16} /><b>7</b> campaign members</span>
            <span><Clock3 size={16} /><b>1</b> pending invitation</span>
            <span><ShieldCheck size={16} /><b>6</b> assigned characters</span>
          </div>
          <Button variant="secondary" icon={Users} onClick={() => navigate("/invitations")}>Manage Campaign Access</Button>
        </Panel>
      </div>
    </div>
  );
}
