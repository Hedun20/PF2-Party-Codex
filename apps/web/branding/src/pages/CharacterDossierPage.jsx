import { useState } from "react";
import {
  Activity,
  BookMarked,
  Brain,
  ChevronRight,
  CircleGauge,
  Footprints,
  HeartPulse,
  Shield,
  Sparkles,
  Star,
  Sword,
  Target,
  UserRound
} from "lucide-react";
import { Button, Chip, PageHeader, Panel, Stat } from "../components/Ui.jsx";

const tabs = ["Overview", "Combat", "Abilities", "Inventory", "Notes"];

const attacks = [
  { name: "Moonsteel Longsword", bonus: "+18", damage: "2d8+6 slashing", trait: "Versatile" },
  { name: "Silverleaf Bow", bonus: "+16", damage: "2d6+4 piercing", trait: "Deadly d10" }
];

export default function CharacterDossierPage() {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="branding-page character-page">
      <PageHeader
        eyebrow="Player-facing character experience"
        title="Lirael Moonwhisper"
        description="Premium dossier first, rules reference second. The character remains readable at the table and still feels like part of the campaign archive."
        actions={<><Button variant="secondary">Preview as player</Button><Button>Edit character</Button></>}
      >
        <div className="sl-inline-chips"><Chip tone="success">Assigned</Chip><Chip>Elf</Chip><Chip>Ranger 7</Chip><Chip tone="gold">Silverleaf Council</Chip></div>
      </PageHeader>

      <section className="character-hero">
        <div className="character-portrait" aria-label="Character portrait placeholder">
          <div className="character-portrait__halo" />
          <UserRound size={116} aria-hidden="true" />
          <span className="character-portrait__badge"><Star size={17} /> Hero of the Vale</span>
        </div>
        <div className="character-hero__content">
          <p className="sl-eyebrow">Elf · Ancient-blooded · Ranger</p>
          <h2>Keeper of forgotten paths</h2>
          <p>Lirael moves between the living forest and the oldest records of Silverleaf. She is calm in counsel, relentless in pursuit, and deeply tied to the fate of the Vale.</p>
          <div className="character-hero__identity">
            <div><small>Player</small><strong>Alina</strong></div>
            <div><small>Level</small><strong>7</strong></div>
            <div><small>Background</small><strong>Archive Warden</strong></div>
            <div><small>Heritage</small><strong>Ancient Elf</strong></div>
          </div>
        </div>
        <div className="character-hero__crest" aria-hidden="true"><Sparkles size={34} /><span>Silverleaf</span></div>
      </section>

      <div className="branding-grid branding-grid--stats character-vitals">
        <Stat icon={HeartPulse} value="86 / 86" label="Hit points" hint="Healthy" />
        <Stat icon={Shield} value="26" label="Armor class" hint="Raised shield 28" />
        <Stat icon={Footprints} value="35 ft" label="Speed" hint="Woodland stride" />
        <Stat icon={CircleGauge} value="+16" label="Perception" hint="Master" />
      </div>

      <div className="character-tabs" role="tablist" aria-label="Character dossier sections">
        {tabs.map((tab) => <button key={tab} type="button" className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </div>

      <div className="character-layout">
        <div className="character-layout__main">
          <Panel eyebrow="Table play" title="Core checks and defenses">
            <div className="save-grid">
              <div><Shield size={19} /><span>Fortitude</span><strong>+15</strong><small>Expert</small></div>
              <div><Target size={19} /><span>Reflex</span><strong>+18</strong><small>Master</small></div>
              <div><Brain size={19} /><span>Will</span><strong>+14</strong><small>Expert</small></div>
              <div><Activity size={19} /><span>Initiative</span><strong>+16</strong><small>Perception</small></div>
            </div>
          </Panel>

          <Panel eyebrow="Actions" title={activeTab === "Combat" ? "Combat actions" : "Signature actions"}>
            <div className="action-list">
              {attacks.map((attack) => (
                <article className="action-row" key={attack.name}>
                  <span className="action-row__icon"><Sword size={20} /></span>
                  <div><strong>{attack.name}</strong><span>{attack.trait}</span></div>
                  <b>{attack.bonus}</b>
                  <em>{attack.damage}</em>
                  <ChevronRight size={17} aria-hidden="true" />
                </article>
              ))}
              <article className="action-row is-featured">
                <span className="action-row__icon"><Sparkles size={20} /></span>
                <div><strong>Moonlit Pursuit</strong><span>Focus · Exploration</span></div>
                <b>1 Focus</b>
                <em>Stride, Seek, mark quarry</em>
                <ChevronRight size={17} aria-hidden="true" />
              </article>
            </div>
          </Panel>

          <div className="branding-grid branding-grid--2">
            <Panel eyebrow="Skills" title="Most used at the table">
              <div className="skill-list">
                {[["Survival", "+18"], ["Nature", "+16"], ["Stealth", "+17"], ["Diplomacy", "+13"], ["Lore: Silverleaf", "+19"]].map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}
              </div>
            </Panel>
            <Panel eyebrow="Resources" title="Tracked conditions">
              <div className="resource-list">
                <div><span>Hero points</span><b>● ● ○</b></div>
                <div><span>Focus points</span><b>● ● ○</b></div>
                <div><span>Arrows</span><b>18</b></div>
                <div><span>Healing draughts</span><b>3</b></div>
              </div>
            </Panel>
          </div>
        </div>

        <aside className="character-layout__rail">
          <Panel eyebrow="Reference" title="Ancestry and class">
            <div className="reference-list">
              <button type="button"><BookMarked size={17} /><span><strong>Elven Instincts</strong><small>+2 circumstance to initiative</small></span><ChevronRight size={15} /></button>
              <button type="button"><Sparkles size={17} /><span><strong>Hunter's Edge</strong><small>Precision</small></span><ChevronRight size={15} /></button>
              <button type="button"><Target size={17} /><span><strong>Hunt Prey</strong><small>Single action</small></span><ChevronRight size={15} /></button>
            </div>
          </Panel>
          <Panel eyebrow="Campaign links" title="Known connections">
            <div className="connection-list">
              <div><span className="connection-avatar">TS</span><span><strong>The Lost Sentinel</strong><small>Trusted ally</small></span><Chip tone="success">Party</Chip></div>
              <div><span className="connection-avatar">SC</span><span><strong>Silverleaf Council</strong><small>Duty-bound</small></span><Chip>Faction</Chip></div>
              <div><span className="connection-avatar">OV</span><span><strong>Obsidian Veil</strong><small>Distrust</small></span><Chip tone="danger">Rival</Chip></div>
            </div>
          </Panel>
          <Panel eyebrow="Private notes" title="Player journal">
            <p className="character-note">The seal beneath the old grove carries the same symbol as the locket. I should ask the Loremaster before the next session.</p>
            <Button size="sm" variant="secondary">Open all notes</Button>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
