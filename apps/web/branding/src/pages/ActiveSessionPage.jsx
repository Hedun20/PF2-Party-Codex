import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  CirclePlay,
  Clock3,
  Dices,
  Eye,
  EyeOff,
  Flame,
  Hand,
  Headphones,
  Map,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users
} from "lucide-react";
import {
  Button,
  Chip,
  IconButton,
  Panel,
  SelectInput,
  TextareaInput
} from "../components/Ui.jsx";

const scenes = [
  { id: "conclave", title: "The Moonlight Conclave", type: "Roleplay", status: "live", icon: Sparkles },
  { id: "bridge", title: "Ambush at Glassroot Bridge", type: "Encounter", status: "ready", icon: Swords },
  { id: "sanctum", title: "Elderspire Sanctum", type: "Exploration", status: "hidden", icon: Map }
];

const initiative = [
  { name: "Lirael Moonwhisper", role: "Ally", value: 27, hp: "122 / 122", tone: "success" },
  { name: "Ser Caldris", role: "Player", value: 24, hp: "89 / 104", tone: "gold" },
  { name: "Vale Warden", role: "Enemy", value: 21, hp: "74 / 96", tone: "danger" },
  { name: "Ilyan", role: "Player", value: 18, hp: "67 / 82", tone: "neutral" }
];

export default function ActiveSessionPage() {
  const [selectedScene, setSelectedScene] = useState("conclave");
  const [running, setRunning] = useState(true);
  const [round, setRound] = useState(3);
  const [playerView, setPlayerView] = useState(true);
  const scene = useMemo(() => scenes.find((item) => item.id === selectedScene) || scenes[0], [selectedScene]);

  return (
    <div className="session-page">
      <section className="session-hero">
        <div>
          <p className="sl-eyebrow">The Lost Sentinel · live campaign control</p>
          <h1>Active Session</h1>
          <p>Run the table from one focused workspace. Scenes, initiative, notes, reveals and atmosphere remain synchronized without leaving the session.</p>
          <div className="session-hero__actions">
            <Button icon={running ? Pause : Play} onClick={() => setRunning((value) => !value)}>{running ? "Pause Session" : "Resume Session"}</Button>
            <Button variant="secondary" icon={playerView ? Eye : EyeOff} onClick={() => setPlayerView((value) => !value)}>{playerView ? "Player View Live" : "Player View Hidden"}</Button>
          </div>
        </div>
        <div className="session-hero__status">
          <span className={`session-live${running ? " is-live" : ""}`}><Radio size={17} />{running ? "LIVE" : "PAUSED"}</span>
          <strong>Session 12</strong>
          <small>Moonlight Concord</small>
          <div><Clock3 size={15} /> 02:48:16</div>
        </div>
      </section>

      <div className="session-layout">
        <Panel eyebrow="Session flow" title="Scenes" className="session-scenes">
          <div className="session-scene-list">
            {scenes.map(({ id, title, type, status, icon: Icon }) => (
              <button key={id} type="button" className={`session-scene${selectedScene === id ? " is-active" : ""}`} onClick={() => setSelectedScene(id)}>
                <span><Icon size={20} /></span>
                <div><strong>{title}</strong><small>{type}</small></div>
                <Chip tone={status === "live" ? "success" : status === "hidden" ? "warning" : "neutral"}>{status}</Chip>
              </button>
            ))}
          </div>
          <Button variant="secondary" icon={Plus}>Add Scene</Button>
        </Panel>

        <main className="session-stage">
          <section className="session-stage__visual">
            <span className="session-stage__moon" />
            <span className="session-stage__arch" />
            <div className="session-stage__copy">
              <Chip tone="success">{scene.type}</Chip>
              <h2>{scene.title}</h2>
              <p>The silver leaves stir above the conclave as every oath-bearer turns toward the sealed doors.</p>
            </div>
            <div className="session-stage__tools">
              <IconButton label="Reveal scene" icon={Eye} active={playerView} />
              <IconButton label="Scene audio" icon={Headphones} active />
              <IconButton label="More scene actions" icon={MoreHorizontal} />
            </div>
          </section>

          <div className="session-stage__grid">
            <Panel eyebrow="Encounter" title="Initiative Tracker" className="session-initiative" actions={<div className="session-round"><button onClick={() => setRound((value) => Math.max(1, value - 1))}>−</button><span>Round {round}</span><button onClick={() => setRound((value) => value + 1)}>+</button></div>}>
              <div className="initiative-list">
                {initiative.map((item, index) => (
                  <button key={item.name} type="button" className={`initiative-row${index === 0 ? " is-current" : ""}`}>
                    <span className="initiative-row__order">{item.value}</span>
                    <span className="initiative-row__avatar"><Shield size={17} /></span>
                    <span className="initiative-row__copy"><strong>{item.name}</strong><small>{item.role} · HP {item.hp}</small></span>
                    <Chip tone={item.tone}>{index === 0 ? "Current" : "Waiting"}</Chip>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="GM workspace" title="Session Notes" className="session-notes">
              <TextareaInput defaultValue="The conclave will fracture if Caldris reveals the oath shard before Lirael finishes the rite. Prepare the warden ambush if negotiations collapse." aria-label="Session notes" />
              <div className="session-note-actions"><Button size="sm" variant="secondary" icon={BookOpen}>Open Journal</Button><Button size="sm" variant="secondary" icon={ScrollText}>Save Note</Button></div>
            </Panel>
          </div>
        </main>

        <aside className="session-tools">
          <Panel eyebrow="Table control" title="Quick Actions">
            <div className="session-action-grid">
              <button><Dices size={20} /><span>Quick Roll</span><small>d20 + modifier</small></button>
              <button><Hand size={20} /><span>Send Handout</span><small>Reveal to players</small></button>
              <button><Flame size={20} /><span>World Atmosphere</span><small>Moonlit Sanctuary</small></button>
              <button><Users size={20} /><span>Party View</span><small>7 connected</small></button>
            </div>
          </Panel>

          <Panel eyebrow="Atmosphere" title="Now Playing">
            <div className="session-now-playing">
              <span><Headphones size={24} /></span>
              <div><strong>Whispers of Silverleaf</strong><small>World sound · 42%</small></div>
              <IconButton label="Pause atmosphere" icon={Pause} active />
            </div>
            <input className="session-volume" type="range" min="0" max="100" defaultValue="42" aria-label="Atmosphere volume" />
            <SelectInput defaultValue="world" aria-label="Atmosphere source"><option value="world">World Atmosphere</option><option value="scene">Scene Audio</option><option value="none">No Audio</option></SelectInput>
          </Panel>

          <Panel eyebrow="Players" title="Connection Status">
            <div className="session-players">
              {["Ser Caldris", "Ilyan", "Mara", "Thorne"].map((name, index) => <div key={name}><span className={index < 3 ? "is-online" : ""} /><strong>{name}</strong><small>{index < 3 ? "Connected" : "Away"}</small></div>)}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
