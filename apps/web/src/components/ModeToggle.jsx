import { Eye, Shield } from "lucide-react";

export default function ModeToggle({ mode, setMode, canEdit = false }) {
  return (
    <div className="mode-toggle">
      <button className={mode === "player" ? "active" : ""} onClick={() => setMode("player")} title="Режим игрока">
        <Eye size={16} />
        <span>Игрок</span>
      </button>
      <button
        className={mode === "gm" ? "active" : ""}
        onClick={() => canEdit && setMode("gm")}
        disabled={!canEdit}
        title={canEdit ? "Режим мастера" : "GM доступен только на localhost машины мастера"}
      >
        <Shield size={16} />
        <span>GM</span>
      </button>
    </div>
  );
}
