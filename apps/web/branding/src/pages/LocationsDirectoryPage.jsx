import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  CalendarDays,
  Castle,
  ChevronRight,
  Eye,
  EyeOff,
  Map,
  MapPin,
  Mountain,
  Plus,
  Route,
  Search,
  Shield,
  Sparkles,
  TreePine,
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

const locations = [
  {
    id: "elderspire",
    name: "Elderspire Sanctum",
    kind: "Sanctuary",
    region: "Whispering Vale",
    visibility: "public",
    status: "Safe Haven",
    distance: "Current location",
    summary: "A living archive grown around an ancient silverleaf tree, guarded by oathbound wardens and moonlit memory halls.",
    tone: "sanctum",
    icon: Castle,
    tags: ["Ancient", "Archive", "Elven"],
    residents: ["Lirael Moonwhisper", "Archivist Sael", "The Oathbound"],
    connections: ["Moonpath Causeway", "Silverleaf Conclave", "The Root Vault"],
    entries: ["The Shattered Oath", "The First Concord", "Session 12: Moonlight Concord"],
    reveal: "Fully revealed",
    lastVisit: "Session 12 · May 12",
    gmNote: "The Root Vault opens only when three fragments of the Shattered Oath are returned to the living tree."
  },
  {
    id: "conclave",
    name: "Silverleaf Conclave",
    kind: "Settlement",
    region: "Central Vale",
    visibility: "public",
    status: "Political Center",
    distance: "4 hours east",
    summary: "The diplomatic heart of the vale, arranged around crescent terraces where houses settle disputes beneath the moon canopy.",
    tone: "conclave",
    icon: Building2,
    tags: ["City", "Politics", "Trade"],
    residents: ["Councillor Vael", "House Miraleth", "Moonwardens"],
    connections: ["Elderspire Sanctum", "Verdant Gate", "Starfall Crossing"],
    entries: ["Moonlight Concord", "The Five Houses", "The Verdant Accord"],
    reveal: "Fully revealed",
    lastVisit: "Session 11 · May 5",
    gmNote: "House Miraleth is funding expeditions into the sealed western ruins through three deniable intermediaries."
  },
  {
    id: "starfall",
    name: "Starfall Crossing",
    kind: "Landmark",
    region: "Northern Reach",
    visibility: "revealed",
    status: "Unstable",
    distance: "2 days north",
    summary: "A shattered bridge of pale stone suspended above a ravine where fragments of starlight still drift upward at dusk.",
    tone: "starfall",
    icon: Sparkles,
    tags: ["Ruin", "Arcane", "Hazard"],
    residents: ["No permanent residents", "Pilgrim caravans"],
    connections: ["Silverleaf Conclave", "Frostroot Pass", "Moonpath Causeway"],
    entries: ["The Falling Star", "Expedition Notes: Northern Reach"],
    reveal: "Revealed to players",
    lastVisit: "Session 8 · April 14",
    gmNote: "The floating fragments resonate with the same magic as the missing Sentinel sigil. Removing one awakens the ravine guardian."
  },
  {
    id: "thornwatch",
    name: "Thornwatch Bastion",
    kind: "Fortress",
    region: "Western Border",
    visibility: "gm",
    status: "Hostile",
    distance: "3 days west",
    summary: "An abandoned border fortress reclaimed by blackthorn growth and occupied by soldiers whose banners were erased from history.",
    tone: "bastion",
    icon: Shield,
    tags: ["Fortress", "Enemy", "Hidden"],
    residents: ["The Ashen Company", "Commander Edras"],
    connections: ["Blackroot Road", "The Weeping Fields", "Western Ruins"],
    entries: ["The Ashen Company", "Border War Ledger"],
    reveal: "GM only",
    lastVisit: "Not yet visited",
    gmNote: "Commander Edras is a surviving Sentinel bound to the bastion by the same oath that protects Elderspire."
  },
  {
    id: "frostroot",
    name: "Frostroot Pass",
    kind: "Wilderness",
    region: "Northern Reach",
    visibility: "revealed",
    status: "Travel Route",
    distance: "3 days north",
    summary: "A high mountain passage where silver roots break through the ice and mark the only reliable route beyond the vale.",
    tone: "frostroot",
    icon: Mountain,
    tags: ["Mountain", "Travel", "Cold"],
    residents: ["Frostroot guides", "Stonehorn herds"],
    connections: ["Starfall Crossing", "Northwatch Camp"],
    entries: ["Road to the Northern Reach", "Winter Supply Ledger"],
    reveal: "Revealed to players",
    lastVisit: "Session 7 · April 7",
    gmNote: "A hidden root tunnel bypasses the pass but exits inside the sealed observatory beneath Northwatch."
  },
  {
    id: "moonwood",
    name: "The Moonwood",
    kind: "Wilderness",
    region: "Eastern Vale",
    visibility: "public",
    status: "Sacred Ground",
    distance: "6 hours southeast",
    summary: "A quiet forest where leaves reflect the night sky even at noon and paths subtly change to protect sacred clearings.",
    tone: "moonwood",
    icon: TreePine,
    tags: ["Forest", "Sacred", "Fey"],
    residents: ["Moonwood wardens", "Fey envoys", "The Pale Hart"],
    connections: ["Silverleaf Conclave", "Whispering Vale", "Dawnmere"],
    entries: ["The Pale Hart", "Moonwood Customs", "The Hidden Clearing"],
    reveal: "Fully revealed",
    lastVisit: "Session 5 · March 24",
    gmNote: "The forest is slowly relocating the Hidden Clearing toward the party because it recognizes the Sentinel mark."
  }
];

