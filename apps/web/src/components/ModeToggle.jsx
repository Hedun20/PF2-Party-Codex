import { Eye, Shield } from "lucide-react";

export default function ModeToggle({ mode, setMode }) {
  return (
    <div className="mode-toggle">
      <button className={mode === "player" ? "active" : ""} onClick={() => setMode("player")} title="Player mode">
        <Eye size={16} />
        <span>Player</span>
      </button>
      <button className={mode === "gm" ? "active" : ""} onClick={() => setMode("gm")} title="GM mode">
        <Shield size={16} />
        <span>GM</span>
      </button>
    </div>
  );
}
