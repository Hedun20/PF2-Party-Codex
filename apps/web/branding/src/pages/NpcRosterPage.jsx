import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Crown,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Network,
  Search,
  Shield,
  Sparkles,
  Star,
  UserRound,
  Users
} from "lucide-react";
import {
  Button,
  Chip,
  IconButton,
  Panel,
  SelectInput,
  TextInput
} from "../components/Ui.jsx";

const npcs = [
  {
    id: "lirael",
    initials: "LM",
    name: "Lirael Moonwhisper",
    role: "Loremaster",
    ancestry: "Elf",
    affiliation: "The Silverleaf Council",
    location: "Silverleaf Conclave",
    relationship: "Ally",
    importance: "High",
    tone: "emerald",
    tags: ["Wise", "Elven", "Scholarly"],
    biography: "Lirael is the current Loremaster of the Silverleaf Council and guardian of the ancient archives within the Sacred Vale. She believes knowledge must serve balance, not power."
  },
  {
    id: "thalion",
    initials: "TW",
    name: "Thalion the Warden",
    role: "Guardian",
    ancestry: "Human",
    affiliation: "The Ironwood Watch",
    location: "Ironwood Keep",
    relationship: "Ally",
    importance: "Medium",
    tone: "walnut",
    tags: ["Warden", "Veteran", "Loyal"],
    biography: "A veteran of the border wars, Thalion protects the forest roads and keeps a wary eye on old powers stirring beneath the roots."
  },
  {
    id: "darius",
    initials: "DG",
    name: "Darius Greyvale",
    role: "Mercenary Captain",
    ancestry: "Human",
    affiliation: "Greyvale Company",
    location: "Westmarch",
    relationship: "Neutral",
    importance: "Low",
    tone: "bronze",
    tags: ["Mercenary", "Pragmatic", "Armed"],
    biography: "Darius sells discipline rather than loyalty. His company has fought for three rival houses and remembers every unpaid debt."
  },
  {
    id: "vyra",
    initials: "VS",
    name: "Vyra Shadowmere",
    role: "Spymaster",
    ancestry: "Human",
    affiliation: "The Obsidian Veil",
    location: "Duskholm",
    relationship: "Unknown",
    importance: "High",
    tone: "mist",
    tags: ["Secretive", "Political", "Dangerous"],
    biography: "Few can prove Vyra exists. Fewer still understand why the Obsidian Veil has taken an interest in the Lost Sentinel."
  },
  {
    id: "mosswig",
    initials: "MT",
    name: "Mosswig Goblin Tinker",
    role: "Tinkerer",
    ancestry: "Goblin",
    affiliation: "Independent",
    location: "Wandering",
    relationship: "Neutral",
    importance: "Low",
    tone: "moss",
    tags: ["Inventor", "Curious", "Unstable"],
    biography: "Mosswig fixes what others discard, usually adding springs, bells, and one entirely unnecessary explosive charge."
  }
];

const knownFacts = [
  "Keeper of the Elder Scrolls",
  "Seeks the truth behind the Shattered Oath",
  "Distrusts the Obsidian Veil",
  "Holds a moon-touched locket"
];

function Portrait({ npc, large = false }) {
  return (
    <span className={`npc-portrait npc-portrait--${npc.tone}${large ? " npc-portrait--large" : ""}`} aria-hidden="true">
      <span className="npc-portrait__halo" />
      <span className="npc-portrait__silhouette" />
      <strong>{npc.initials}</strong>
    </span>
  );
}