const kindOptions = ["all", "Settlement", "Sanctuary", "Fortress", "Landmark", "Wilderness"];

export default function LocationsDirectoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [visibility, setVisibility] = useState("all");
  const [selectedId, setSelectedId] = useState(locations[0].id);

  const filteredLocations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return locations.filter((location) => {
      const matchesQuery = !normalized || [location.name, location.region, location.kind, location.summary, ...location.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
      const matchesKind = kind === "all" || location.kind === kind;
      const matchesVisibility = visibility === "all" || location.visibility === visibility;
      return matchesQuery && matchesKind && matchesVisibility;
    });
  }, [kind, query, visibility]);

  const selected = locations.find((location) => location.id === selectedId) || locations[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="locations-page">
      <section className="locations-hero">
        <div>
          <p className="sl-eyebrow">Silverleaf Vale · known places</p>
          <h1>Locations Directory</h1>
          <p>Every sanctuary, settlement, road and ruin connected to the living history of the campaign.</p>
          <div className="locations-hero__actions">
            <Button icon={Plus} onClick={() => navigate("/entry/new")}>Create Location</Button>
            <Button variant="secondary" icon={Map} onClick={() => navigate("/maps")}>Open Campaign Map</Button>
          </div>
        </div>
        <div className="locations-hero__sigil" aria-hidden="true">
          <span><MapPin size={38} strokeWidth={1.2} /></span>
          <strong>32</strong>
          <small>documented places</small>
        </div>
      </section>

      <div className="branding-grid branding-grid--stats locations-page__stats">
        <Stat icon={Building2} value="8" label="Settlements" hint="3 major cities" />
        <Stat icon={Castle} value="6" label="Strongholds" hint="2 hostile" />
        <Stat icon={TreePine} value="11" label="Wild regions" hint="4 sacred sites" />
        <Stat icon={Route} value="19" label="Known routes" hint="6 hidden paths" />
      </div>

      <div className="locations-page__layout">
        <Panel eyebrow="World atlas" title="Known Locations" className="locations-library">
          <div className="locations-filterbar">
            <TextInput
              icon={Search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search locations..."
              aria-label="Search locations"
            />
            <SelectInput value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Location type">
              {kindOptions.map((option) => <option value={option} key={option}>{option === "all" ? "All Types" : option}</option>)}
            </SelectInput>
            <SelectInput value={visibility} onChange={(event) => setVisibility(event.target.value)} aria-label="Location visibility">
              <option value="all">All Visibility</option>
              <option value="public">Public</option>
              <option value="revealed">Revealed</option>
              <option value="gm">GM Only</option>
            </SelectInput>
          </div>

          <div className="locations-results-meta">
            <span>{filteredLocations.length} locations visible</span>
            <small>Current campaign: The Lost Sentinel</small>
          </div>

          <div className="location-card-grid">
            {filteredLocations.map((location) => {
              const LocationIcon = location.icon;
              const active = location.id === selected.id;
              return (
                <button
                  type="button"
                  className={`location-card${active ? " is-selected" : ""}`}
                  key={location.id}
                  onClick={() => setSelectedId(location.id)}
                >
                  <span className={`location-card__art location-card__art--${location.tone}`} aria-hidden="true">
                    <span><LocationIcon size={34} strokeWidth={1.2} /></span>
                    {location.visibility === "gm" ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                  <span className="location-card__body">
                    <span className="location-card__eyebrow">{location.kind} · {location.region}</span>
                    <strong>{location.name}</strong>
                    <span className="location-card__summary">{location.summary}</span>
                    <span className="location-card__chips">
                      {location.tags.map((tag, index) => <Chip key={tag} tone={index === 0 ? "success" : index === 2 ? "gold" : "neutral"}>{tag}</Chip>)}
                    </span>
                  </span>
                  <span className="location-card__footer">
                    <span>{location.status}</span>
                    <small>{location.distance}</small>
                    <ChevronRight size={17} strokeWidth={1.35} />
                  </span>
                </button>
              );
            })}
          </div>

          {!filteredLocations.length ? (
            <div className="locations-empty-state">
              <MapPin size={30} strokeWidth={1.2} />
              <strong>No matching locations</strong>
              <span>Adjust the filters or create a new archive location.</span>
            </div>
          ) : null}
        </Panel>

        <Panel
          eyebrow="Location detail"
          title={selected.name}
          className="location-inspector-panel"
          actions={<><IconButton label="View on map" icon={Map} onClick={() => navigate("/maps")} /><IconButton label="Open archive entry" icon={BookOpen} onClick={() => navigate("/entry")} /></>}
        >
          <div className="location-inspector">
            <div className={`location-inspector__art location-card__art--${selected.tone}`}>
              <span><SelectedIcon size={48} strokeWidth={1.15} /></span>
              <div>
                <Chip tone={selected.visibility === "gm" ? "warning" : "success"}>{selected.reveal}</Chip>
                <small>{selected.region}</small>
              </div>
            </div>

            <section className="location-inspector__intro">
              <p>{selected.summary}</p>
              <div className="location-inspector__facts">
                <span><MapPin size={15} />{selected.distance}</span>
                <span><CalendarDays size={15} />{selected.lastVisit}</span>
                <span><Shield size={15} />{selected.status}</span>
              </div>
            </section>

            <section className="location-inspector__section">
              <h3>Known Residents</h3>
              <div className="location-inspector__links">
                {selected.residents.map((resident) => (
                  <button type="button" key={resident} onClick={() => navigate("/npcs")}>
                    <Users size={16} strokeWidth={1.35} /><span>{resident}</span><ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </section>

            <section className="location-inspector__section">
              <h3>Connected Places</h3>
              <div className="location-route-list">
                {selected.connections.map((connection, index) => (
                  <button type="button" key={connection} onClick={() => setSelectedId(locations[(locations.findIndex((item) => item.id === selected.id) + index + 1) % locations.length].id)}>
                    <Route size={16} strokeWidth={1.35} />
                    <span>{connection}</span>
                    <small>{index + 2}h route</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="location-inspector__section">
              <h3>Linked Archive Entries</h3>
              <div className="location-inspector__links">
                {selected.entries.map((entry) => (
                  <button type="button" key={entry} onClick={() => navigate("/entry")}>
                    <BookOpen size={16} strokeWidth={1.35} /><span>{entry}</span><ChevronRight size={14} />
                  </button>
                ))}
              </div>
            </section>

            <section className="location-inspector__gm">
              <span><EyeOff size={16} />GM knowledge</span>
              <p>{selected.gmNote}</p>
            </section>

            <div className="location-inspector__actions">
              <Button variant="secondary" icon={Map} onClick={() => navigate("/maps")}>Show on Map</Button>
              <Button variant="secondary" icon={BookOpen} onClick={() => navigate("/entry")}>Open Full Entry</Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
