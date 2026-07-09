import { useMemo, useState } from "react";
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
  return { ...parsed, rolls, total, natural, createdAt: new Date().toLocaleTimeString() };
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

function DiceFace({ sides, value, large = false }) {
  return (
    <div className={`dice-face dice-face--d${sides} ${large ? "dice-face--large" : ""}`}>
      <span>d{sides}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function RollCard({ result, latest = false }) {
  const tone = rollTone(result);
  return (
    <article className={`codex-card roll-history-card roll-history-card--${tone} ${latest ? "roll-history-card--latest" : ""}`}>
      <DiceFace sides={result.sides} value={result.natural || result.total} large={latest} />
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

  const latest = history[0] || null;
  const parsedPreview = useMemo(() => parseFormula(formula), [formula]);

  function addRoll(input) {
    try {
      const result = rollFormula(input);
      setHistory((current) => [result, ...current].slice(0, historyLimit));
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
    <div className="page-stack dice-tray-page">
      <section className="hero-panel">
        <span className="kicker">Кубики</span>
        <h1>Dice Tray</h1>
        <p>Быстрый локальный бросок для playtest: d20, d12, d10, d8, d6, d4 и простые формулы вроде 1d20+7 или 2d6+3.</p>
      </section>

      <section className="builder-section quick-create-panel dice-roll-panel">
        <div className="quick-create-copy">
          <span className="kicker">Быстрый бросок</span>
          <h2>{latest ? `${latest.label} = ${latest.total}` : "Выберите кубик"}</h2>
          <p>{latest ? `${rollLabel(latest)} · ${latest.createdAt}` : "История хранится только локально в браузере и не синхронизируется между игроками."}</p>
        </div>
        <div className="dice-quick-grid">
          {quickDice.map((sides) => (
            <button key={sides} type="button" className="dice-quick-button" onClick={() => quickRoll(sides)}>
              <DiceFace sides={sides} />
            </button>
          ))}
        </div>
      </section>

      {latest ? <RollCard result={latest} latest /> : null}

      <section className="builder-section create-flow-section">
        <div className="visual-editor-section-head">
          <span className="kicker">Формула</span>
          <h2>Ручной бросок</h2>
          <p>Поддерживаются простые формулы: один тип кубика плюс модификатор. Например: 1d20+7, 2d6+3, d100.</p>
        </div>
        <div className="codex-field-grid codex-field-grid--four">
          <label className="codex-field">Формула<input value={formula} onChange={(event) => setFormula(event.target.value)} placeholder="1d20+7" /></label>
          <label className="codex-field">Предпросмотр<input value={parsedPreview ? parsedPreview.label : "Неверная формула"} disabled /></label>
        </div>
        <div className="workspace-stats-row">
          <button type="button" className="codex-button codex-button--primary" onClick={() => addRoll(formula)}><Sparkles size={16} /> Бросить</button>
          <button type="button" className="codex-button codex-button--ghost" onClick={() => { setHistory([]); setError(""); }}><RotateCcw size={16} /> Очистить историю</button>
        </div>
        {error ? <p className="save-message">{error}</p> : null}
      </section>

      <section className="roll-history-section">
        <span className="kicker">История бросков</span>
        {history.length ? (
          <div className="roll-history-grid">
            {history.map((item, index) => <RollCard key={`${item.createdAt}-${index}`} result={item} />)}
          </div>
        ) : (
          <article className="codex-card workspace-status-card"><p>Бросков пока нет. Нажмите d20 или введите формулу.</p></article>
        )}
      </section>
    </div>
  );
}