export default function NpcRosterPage() {
  const [selectedId, setSelectedId] = useState("lirael");
  const selected = useMemo(() => npcs.find((npc) => npc.id === selectedId) || npcs[0], [selectedId]);

  return (
    <div className="npc-roster-page">
      <header className="npc-roster-heading">
        <div>
          <p className="sl-eyebrow">Campaign Archive · people</p>
          <h1>NPC Roster</h1>
          <p>The people, creatures, and beings your party has encountered.</p>
        </div>
        <div className="npc-roster-heading__actions">
          <Button variant="secondary" icon={Network}>Manage Relations</Button>
          <Button icon={UserRound}>Create NPC</Button>
        </div>
      </header>

      <div className="npc-roster-filters">
        <TextInput icon={Search} placeholder="Search NPCs..." aria-label="Search NPCs" />
        <SelectInput defaultValue="all" aria-label="NPC affiliation">
          <option value="all">All Affiliations</option>
          <option value="silverleaf">Silverleaf Council</option>
          <option value="ironwood">Ironwood Watch</option>
          <option value="obsidian">Obsidian Veil</option>
        </SelectInput>
        <SelectInput defaultValue="all" aria-label="NPC location">
          <option value="all">All Locations</option>
          <option value="conclave">Silverleaf Conclave</option>
          <option value="westmarch">Westmarch</option>
          <option value="duskholm">Duskholm</option>
        </SelectInput>
        <SelectInput defaultValue="all" aria-label="NPC relationship">
          <option value="all">All Relationships</option>
          <option value="ally">Allies</option>
          <option value="neutral">Neutral</option>
          <option value="unknown">Unknown</option>
        </SelectInput>
        <SelectInput defaultValue="name" aria-label="NPC sort order">
          <option value="name">Name A–Z</option>
          <option value="importance">Importance</option>
          <option value="recent">Recently Met</option>
        </SelectInput>
      </div>

      <div className="npc-roster-layout">
        <main className="npc-roster-main">
          <section className="npc-featured-card">
            <span className="npc-featured-card__label">Featured NPC</span>
            <Portrait npc={npcs[0]} large />
            <div className="npc-featured-card__copy">
              <p className="sl-eyebrow">Elven loremaster · keeper of ancient lore</p>
              <h2>Lirael Moonwhisper</h2>
              <div className="npc-featured-card__facts">
                <span><Network size={15} strokeWidth={1.35} /> The Silverleaf Council</span>
                <span><MapPin size={15} strokeWidth={1.35} /> Silverleaf Conclave, Eldoria</span>
              </div>
              <div className="sl-inline-chips"><Chip tone="success">Ally</Chip><Chip>Wise</Chip><Chip tone="gold">Scholarly</Chip></div>
              <p>Guardian of the Vale and keeper of the oldest records in Silverleaf. She seeks balance between duty and the fate of Eldoria.</p>
            </div>
            <div className="npc-featured-card__status">
              <span><small>Importance</small><strong><Crown size={15} /> High</strong></span>
              <span><small>Status</small><strong><Shield size={15} /> Ally</strong></span>
              <span><small>First met</small><strong>May 9, 2025</strong></span>
              <Button variant="secondary" size="sm">View Details</Button>
            </div>
          </section>

          <section className="npc-directory">
            <div className="npc-directory__heading">
              <div><p className="sl-eyebrow">NPC directory</p><h2>Known Figures <span>68</span></h2></div>
              <div className="sl-inline-chips"><Chip tone="success">All 68</Chip><Chip>Allies 18</Chip><Chip>Neutral 21</Chip><Chip tone="gold">Important 12</Chip></div>
            </div>

            <div className="npc-card-grid">
              {npcs.map((npc) => (
                <button key={npc.id} type="button" className={`npc-card${npc.id === selectedId ? " is-selected" : ""}`} onClick={() => setSelectedId(npc.id)}>
                  <Portrait npc={npc} />
                  <span className="npc-card__favorite"><Star size={15} strokeWidth={1.35} /></span>
                  <span className="npc-card__copy">
                    <strong>{npc.name}</strong>
                    <em>{npc.role}</em>
                    <small><Network size={12} /> {npc.affiliation}</small>
                    <small><MapPin size={12} /> {npc.location}</small>
                  </span>
                  <span className="npc-card__footer"><Chip tone={npc.relationship === "Ally" ? "success" : npc.importance === "High" ? "gold" : "neutral"}>{npc.relationship}</Chip><small>{npc.importance}</small></span>
                </button>
              ))}
            </div>
          </section>

          <Panel eyebrow="Directory index" title="All Known NPCs" className="npc-table-panel" actions={<IconButton label="Table actions" icon={MoreHorizontal} />}>
            <div className="npc-table">
              {npcs.slice(1).map((npc) => (
                <button type="button" key={npc.id} onClick={() => setSelectedId(npc.id)}>
                  <Portrait npc={npc} />
                  <span><strong>{npc.name}</strong><small>{npc.ancestry} · {npc.role}</small></span>
                  <span><Network size={14} /> {npc.affiliation}</span>
                  <span><MapPin size={14} /> {npc.location}</span>
                  <Chip tone={npc.relationship === "Ally" ? "success" : npc.importance === "High" ? "gold" : "neutral"}>{npc.relationship}</Chip>
                  <Star size={15} strokeWidth={1.35} />
                  <MoreHorizontal size={16} strokeWidth={1.35} />
                </button>
              ))}
            </div>
          </Panel>
        </main>

        <aside className="npc-inspector">
          <section className="npc-profile-hero">
            <Portrait npc={selected} large />
            <div className="npc-profile-hero__tools"><IconButton label="Favorite NPC" icon={Star} /><IconButton label="More NPC actions" icon={MoreHorizontal} /></div>
            <div className="npc-profile-hero__copy">
              <p className="sl-eyebrow">{selected.ancestry} · {selected.role}</p>
              <h2>{selected.name}</h2>
              <span><Network size={14} /> {selected.affiliation}</span>
              <span><MapPin size={14} /> {selected.location}</span>
              <div className="sl-inline-chips">{selected.tags.map((tag, index) => <Chip key={tag} tone={index === 0 ? "success" : index === 2 ? "gold" : "neutral"}>{tag}</Chip>)}</div>
            </div>
          </section>

          <Panel eyebrow="Biography" title="Known History">
            <p className="npc-inspector__body-copy">{selected.biography}</p>
          </Panel>

          <Panel eyebrow="Known facts" title="Verified Knowledge">
            <ul className="npc-known-facts">{knownFacts.map((fact) => <li key={fact}><Sparkles size={13} strokeWidth={1.35} />{fact}</li>)}</ul>
            <button type="button" className="npc-text-link">View All Facts <ChevronRight size={14} /></button>
          </Panel>

          <Panel eyebrow="Relationships" title="Social Web">
            <div className="npc-relationship-list">
              <button type="button"><Users size={16} /><strong>The Lost Sentinel</strong><Chip tone="success">Trusted Ally</Chip></button>
              <button type="button"><UserRound size={16} /><strong>Thalion the Warden</strong><Chip tone="success">Close Ally</Chip></button>
              <button type="button"><Network size={16} /><strong>The Obsidian Veil</strong><Chip tone="danger">Distrust</Chip></button>
            </div>
          </Panel>

          <Panel eyebrow="Linked entries" title="Archive Connections">
            <div className="npc-linked-list">
              <button type="button"><MapPin size={16} /><strong>Silverleaf Conclave</strong><small>Location</small><ChevronRight size={14} /></button>
              <button type="button"><BookOpen size={16} /><strong>The Shattered Oath</strong><small>Lore Entry</small><ChevronRight size={14} /></button>
              <button type="button"><ScrollTextIcon /><strong>Moonlit Concord</strong><small>Session</small><ChevronRight size={14} /></button>
            </div>
          </Panel>

          <div className="npc-quick-actions">
            <Button variant="secondary" size="sm" icon={BookOpen}>Journal</Button>
            <Button variant="secondary" size="sm" icon={MessageCircle}>Add Note</Button>
            <Button variant="secondary" size="sm" icon={MessageCircle}>Conversation</Button>
            <Button variant="secondary" size="sm" icon={Link2}>Relationship</Button>
          </div>
          <Button icon={UserRound}>Open Full Profile</Button>
        </aside>
      </div>
    </div>
  );
}

function ScrollTextIcon(props) {
  return <BookOpen size={16} strokeWidth={1.35} {...props} />;
}
