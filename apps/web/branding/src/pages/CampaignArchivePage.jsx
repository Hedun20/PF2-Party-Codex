import { useMemo, useState } from "react";
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Map,
  MapPin,
  MoreHorizontal,
  Search,
  Sparkles,
  Upload,
  Users
} from "lucide-react";
import {
  Button,
  Chip,
  IconButton,
  Panel,
  SelectInput,
  Stat,
  TextInput
} from "../components/Ui.jsx";

const entries = [
  {
    id: "moonlight",
    type: "Session",
    title: "Session 12: Moonlight Concord",
    summary: "The party reaches the Silverleaf Conclave as old alliances fracture beneath a moonlit oath.",
    date: "May 12, 2025",
    detail: "3h 48m · 7 players",
    tone: "moon",
    icon: CalendarDays,
    tags: ["Roleplay", "Politics", "Elven"]
  },
  {
    id: "oath",
    type: "Lore",
    title: "The Shattered Oath",
    summary: "Fragments of an ancient promise reveal a betrayal buried deep within elven history.",
    date: "May 10, 2025",
    detail: "1,024 words",
    tone: "parchment",
    icon: BookOpen,
    tags: ["Lore", "History", "Revealed"]
  },
  {
    id: "lirael",
    type: "NPC",
    title: "Lirael Moonwhisper",
    summary: "Guardian of the Vale and keeper of forgotten realms, balancing duty against destiny.",
    date: "May 9, 2025",
    detail: "Level 12 · Ally",
    tone: "portrait",
    icon: Users,
    tags: ["NPC", "Ally", "Elf"]
  },
  {
    id: "sanctum",
    type: "Location",
    title: "Elderspire Sanctum",
    summary: "A sacred archive hidden within the Whispering Vale, where memory is carved into living stone.",
    date: "May 8, 2025",
    detail: "Public · Silverleaf Vale",
    tone: "sanctum",
    icon: MapPin,
    tags: ["Location", "Sanctuary", "Ancient"]
  }
];

export default function CampaignArchivePage() {
  const [selectedId, setSelectedId] = useState(entries[0].id);
  const selected = useMemo(() => entries.find((entry) => entry.id === selectedId) || entries[0], [selectedId]);
  const SelectedIcon = selected.icon;

  return (
    <div className="archive-page">
      <section className="archive-page__hero">
        <div className="archive-page__hero-copy">
          <p className="sl-eyebrow">The Lost Sentinel · Campaign knowledge</p>
          <h1>Campaign Archive</h1>
          <p>Your campaign’s complete history, preserved for posterity. Organized. Timeless. Yours.</p>
          <div className="archive-page__hero-actions">
            <Button>Create New Entry</Button>
            <Button variant="secondary" icon={Upload}>Import Archive</Button>
          </div>
        </div>
        <div className="archive-page__hero-art" aria-hidden="true">
          <span className="archive-page__moon" />
          <span className="archive-page__arch" />
          <Sparkles size={34} strokeWidth={1.2} />
          <strong>Silverleaf Conclave</strong>
          <small>Moonlit sanctuary of forgotten histories</small>
        </div>
      </section>

      <div className="branding-grid branding-grid--stats archive-page__stats">
        <Stat icon={CalendarDays} value="12" label="Sessions" hint="+2 this month" />
        <Stat icon={FileText} value="86" label="Journal entries" hint="+7 this month" />
        <Stat icon={Users} value="47" label="Known NPCs" hint="18 allies" />
        <Stat icon={Map} value="32" label="Locations" hint="4 newly revealed" />
      </div>

      <div className="archive-page__layout">
        <Panel
          eyebrow="Archive entries"
          title="Known Records"
          className="archive-page__library"
          actions={<IconButton label="Archive actions" icon={MoreHorizontal} />}
        >
          <div className="archive-filterbar">
            <TextInput icon={Search} aria-label="Search archive entries" placeholder="Search entries..." />
            <SelectInput defaultValue="all" aria-label="Archive category">
              <option value="all">All Categories</option>
              <option value="lore">Lore</option>
              <option value="npc">NPCs</option>
              <option value="location">Locations</option>
            </SelectInput>
            <SelectInput defaultValue="newest" aria-label="Archive sorting">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title A–Z</option>
            </SelectInput>
          </div>

          <div className="archive-entry-list">
            {entries.map((entry) => {
              const EntryIcon = entry.icon;
              const selectedEntry = entry.id === selectedId;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`archive-entry${selectedEntry ? " is-selected" : ""}`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <span className={`archive-entry__art archive-entry__art--${entry.tone}`} aria-hidden="true">
                    <span><EntryIcon size={28} strokeWidth={1.25} /></span>
                  </span>
                  <span className="archive-entry__content">
                    <span className="archive-entry__type">{entry.type}</span>
                    <strong>{entry.title}</strong>
                    <span className="archive-entry__summary">{entry.summary}</span>
                    <span className="archive-entry__chips">
                      {entry.tags.map((tag, index) => <Chip key={tag} tone={index === 0 ? "success" : index === 2 ? "gold" : "neutral"}>{tag}</Chip>)}
                    </span>
                  </span>
                  <span className="archive-entry__meta">
                    <span>{entry.date}</span>
                    <small>{entry.detail}</small>
                    <ChevronRight size={18} strokeWidth={1.35} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="archive-page__load-more">
            <Button variant="secondary">Load More Entries</Button>
          </div>
        </Panel>

        <Panel
          eyebrow="Selected record"
          title={selected.title}
          className="archive-page__inspector"
          actions={<><IconButton label="Preview record" icon={Eye} /><IconButton label="More actions" icon={MoreHorizontal} /></>}
        >
          <div className="archive-inspector">
            <div className={`archive-inspector__art archive-entry__art--${selected.tone}`}>
              <span><SelectedIcon size={42} strokeWidth={1.2} /></span>
            </div>

            <div className="archive-inspector__identity">
              <Chip tone="success">{selected.type}</Chip>
              <p>{selected.summary}</p>
              <div className="archive-inspector__facts">
                <span><CalendarDays size={15} strokeWidth={1.4} />{selected.date}</span>
                <span><Clock3 size={15} strokeWidth={1.4} />{selected.detail}</span>
              </div>
            </div>

            <section className="archive-inspector__section">
              <h3>Key Tags</h3>
              <div className="sl-inline-chips">
                {selected.tags.map((tag, index) => <Chip key={tag} tone={index === 0 ? "success" : index === 2 ? "gold" : "neutral"}>{tag}</Chip>)}
              </div>
            </section>

            <section className="archive-inspector__section">
              <h3>Related Content</h3>
              <button type="button"><Users size={17} strokeWidth={1.35} /><span>Lirael Moonwhisper</span><small>NPC</small><ChevronRight size={15} /></button>
              <button type="button"><MapPin size={17} strokeWidth={1.35} /><span>Silverleaf Conclave</span><small>Location</small><ChevronRight size={15} /></button>
              <button type="button"><BookOpen size={17} strokeWidth={1.35} /><span>The Shattered Oath</span><small>Lore</small><ChevronRight size={15} /></button>
            </section>

            <section className="archive-inspector__section">
              <h3>Quick Actions</h3>
              <div className="archive-inspector__actions">
                <Button variant="secondary" icon={BookOpen}>Open in Journal</Button>
                <Button variant="secondary" icon={Archive}>View Relations</Button>
              </div>
            </section>
          </div>
        </Panel>
      </div>
    </div>
  );
}
