import { Eye, Shield } from "lucide-react";

export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="mode-toggle">
      <button className={mode === "player" ? "active" : ""} onClick={() => setMode("player")} title="Режим игрока">
        <Eye size={16} />
        <span>Игрок</span>
      </button>
      <button className={mode === "gm" ? "active" : ""} onClick={() => setMode("gm")} title="Режим мастера">
        <Shield size={16} />
        <span>GM</span>
      </button>
    </div>
  );
}
