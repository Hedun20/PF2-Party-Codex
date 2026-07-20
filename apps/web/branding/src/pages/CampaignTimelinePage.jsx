import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Crown,
  Eye,
  GitBranch,
  History,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Shield,
  Sparkles,
  Swords,
  Users,
  WandSparkles
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

const eras = [
  { id: "dawn", label: "Age of Dawn", span: "0–312 AR", count: 3 },
  { id: "crown", label: "Crown Era", span: "313–678 AR", count: 4 },
  { id: "fracture", label: "The Fracture", span: "679–824 AR", count: 5 },
  { id: "present", label: "Present Age", span: "825 AR–Now", count: 4 }
];

const events = [
  {
    id: "first-song",
    era: "dawn",
    year: "12 AR",
    title: "The First Song of Silverleaf",
    type: "Mythic Event",
    summary: "The first moon-singers bind living memory into the roots of the Vale.",
    icon: WandSparkles,
    tone: "moon",
    visibility: "Public",
    tags: ["Origins", "Elven", "Magic"],
    location: "Whispering Vale",
    people: "The Seven Voices",
    consequence: "The Royal Archive is founded as a living covenant rather than a building.",
    branch: "Foundation of the Moon Courts",
    gmNote: "The seventh singer did not die. Their name was removed from every public record."
  },
  {
    id: "moon-courts",
    era: "dawn",
    year: "188 AR",
    title: "Foundation of the Moon Courts",
    type: "Political Event",
    summary: "Five noble houses accept the Silverleaf Compact and divide stewardship of the Vale.",
    icon: Crown,
    tone: "gold",
    visibility: "Revealed",
    tags: ["Politics", "Nobility", "Treaty"],
    location: "Silverleaf Conclave",
    people: "House Vaelorian · House Moonwhisper",
    consequence: "The Compact creates peace, but also formalizes the rivalries that later fracture the realm.",
    branch: "The Shattered Oath",
    gmNote: "The compact includes a sixth seal visible only under eclipse light."
  },
  {
    id: "sentinel-order",
    era: "crown",
    year: "411 AR",
    title: "The Sentinel Order Rises",
    type: "Military Event",
    summary: "Wardens sworn to the living archive defend the old roads from ash-born incursions.",
    icon: Shield,
    tone: "emerald",
    visibility: "Public",
    tags: ["Order", "War", "Guardians"],
    location: "Elderspire Sanctum",
    people: "Commander Aerendyl",
    consequence: "The Sentinels become the military and moral authority of the Vale.",
    branch: "War of Cinder Stars",
    gmNote: "Their original oath contains a clause allowing them to depose the Moon Courts."
  },
  {
    id: "cinder-war",
    era: "crown",
    year: "602 AR",
    title: "War of Cinder Stars",
    type: "War",
    summary: "Three years of firestorms leave the eastern forest glassed and the old roads broken.",
    icon: Swords,
    tone: "ember",
    visibility: "Revealed",
    tags: ["War", "Catastrophe", "Dragons"],
    location: "Eastern Marches",
    people: "Sentinel Order · Ashen Host",
    consequence: "The Vale survives, but the Sentinel Order loses most of its founding bloodlines.",
    branch: "Treaty of Falling Embers",
    gmNote: "The dragons were not invaders. They were driven west by something beneath the mountains."
  },
  {
    id: "shattered-oath",
    era: "fracture",
    year: "703 AR",
    title: "The Shattered Oath",
    type: "Betrayal",
    summary: "A hidden clause in the Silverleaf Compact is invoked, splitting court, archive and order.",
    icon: GitBranch,
    tone: "violet",
    visibility: "GM Only",
    tags: ["Secret", "Betrayal", "History"],
    location: "Hall of Seven Branches",
    people: "Queen Ilyra · Marshal Theron",
    consequence: "The official history records a peaceful succession. In truth, the archive itself chose a side.",
    branch: "Exile of House Vaelorian",
    gmNote: "This is the campaign’s central hidden truth. Players should discover it in three fragments."
  },
  {
    id: "exile",
    era: "fracture",
    year: "719 AR",
    title: "Exile of House Vaelorian",
    type: "Political Event",
    summary: "The oldest noble line vanishes beyond the northern gate with its banners and true-name ledgers.",
    icon: Users,
    tone: "mist",
    visibility: "Hidden",
    tags: ["House", "Exile", "Mystery"],
    location: "Northern Gate",
    people: "House Vaelorian",
    consequence: "A generation of records disappears, leaving bloodlines and inheritance claims unresolved.",
    branch: "Return of the Lost Heir",
    gmNote: "Lirael is carrying one of the missing ledgers without knowing what it is."
  },
  {
    id: "concord",
    era: "present",
    year: "846 AR",
    title: "The Moonlight Concord",
    type: "Campaign Event",
    summary: "The party brokers a fragile truce while the forgotten sixth seal begins to awaken.",
    icon: Sparkles,
    tone: "moon",
    visibility: "Revealed",
    tags: ["Session 12", "Party", "Current"],
    location: "Silverleaf Conclave",
    people: "The Lost Sentinel Party",
    consequence: "For the first time in a century, all surviving courts agree to reopen the sealed archive wing.",
    branch: "Opening of the Seventh Vault",
    gmNote: "Next session begins with the archive rejecting one party member by name."
  }
];

