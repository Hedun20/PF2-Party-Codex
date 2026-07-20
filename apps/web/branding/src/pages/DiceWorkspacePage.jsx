import { useMemo, useState } from "react";
import { Clock3, Dices, Flame, History, Minus, Plus, RotateCcw, Shield, Sparkles, Swords } from "lucide-react";
import { Button, Chip, Field, PageHeader, Panel } from "../components/Ui.jsx";

const dieTypes = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

export default function DiceWorkspacePage() {
  const [pool, setPool] = useState({ 20: 1 });
  const [modifier, setModifier] = useState(7);
  const [history, setHistory] = useState([
    { label: "Perception check", total: 23, detail: "d20 16 + 7", tone: "success" },
    { label: "Longsword damage", total: 15, detail: "2d8 9 + 6", tone: "neutral" }
  ]);
  const [latest, setLatest] = useState({ total: 23, rolls: [{ sides: 20, value: 16 }], modifier: 7, label: "Perception check" });

  const notation = useMemo(() => {
    const dice = Object.entries(pool).filter(([, count]) => count > 0).map(([sides, count]) => `${count}d${sides}`).join(" + ");
    return `${dice || "No dice"}${modifier ? ` ${modifier > 0 ? "+" : "-"} ${Math.abs(modifier)}` : ""}`;
  }, [pool, modifier]);

  function changeDie(sides, delta) {
    setPool((current) => ({ ...current, [sides]: Math.max(0, Math.min(12, (current[sides] || 0) + delta)) }));
  }

  function roll(label = "Custom roll", dicePool = pool, rollModifier = modifier) {
    const rolls = [];
    let total = rollModifier;
    Object.entries(dicePool).forEach(([sides, count]) => {
      for (let index = 0; index < count; index += 1) {
        const value = rollDie(Number(sides));
        rolls.push({ sides: Number(sides), value });
        total += value;
      }
    });
    const detail = `${rolls.map((item) => `d${item.sides} ${item.value}`).join(" + ")}${rollModifier ? ` ${rollModifier > 0 ? "+" : "-"} ${Math.abs(rollModifier)}` : ""}`;
    setLatest({ total, rolls, modifier: rollModifier, label });
    setHistory((items) => [{ label, total, detail, tone: total >= 20 ? "success" : "neutral" }, ...items].slice(0, 8));
  }

  return (
    <div className="branding-page dice-page">
      <PageHeader
        eyebrow="Live session tool"
        title="Dice Workspace"
        description="Fast enough for the table, atmospheric enough for the campaign. The roll surface stays compact when the sidebar is collapsed and never hides the history or result explanation."
        actions={<><Button variant="secondary" icon={History}>Roll history</Button><Button icon={Dices} onClick={() => roll()}>Roll dice</Button></>}
      >
        <div className="sl-inline-chips"><Chip tone="success">Session live</Chip><Chip>Public rolls</Chip><Chip tone="gold">Silverleaf dice set</Chip></div>
      </PageHeader>

      <div className="dice-layout">
        <section className="dice-stage">
          <div className="dice-stage__atmosphere" aria-hidden="true"><span>✦</span><span>☾</span><span>✦</span></div>
          <div className="dice-result">
            <p className="sl-eyebrow">Latest result</p>
            <strong>{latest.total}</strong>
            <span>{latest.label}</span>
            <div className="dice-result__rolls">
              {latest.rolls.map((item, index) => <i key={`${item.sides}-${index}`}>d{item.sides}<b>{item.value}</b></i>)}
              {latest.modifier ? <i className="is-modifier">mod<b>{latest.modifier > 0 ? `+${latest.modifier}` : latest.modifier}</b></i> : null}
            </div>
          </div>
          <div className="dice-quick-actions">
            <button type="button" onClick={() => { setPool({ 20: 1 }); setModifier(7); roll("Perception check", { 20: 1 }, 7); }}><Sparkles size={18} /><span>Perception</span><b>+7</b></button>
            <button type="button" onClick={() => { setPool({ 20: 1 }); setModifier(8); roll("Attack roll", { 20: 1 }, 8); }}><Swords size={18} /><span>Attack</span><b>+8</b></button>
            <button type="button" onClick={() => { setPool({ 8: 2 }); setModifier(6); roll("Weapon damage", { 8: 2 }, 6); }}><Flame size={18} /><span>Damage</span><b>2d8+6</b></button>
            <button type="button" onClick={() => { setPool({ 20: 1 }); setModifier(15); roll("Fortitude save", { 20: 1 }, 15); }}><Shield size={18} /><span>Fortitude</span><b>+15</b></button>
          </div>
        </section>

        <aside className="dice-history">
          <Panel eyebrow="Session log" title="Recent rolls" actions={<button className="sl-text-button" type="button" onClick={() => setHistory([])}>Clear</button>}>
            <div className="dice-history__list">
              {history.length ? history.map((item, index) => (
                <article key={`${item.label}-${index}`}>
                  <span className={`dice-history__total is-${item.tone}`}>{item.total}</span>
                  <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                  <Clock3 size={15} aria-hidden="true" />
                </article>
              )) : <div className="sl-empty-compact"><Dices size={25} /><span>No rolls yet.</span></div>}
            </div>
          </Panel>
        </aside>
      </div>

      <div className="branding-grid branding-grid--2 dice-controls-grid">
        <Panel eyebrow="Build a roll" title="Dice pool">
          <div className="dice-pool">
            {dieTypes.map((sides) => (
              <article className={(pool[sides] || 0) > 0 ? "is-selected" : ""} key={sides}>
                <div className={`die-shape die-shape--${sides}`}><span>d{sides}</span></div>
                <div className="dice-counter">
                  <button type="button" aria-label={`Remove d${sides}`} onClick={() => changeDie(sides, -1)}><Minus size={14} /></button>
                  <strong>{pool[sides] || 0}</strong>
                  <button type="button" aria-label={`Add d${sides}`} onClick={() => changeDie(sides, 1)}><Plus size={14} /></button>
                </div>
              </article>
            ))}
          </div>
          <div className="dice-builder-footer">
            <Field label="Modifier"><input className="sl-input" type="number" value={modifier} onChange={(event) => setModifier(Number(event.target.value))} /></Field>
            <div className="dice-notation"><small>Notation</small><strong>{notation}</strong></div>
            <Button variant="ghost" icon={RotateCcw} onClick={() => { setPool({ 20: 1 }); setModifier(0); }}>Reset</Button>
            <Button icon={Dices} onClick={() => roll()}>Roll {notation}</Button>
          </div>
        </Panel>

        <Panel eyebrow="Roll settings" title="Visibility and presentation">
          <div className="component-stack">
            <Field label="Roll name"><input className="sl-input" defaultValue="Custom roll" /></Field>
            <Field label="Visibility"><select className="sl-input" defaultValue="party"><option value="party">Visible to party</option><option value="gm">GM only</option><option value="self">Only me</option></select></Field>
            <label className="sl-check-row"><input type="checkbox" defaultChecked /><span>Show dice animation</span></label>
            <label className="sl-check-row"><input type="checkbox" defaultChecked /><span>Explain calculation in history</span></label>
            <label className="sl-check-row"><input type="checkbox" /><span>Keep result on screen</span></label>
          </div>
        </Panel>
      </div>
    </div>
  );
}
