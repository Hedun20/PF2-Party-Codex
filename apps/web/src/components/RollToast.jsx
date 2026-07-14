import { useEffect, useState } from "react";
import { Check, Copy, Dices, X } from "lucide-react";

export default function RollToast({ roll, onDismiss, timeoutMs = 12_000 }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
    if (!roll) return undefined;
    const timer = window.setTimeout(() => onDismiss?.(), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [roll, onDismiss, timeoutMs]);

  if (!roll) return null;

  async function copyResult() {
    const text = `${roll.label}: ${roll.formula} → ${roll.breakdown}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside className="character-roll-toast" role="status" aria-live="polite">
      <div className="character-roll-toast__icon"><Dices size={22} /></div>
      <div className="character-roll-toast__body">
        <span>{roll.label}</span>
        <strong>{roll.total}</strong>
        <small>{roll.formula} · {roll.breakdown}</small>
      </div>
      <div className="character-roll-toast__actions">
        <button type="button" onClick={copyResult} aria-label="Копировать результат броска" title="Копировать результат">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <button type="button" onClick={onDismiss} aria-label="Закрыть результат броска" title="Закрыть">
          <X size={16} />
        </button>
      </div>
    </aside>
  );
}
