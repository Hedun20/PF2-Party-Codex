import { useEffect, useMemo, useRef, useState } from "react";
import { Dices, RotateCcw, Sparkles } from "lucide-react";

const quickDice = [20, 12, 10, 8, 6, 4];
const historyLimit = 20;

function randomInt(max) {
  return Math.floor(Math.random() * max) + 1;
}

function parseFormula(input = "") {
  const compact = String(input || "").replace(/\s+/g, "").toLowerCase();
  const match = compact.match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!match) return null;
  const count = Number(match[1] || 1);
  const sides = Number(match[2]);
  const modifier = Number(match[3] || 0);
  if (!Number.isInteger(count) || !Number.isInteger(sides)) return null;
  if (count < 1 || count > 50 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier, label: `${count}d${sides}${modifier ? `${modifier > 0 ? "+" : ""}${modifier}` : ""}` };
}

function rollFormula(input) {
  const parsed = parseFormula(input);
  if (!parsed) throw new Error("Формула должна быть вида 1d20+7 или 2d6+3.");
  const rolls = Array.from({ length: parsed.count }, () => randomInt(parsed.sides));
  const total = rolls.reduce((sum, value) => sum + value, 0) + parsed.modifier;
  const natural = parsed.count === 1 ? rolls[0] : null;
  return {
    ...parsed,
    id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    rolls,
    total,
    natural,
    createdAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}

function rollLabel(result) {
  const modifier = result.modifier ? ` ${result.modifier > 0 ? "+" : "-"} ${Math.abs(result.modifier)}` : "";
  return `${result.rolls.join(" + ")}${modifier}`;
}

function rollTone(result) {
  if (result.sides === 20 && result.natural === 20) return "critical";
  if (result.sides === 20 && result.natural === 1) return "fumble";
  return "normal";
}

function diceName(sides) {
  if ([4, 6, 8, 10, 12, 20, 100].includes(Number(sides))) return `d${sides}`;
  return "custom";
}

function DiceFace({ sides, value, large = false, rolling = false }) {
  const shape = diceName(sides);
  return (
    <div className={`dice-face dice-face--${shape} ${large ? "dice-face--large" : ""} ${rolling ? "dice-face--rolling" : ""}`}>
      <span>d{sides}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function RollCard({ result, latest = false, rolling = false }) {
  const tone = rollTone(result);
  return (
    <article className={`codex-card roll-history-card roll-history-card--${tone} ${latest ? "roll-history-card--latest" : ""} ${rolling ? "roll-history-card--rolling" : ""}`}>
      <DiceFace sides={result.sides} value={result.natural || result.total} large={latest} rolling={rolling} />
      <div className="roll-history-card-body">
        <span className="kicker">{latest ? "Последний бросок" : result.createdAt}</span>
        <h2>{result.label} = {result.total}</h2>
        <p>{rollLabel(result)}</p>
        {tone === "critical" ? <strong className="roll-badge">Natural 20</strong> : null}
        {tone === "fumble" ? <strong className="roll-badge roll-badge--danger">Natural 1</strong> : null}
      </div>
    </article>
  );
}

export default function DiceTrayPage() {
  const [formula, setFormula] = useState("1d20+7");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [rollingId, setRollingId] = useState("");
  const rollingTimer = useRef(null);

  const latest = history[0] || null;
  const parsedPreview = useMemo(() => parseFormula(formula), [formula]);

  useEffect(() => () => window.clearTimeout(rollingTimer.current), []);

  function triggerRollAnimation(id) {
    setRollingId(id);
    window.clearTimeout(rollingTimer.current);
    rollingTimer.current = window.setTimeout(() => setRollingId(""), 740);
  }

  function addRoll(input) {
    try {
      const result = rollFormula(input);
      setHistory((current) => [result, ...current].slice(0, historyLimit));
      triggerRollAnimation(result.id);
      setError("");
    } catch (rollError) {
      setError(rollError.message || "Не удалось бросить кубики.");
    }
  }

  function quickRoll(sides) {
    const nextFormula = `1d${sides}`;
    setFormula(nextFormula);
    addRoll(nextFormula);
  }

  return (
    <div className="page-stack dice-tray-page dice-tray-page-polished">
      <section className="hero-panel">
        <span className="kicker">Кубики</span>
        <h1>Dice Tray</h1>
        <p>Быстрый локальный бросок для playtest: d20, d12, d10, d8, d6, d4 и простые формулы вроде 1d20+7 или 2d6+3.</p>
      </section>

      <section className="builder-section quick-create-panel dice-roll-panel dice-roll-panel-v2">
        <div className="quick-create-copy">
          <span className="kicker">Быстрый бросок</span>
          <h2>{latest ? `${latest.label} = ${latest.total}` : "Выберите кубик"}</h2>
          <p>{latest ? `${rollLabel(latest)} · ${latest.createdAt}` : "История хранится только локально в браузере и не синхронизируется между игроками."}</p>
        </div>
        <div className="dice-quick-grid dice-quick-grid-v2">
          {quickDice.map((sides) => (
            <button key={sides} type="button" className="dice-quick-button" onClick={() => quickRoll(sides)} aria-label={`Бросить d${sides}`}>
              <DiceFace sides={sides} />
            </button>
          ))}
        </div>
      </section>

      {latest ? <RollCard key={latest.id} result={latest} latest rolling={latest.id === rollingId} /> : null}

      <section className="builder-section create-flow-section dice-formula-panel">
        <div className="visual-editor-section-head">
          <span className="kicker">Формула</span>
          <h2>Ручной бросок</h2>
          <p>Поддерживаются простые формулы: один тип кубика плюс модификатор. Например: 1d20+7, 2d6+3, d100.</p>
        </div>
        <div className="codex-field-grid dice-formula-grid">
          <label className="codex-field">Формула<input value={formula} onChange={(event) => setFormula(event.target.value)} placeholder="1d20+7" /></label>
          <label className="codex-field">Предпросмотр<input value={parsedPreview ? parsedPreview.label : "Неверная формула"} disabled /></label>
        </div>
        <div className="workspace-stats-row dice-action-row">
          <button type="button" className="codex-button codex-button--primary" onClick={() => addRoll(formula)}><Sparkles size={16} /> <span>Бросить</span></button>
          <button type="button" className="codex-button codex-button--ghost" onClick={() => { setHistory([]); setError(""); setRollingId(""); }}><RotateCcw size={16} /> <span>Очистить историю</span></button>
        </div>
        {error ? <p className="save-message">{error}</p> : null}
      </section>

      <section className="roll-history-section roll-history-section-v2">
        <div className="roll-history-title-row">
          <div>
            <span className="kicker">История бросков</span>
            <h2><Dices size={20} /> Последние броски</h2>
          </div>
          <span>{history.length}/{historyLimit}</span>
        </div>
        {history.length ? (
          <div className="roll-history-grid roll-history-grid-v2">
            {history.map((item) => <RollCard key={item.id} result={item} />)}
          </div>
        ) : (
          <article className="codex-card workspace-status-card"><p>Бросков пока нет. Нажмите d20 или введите формулу.</p></article>
        )}
      </section>
    </div>
  );
}
