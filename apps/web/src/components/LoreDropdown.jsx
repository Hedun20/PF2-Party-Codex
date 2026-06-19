import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Gem } from "lucide-react";

const lore = [
  ["gods", "Боги"],
  ["factions", "Фракции"],
  ["history", "История"],
  ["planes", "Планы"],
  ["artifacts", "Артефакты"],
  ["magic", "Магия"],
  ["cults", "Культы"],
  ["prophecies", "Пророчества"]
];

export default function LoreDropdown() {
  const [open, setOpen] = useState(true);
  return (
    <div className="lore-menu">
      <button className="nav-link nav-button" onClick={() => setOpen(!open)}>
        <Gem size={18} />
        <span>Лор</span>
        <ChevronDown size={16} className={open ? "turn" : ""} />
      </button>
      {open && (
        <div className="lore-children">
          {lore.map(([path, label]) => (
            <NavLink key={path} to={`/category/lore/${path}`} className="sub-link">
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
