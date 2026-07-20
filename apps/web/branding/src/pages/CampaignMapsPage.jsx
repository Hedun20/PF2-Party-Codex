import { useMemo, useState } from "react";
import {
  Castle,
  Compass,
  Eye,
  Layers3,
  LockKeyhole,
  Map,
  MapPin,
  Maximize2,
  Mountain,
  MoreHorizontal,
  Plus,
  Route,
  Search,
  Shield,
  Sparkles,
  Trees,
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
    id: "conclave",
    name: "Silverleaf Conclave",
    type: "Capital",
    x: 48,
    y: 42,
    icon: Castle,
    tone: "gold",
    visibility: "Revealed",
    region: "Heartwood",
    population: "18,400",
    summary: "Moonlit seat of the five courts and the public face of the Royal Archive.",
    related: ["Lirael Moonwhisper", "The Moonlight Concord", "Hall of Seven Branches"]
  },
  {
    id: "vale",
    name: "Whispering Vale",
    type: "Ancient Forest",
    x: 30,
    y: 58,
    icon: Trees,
    tone: "emerald",
    visibility: "Public",
    region: "Western Green",
    population: "Scattered enclaves",
    summary: "A living forest whose paths remember every oath spoken beneath the silver canopy.",
    related: ["The First Song", "Moon-singer Circles", "Old Road West"]
  },
  {
    id: "elderspire",
    name: "Elderspire Sanctum",
    type: "Archive Sanctuary",
    x: 65,
    y: 29,
    icon: Shield,
    tone: "moon",
    visibility: "Revealed",
    region: "Northern Heights",
    population: "420 wardens",
    summary: "Fortified sanctuary where living records are guarded by the last Sentinel bloodlines.",
    related: ["Sentinel Order", "Commander Aerendyl", "Seventh Vault"]
  },
  {
    id: "cinder",
    name: "Cinderstar Expanse",
    type: "Ruined March",
    x: 76,
    y: 64,
    icon: Mountain,
    tone: "ember",
    visibility: "Hidden",
    region: "Eastern Marches",
    population: "Unknown",
    summary: "Glassed woodland and broken fortresses left behind by the War of Cinder Stars.",
    related: ["Ashen Host", "Cinderstar War", "Buried Gate"]
  },
  {
    id: "vaelorian",
    name: "Vaelorian Refuge",
    type: "Secret Settlement",
    x: 17,
    y: 24,
    icon: LockKeyhole,
    tone: "violet",
    visibility: "GM Only",
    region: "Beyond the North Gate",
    population: "Unknown",
    summary: "A hidden refuge omitted from every player-facing map and official archive index.",
    related: ["House Vaelorian", "Lost Heir", "True-name Ledgers"]
  }
];

const mapLayers = [
  { id: "political", label: "Political Borders" },
  { id: "roads", label: "Roads & Routes" },
  { id: "secrets", label: "GM Secrets" },
  { id: "labels", label: "Location Labels" }
];

