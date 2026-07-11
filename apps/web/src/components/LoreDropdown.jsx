import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Gem } from "lucide-react";
import { scopedPath } from "../utils/shellContext.js";

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

export default function LoreDropdown({ activeWorld = null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lore-menu">
      <button type="button" className="nav-link nav-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="lore-navigation-links">
        <Gem size={18} />
        <span>Lore</span>
        <ChevronDown size={16} className={open ? "turn" : ""} aria-hidden="true" />
      </button>
      {open && (
        <div className="lore-children" id="lore-navigation-links">
          {lore.map(([path, label]) => (
            <NavLink key={path} to={scopedPath(`/category/lore/${path}`, activeWorld)} className="sub-link">
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
