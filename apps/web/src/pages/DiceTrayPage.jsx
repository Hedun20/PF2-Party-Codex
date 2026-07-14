import { useEffect, useMemo, useRef, useState } from "react";
import { Dices, RotateCcw, Sparkles } from "lucide-react";
import DiceIcon from "../components/DiceIcon.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";

const quickDice = [4, 6, 8, 10, 12, 20, 100];
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

function formatFormula({ count, sides, modifier }) {
  return `${count}d${sides}${modifier ? `${modifier > 0 ? "+" : ""}${modifier}` : ""}`;
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
  if (quickDice.includes(Number(sides))) return `d${sides}`;
  return "custom";
}

function modifierLabel(modifier) {
  if (!modifier) return "Без модификатора";
  return `${modifier > 0 ? "+" : ""}${modifier}`;
}

function DiceFace({ sides, value, large = false, rolling = false }) {
  const shape = diceName(sides);
  const hasValue = value !== null && value !== undefined;
  return (
    <div className={`dice-face dice-face--${shape} ${large ? "dice-face--large" : ""} ${rolling ? "dice-face--rolling" : ""}`} aria-hidden="true">
      {shape === "custom" ? <Dices className="dice-face__icon" size={large ? 48 : 40} /> : <DiceIcon className="dice-face__icon" sides={sides} size={large ? 52 : 42} />}
      <span className="dice-face__type">d{sides}</span>
      {hasValue ? <strong className="dice-face__value">{value}</strong> : null}
    </div>
  );
}

function RollCard({ result, latest = false, rolling = false }) {
  const tone = rollTone(result);
  return (
    <article className={`codex-card roll-history-card roll-history-card--${tone} ${latest ? "roll-history-card--latest" : ""} ${rolling ? "roll-history-card--rolling" : ""}`} aria-label={`${result.label}: результат ${result.total}`}>
      <DiceFace sides={result.sides} value={result.natural ?? result.total} large={latest} rolling={rolling} />
      <div className="roll-history-card-body">
        <span className="kicker">{latest ? "Последний бросок" : result.createdAt}</span>
        <h3 className="roll-history-card__title">{result.label} = {result.total}</h3>
        <p className="roll-history-card__breakdown">{rollLabel(result)}</p>
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

  function selectDie(sides) {
    const current = parsedPreview || { count: 1, modifier: 0 };
    setFormula(formatFormula({ count: current.count, sides, modifier: current.modifier }));
    setError("");
  }

  function clearHistory() {
    setHistory([]);
    setError("");
    setRollingId("");
  }

  return (
    <div className="page-stack dice-tray-page dice-tray-page-polished">
      <section className="hero-panel">
        <span className="kicker">Кубики</span>
        <h1>Dice Tray</h1>
        <p>Выберите тип кубика, настройте формулу и выполните локальный бросок. История хранится только в этом браузере.</p>
      </section>

      <section className="builder-section create-flow-section dice-formula-panel" aria-labelledby="dice-config-title">
        <div className="visual-editor-section-head dice-config-head">
          <span className="kicker">Настройка броска</span>
          <h2 id="dice-config-title">Выберите кубик</h2>
          <p id="dice-picker-help">Выбор кубика меняет тип в формуле, но не выполняет бросок.</p>
        </div>

        <form className="dice-roll-form" onSubmit={(event) => { event.preventDefault(); addRoll(formula); }} noValidate>
          <fieldset className="dice-picker" aria-describedby="dice-picker-help">
            <legend className="dice-picker__legend">Тип кубика</legend>
            <div className="dice-quick-grid">
              {quickDice.map((sides) => {
                const selected = parsedPreview?.sides === sides;
                return (
                  <button
                    key={sides}
                    type="button"
                    className={`dice-quick-button ${selected ? "dice-quick-button--selected" : ""}`}
                    onClick={() => selectDie(sides)}
                    aria-label={`Выбрать кубик d${sides}`}
                    aria-pressed={selected}
                  >
                    <DiceFace sides={sides} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <dl className="dice-selection-summary" aria-label="Параметры выбранного броска">
            <div className="dice-selection-stat dice-selection-stat--type">
              <dt>Выбранный кубик</dt>
              <dd>{parsedPreview ? `d${parsedPreview.sides}` : "Не выбран"}</dd>
            </div>
            <div className="dice-selection-stat dice-selection-stat--count">
              <dt>Количество</dt>
              <dd>{parsedPreview ? parsedPreview.count : "Не задано"}</dd>
            </div>
            <div className="dice-selection-stat dice-selection-stat--modifier">
              <dt>Модификатор</dt>
              <dd>{parsedPreview ? modifierLabel(parsedPreview.modifier) : "Не задан"}</dd>
            </div>
          </dl>

          <div className="codex-field-grid dice-formula-grid">
            <label className="codex-field" htmlFor="dice-formula-input">
              Формула
              <input
                id="dice-formula-input"
                value={formula}
                onChange={(event) => { setFormula(event.target.value); setError(""); }}
                placeholder="1d20+7"
                autoComplete="off"
                spellCheck="false"
                aria-invalid={!parsedPreview}
                aria-describedby="dice-formula-help"
              />
            </label>
          </div>
          <p id="dice-formula-help" className={`dice-formula-help ${parsedPreview ? "" : "dice-formula-help--invalid"}`}>
            {parsedPreview ? `Готово к броску: ${parsedPreview.label}.` : "Используйте формат 1d20+7, 2d6+3 или d100."}
          </p>

          <div className="workspace-stats-row dice-action-row">
            <CodexButton type="submit" disabled={!parsedPreview} aria-describedby="dice-formula-help">
              <Sparkles size={16} aria-hidden="true" /> <span>Бросить</span>
            </CodexButton>
            <CodexButton type="button" variant="ghost" onClick={clearHistory} disabled={!history.length}>
              <RotateCcw size={16} aria-hidden="true" /> <span>Очистить историю</span>
            </CodexButton>
          </div>
          {error ? <p className="save-message dice-roll-error" role="alert">{error}</p> : null}
        </form>
      </section>

      <section className="dice-result-section" aria-labelledby="dice-result-title">
        <div className="roll-history-title-row dice-result-title-row">
          <div>
            <span className="kicker">Результат</span>
            <h2 id="dice-result-title">Последний бросок</h2>
          </div>
        </div>
        <div className="dice-result-live" aria-live="polite" aria-atomic="true">
          {latest ? (
            <RollCard key={latest.id} result={latest} latest rolling={latest.id === rollingId} />
          ) : (
            <article className="codex-card dice-result-empty">
              <DiceIcon className="dice-result-empty__icon" sides={20} size={52} />
              <div className="dice-result-empty__body">
                <h3>Бросков ещё нет</h3>
                <p>Выберите кубик или введите формулу, затем нажмите «Бросить».</p>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="roll-history-section" aria-labelledby="roll-history-title">
        <div className="roll-history-title-row">
          <div>
            <span className="kicker">История бросков</span>
            <h2 id="roll-history-title"><Dices size={20} aria-hidden="true" /> Последние броски</h2>
          </div>
          <span aria-label={`${history.length} из ${historyLimit} сохранённых бросков`}>{history.length}/{historyLimit}</span>
        </div>
        {history.length ? (
          <div className="roll-history-grid">
            {history.map((item) => <RollCard key={item.id} result={item} />)}
          </div>
        ) : (
          <p className="roll-history-empty">История появится после первого броска.</p>
        )}
      </section>
    </div>
  );
}