export default function CampaignMapsPage() {
  const [selectedId, setSelectedId] = useState("conclave");
  const [query, setQuery] = useState("");
  const [activeLayers, setActiveLayers] = useState(["roads", "labels", "secrets"]);
  const [zoom, setZoom] = useState(100);

  const selected = locations.find((location) => location.id === selectedId) || locations[0];
  const SelectedIcon = selected.icon;

  const visibleLocations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return locations.filter((location) => {
      const matchesQuery = !normalized || `${location.name} ${location.type} ${location.region}`.toLowerCase().includes(normalized);
      const canShowSecret = activeLayers.includes("secrets") || location.visibility !== "GM Only";
      return matchesQuery && canShowSecret;
    });
  }, [activeLayers, query]);

  const toggleLayer = (layerId) => {
    setActiveLayers((current) => current.includes(layerId) ? current.filter((item) => item !== layerId) : [...current, layerId]);
  };

  return (
    <div className="maps-page">
      <section className="maps-hero">
        <div className="maps-hero__copy">
          <p className="sl-eyebrow">The Lost Sentinel · Cartographic archive</p>
          <h1>Campaign Maps</h1>
          <p>Explore regions, routes, landmarks and secrets without separating maps from the living Campaign Archive.</p>
          <div className="maps-hero__actions">
            <Button icon={Plus}>Create New Map</Button>
            <Button variant="secondary" icon={Eye}>Preview as Player</Button>
          </div>
        </div>
        <div className="maps-hero__compass" aria-hidden="true">
          <span className="maps-hero__compass-ring" />
          <Compass size={44} strokeWidth={1.1} />
          <strong>Silverleaf Vale</strong>
          <small>Royal survey · 846 AR</small>
        </div>
      </section>

      <div className="branding-grid branding-grid--stats maps-stats">
        <Stat icon={Map} value="12" label="Campaign maps" hint="3 player-visible" />
        <Stat icon={MapPin} value="47" label="Mapped locations" hint="8 newly revealed" />
        <Stat icon={Route} value="9" label="Known routes" hint="2 currently blocked" />
        <Stat icon={LockKeyhole} value="14" label="Secret markers" hint="GM-only layer" />
      </div>

      <div className="maps-layout">
        <Panel eyebrow="Active map" title="Silverleaf Vale" className="maps-canvas-panel" actions={<><IconButton label="Fullscreen map" icon={Maximize2} /><IconButton label="Map actions" icon={MoreHorizontal} /></>}>
          <div className="maps-toolbar">
            <TextInput icon={Search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search mapped locations..." aria-label="Search map" />
            <SelectInput defaultValue="silverleaf" aria-label="Active campaign map">
              <option value="silverleaf">Silverleaf Vale</option>
              <option value="conclave">Silverleaf Conclave</option>
              <option value="cinder">Cinderstar Expanse</option>
            </SelectInput>
            <SelectInput defaultValue="gm" aria-label="Map visibility mode">
              <option value="gm">GM View</option>
              <option value="player">Player View</option>
              <option value="projector">Projector View</option>
            </SelectInput>
          </div>

          <div className="maps-layerbar">
            <span><Layers3 size={17} strokeWidth={1.35} />Map Layers</span>
            <div>
              {mapLayers.map((layer) => (
                <button key={layer.id} type="button" className={activeLayers.includes(layer.id) ? "is-active" : ""} onClick={() => toggleLayer(layer.id)}>
                  <i aria-hidden="true" />{layer.label}
                </button>
              ))}
            </div>
          </div>

          <div className="maps-stage-shell">
            <div className={`maps-stage${activeLayers.includes("political") ? " has-political" : ""}${activeLayers.includes("roads") ? " has-roads" : ""}`} style={{ "--map-zoom": zoom / 100 }}>
              <span className="maps-stage__moon" aria-hidden="true" />
              <span className="maps-stage__river maps-stage__river--one" aria-hidden="true" />
              <span className="maps-stage__river maps-stage__river--two" aria-hidden="true" />
              <span className="maps-stage__road maps-stage__road--one" aria-hidden="true" />
              <span className="maps-stage__road maps-stage__road--two" aria-hidden="true" />
              <span className="maps-stage__border" aria-hidden="true" />

              {visibleLocations.map((location) => {
                const LocationIcon = location.icon;
                return (
                  <button
                    key={location.id}
                    type="button"
                    className={`map-marker map-marker--${location.tone}${selectedId === location.id ? " is-selected" : ""}${location.visibility === "GM Only" ? " is-secret" : ""}`}
                    style={{ left: `${location.x}%`, top: `${location.y}%` }}
                    onClick={() => setSelectedId(location.id)}
                    aria-label={`Open ${location.name}`}
                  >
                    <span><LocationIcon size={20} strokeWidth={1.3} /></span>
                    {activeLayers.includes("labels") ? <strong>{location.name}</strong> : null}
                  </button>
                );
              })}

              <div className="maps-stage__rose" aria-hidden="true"><Compass size={32} strokeWidth={1.05} /><small>N</small></div>
            </div>

            <div className="maps-stage__controls">
              <button type="button" onClick={() => setZoom((value) => Math.min(140, value + 10))}>+</button>
              <span>{zoom}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))}>−</button>
            </div>

            <div className="maps-legend">
              <span><i className="is-public" />Public</span>
              <span><i className="is-revealed" />Revealed</span>
              <span><i className="is-secret" />GM Secret</span>
              <small>{visibleLocations.length} markers visible</small>
            </div>
          </div>
        </Panel>

        <Panel eyebrow="Selected location" title={selected.name} className="maps-inspector" actions={<><IconButton label="Preview location" icon={Eye} /><IconButton label="Location actions" icon={MoreHorizontal} /></>}>
          <div className="maps-inspector__body">
            <div className={`maps-inspector__art map-marker--${selected.tone}`}>
              <span><SelectedIcon size={46} strokeWidth={1.15} /></span>
              <strong>{selected.type}</strong>
              <small>{selected.region}</small>
            </div>

            <div className="maps-inspector__summary">
              <Chip tone={selected.visibility === "GM Only" ? "danger" : selected.visibility === "Revealed" ? "success" : "neutral"}>{selected.visibility}</Chip>
              <p>{selected.summary}</p>
            </div>

            <section className="maps-inspector__section">
              <h3>Location Record</h3>
              <dl>
                <div><dt><MapPin size={15} />Region</dt><dd>{selected.region}</dd></div>
                <div><dt><Users size={15} />Population</dt><dd>{selected.population}</dd></div>
                <div><dt><Sparkles size={15} />Map layer</dt><dd>{selected.visibility === "GM Only" ? "GM Secrets" : "Locations"}</dd></div>
              </dl>
            </section>

            <section className="maps-inspector__section">
              <h3>Related Archive Entries</h3>
              <div className="maps-inspector__relations">
                {selected.related.map((item, index) => (
                  <button key={item} type="button"><span>{index + 1}</span><strong>{item}</strong><small>{index === 0 ? "Primary relation" : "Linked record"}</small></button>
                ))}
              </div>
            </section>

            {selected.visibility === "GM Only" || selected.visibility === "Hidden" ? (
              <section className="maps-inspector__secret">
                <div><LockKeyhole size={17} strokeWidth={1.35} /><h3>Hidden from players</h3></div>
                <p>This marker and its coordinates are removed from player-safe map responses.</p>
              </section>
            ) : null}

            <div className="maps-inspector__actions">
              <Button variant="secondary" icon={MapPin}>Edit Marker</Button>
              <Button variant="secondary" icon={Eye}>Reveal Location</Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
