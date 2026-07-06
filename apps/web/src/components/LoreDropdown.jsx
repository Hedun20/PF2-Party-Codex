import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Gem } from "lucide-react";

const lore = [
  ["gods", "Gods"],
  ["factions", "Factions"],
  ["history", "History"],
  ["planes", "Planes"],
  ["artifacts", "Artifacts"],
  ["magic", "Magic"],
  ["cults", "Cults"],
  ["prophecies", "Prophecies"],
  ["timeline", "Timeline"]
];

export default function LoreDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lore-menu">
      <button className="nav-link nav-button" onClick={() => setOpen(!open)}>
        <Gem size={18} />
        <span>Lore</span>
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
