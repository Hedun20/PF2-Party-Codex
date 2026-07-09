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
  return { ...parsed, rolls, total, createdAt: new Date().toLocaleTimeString() };
}

function rollLabel(result) {
  const modifier = result.modifier ? ` ${result.modifier > 0 ? "+" : "-"} ${Math.abs(result.modifier)}` : "";
  return `${result.rolls.join(" + ")}${modifier}`;
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

      <section className="builder-section quick-create-panel">
        <div className="quick-create-copy">
          <span className="kicker">Быстрый бросок</span>
          <h2>{latest ? `${latest.label} = ${latest.total}` : "Выберите кубик"}</h2>
          <p>{latest ? `${rollLabel(latest)} · ${latest.createdAt}` : "История хранится только локально в браузере и не синхронизируется между игроками."}</p>
        </div>
        <div className="type-grid compact-type-grid">
          {quickDice.map((sides) => (
            <button key={sides} type="button" className="type-chip" onClick={() => quickRoll(sides)}>
              <Dices size={17} /> d{sides}
            </button>
          ))}
        </div>
      </section>

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

      <section className="codex-card workspace-status-card">
        <span className="kicker">История бросков</span>
        {history.length ? (
          <ul>
            {history.map((item, index) => (
              <li key={`${item.createdAt}-${index}`}>
                <strong>{item.label} = {item.total}</strong> · {rollLabel(item)} · {item.createdAt}
              </li>
            ))}
          </ul>
        ) : (
          <p>Бросков пока нет. Нажмите d20 или введите формулу.</p>
        )}
      </section>
    </div>
  );
}
