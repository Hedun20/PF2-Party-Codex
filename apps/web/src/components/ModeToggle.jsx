import { Eye, Shield } from "lucide-react";

export default function ModeToggle({ mode, setMode, canEdit = false }) {
  const nextMode = mode === "gm" ? "player" : "gm";
  const disabled = !canEdit && nextMode === "gm";

  function toggleMode() {
    if (disabled) return;
    setMode(nextMode);
  }

  return (
    <button
      type="button"
      className={`mode-toggle ${mode === "gm" ? "gm" : "player"}`}
      onClick={toggleMode}
      disabled={disabled}
      title={disabled ? "GM mode is available only to GMs" : "Switch player / GM mode"}
      aria-label={mode === "gm" ? "Switch to player mode" : "Switch to GM mode"}
      aria-pressed={mode === "gm"}
    >
      <span className={mode === "player" ? "active" : ""}>
        <Eye size={16} />
        <span>Игрок</span>
      </span>
      <span className={mode === "gm" ? "active" : ""}>
        <Shield size={16} />
        <span>GM</span>
      </span>
    </button>
  );
}