export default function CampaignTimelinePage() {
  const [selectedEra, setSelectedEra] = useState("all");
  const [selectedId, setSelectedId] = useState("shattered-oath");
  const [query, setQuery] = useState("");

  const visibleEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesEra = selectedEra === "all" || event.era === selectedEra;
      const haystack = `${event.title} ${event.type} ${event.summary} ${event.tags.join(" ")}`.toLowerCase();
      return matchesEra && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [query, selectedEra]);

  const selected = events.find((event) => event.id === selectedId) || events[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="timeline-page">
      <section className="timeline-hero">
        <div className="timeline-hero__copy">
          <p className="sl-eyebrow">The Lost Sentinel · Living history</p>
          <h1>Campaign Timeline</h1>
          <p>Trace the ages, wars, promises and hidden fractures that shaped Silverleaf Vale.</p>
          <div className="timeline-hero__actions">
            <Button icon={Plus}>Add Timeline Event</Button>
            <Button variant="secondary" icon={Eye}>Preview as Player</Button>
          </div>
        </div>
        <div className="timeline-hero__dial" aria-hidden="true">
          <span className="timeline-hero__ring timeline-hero__ring--outer" />
          <span className="timeline-hero__ring timeline-hero__ring--inner" />
          <History size={40} strokeWidth={1.15} />
          <strong>846 AR</strong>
          <small>Present age</small>
        </div>
      </section>

      <div className="branding-grid branding-grid--stats timeline-stats">
        <Stat icon={History} value="4" label="Recorded eras" hint="From 0 AR to present" />
        <Stat icon={CalendarDays} value="16" label="Timeline events" hint="7 currently revealed" />
        <Stat icon={GitBranch} value="6" label="Active branches" hint="2 hidden paths" />
        <Stat icon={Clock3} value="846" label="Current year" hint="Silverleaf reckoning" />
      </div>

      <div className="timeline-layout">
        <Panel eyebrow="Chronicle" title="Ages of Silverleaf" className="timeline-library" actions={<IconButton label="Timeline actions" icon={MoreHorizontal} />}>
          <div className="timeline-filterbar">
            <TextInput icon={Search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events, people or tags..." aria-label="Search timeline" />
            <SelectInput value={selectedEra} onChange={(event) => setSelectedEra(event.target.value)} aria-label="Timeline era">
              <option value="all">All Eras</option>
              {eras.map((era) => <option key={era.id} value={era.id}>{era.label}</option>)}
            </SelectInput>
            <SelectInput defaultValue="chronological" aria-label="Timeline order">
              <option value="chronological">Oldest First</option>
              <option value="reverse">Newest First</option>
              <option value="revealed">Revealed Only</option>
            </SelectInput>
          </div>

          <div className="timeline-era-strip" role="tablist" aria-label="Timeline eras">
            <button type="button" className={selectedEra === "all" ? "is-active" : ""} onClick={() => setSelectedEra("all")}>
              <History size={17} strokeWidth={1.35} /><span>All Ages</span><small>{events.length}</small>
            </button>
            {eras.map((era) => (
              <button key={era.id} type="button" className={selectedEra === era.id ? "is-active" : ""} onClick={() => setSelectedEra(era.id)}>
                <span>{era.label}</span><small>{era.span}</small><em>{era.count}</em>
              </button>
            ))}
          </div>

          <div className="timeline-track">
            {visibleEvents.map((event) => {
              const EventIcon = event.icon;
              const selectedEvent = selectedId === event.id;
              return (
                <article key={event.id} className={`timeline-event${selectedEvent ? " is-selected" : ""}${event.visibility === "GM Only" ? " is-secret" : ""}`}>
                  <div className="timeline-event__date">
                    <span>{event.year}</span>
                    <i aria-hidden="true" />
                  </div>
                  <button type="button" className="timeline-event__card" onClick={() => setSelectedId(event.id)}>
                    <span className={`timeline-event__icon timeline-event__icon--${event.tone}`} aria-hidden="true"><EventIcon size={24} strokeWidth={1.25} /></span>
                    <span className="timeline-event__copy">
                      <span className="timeline-event__eyebrow">{event.type}</span>
                      <strong>{event.title}</strong>
                      <span>{event.summary}</span>
                      <span className="timeline-event__tags">
                        {event.tags.map((tag, index) => <Chip key={tag} tone={index === 0 ? "gold" : index === 2 ? "success" : "neutral"}>{tag}</Chip>)}
                      </span>
                    </span>
                    <span className="timeline-event__status">
                      <Chip tone={event.visibility === "GM Only" ? "danger" : event.visibility === "Revealed" ? "success" : "neutral"}>{event.visibility}</Chip>
                      <GitBranch size={17} strokeWidth={1.3} aria-hidden="true" />
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel eyebrow="Selected event" title={selected.title} className="timeline-inspector" actions={<><IconButton label="Edit event" icon={MoreHorizontal} /><IconButton label="Preview event" icon={Eye} /></>}>
          <div className="timeline-inspector__body">
            <div className={`timeline-inspector__art timeline-event__icon--${selected.tone}`}>
              <span><SelectedIcon size={44} strokeWidth={1.15} /></span>
              <strong>{selected.year}</strong>
              <small>{selected.type}</small>
            </div>

            <div className="timeline-inspector__summary">
              <Chip tone={selected.visibility === "GM Only" ? "danger" : "success"}>{selected.visibility}</Chip>
              <p>{selected.summary}</p>
              <div className="sl-inline-chips">
                {selected.tags.map((tag, index) => <Chip key={tag} tone={index === 0 ? "gold" : "neutral"}>{tag}</Chip>)}
              </div>
            </div>

            <section className="timeline-inspector__section">
              <h3>Event Record</h3>
              <dl>
                <div><dt><MapPin size={15} />Location</dt><dd>{selected.location}</dd></div>
                <div><dt><Users size={15} />People</dt><dd>{selected.people}</dd></div>
                <div><dt><GitBranch size={15} />Leads to</dt><dd>{selected.branch}</dd></div>
              </dl>
            </section>

            <section className="timeline-inspector__section">
              <h3>Historical Consequence</h3>
              <p>{selected.consequence}</p>
            </section>

            <section className="timeline-inspector__section timeline-inspector__secret">
              <div><Shield size={17} strokeWidth={1.35} /><h3>GM-only truth</h3></div>
              <p>{selected.gmNote}</p>
            </section>

            <div className="timeline-inspector__actions">
              <Button variant="secondary" icon={GitBranch}>Open Relations</Button>
              <Button variant="secondary" icon={Eye}>Reveal Event</Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
