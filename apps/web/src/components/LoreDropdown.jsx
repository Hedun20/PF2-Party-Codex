import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Gem } from "lucide-react";

const lore = ["gods", "countries", "factions", "history", "planes", "artifacts", "magic", "cults", "prophecies", "timeline"];

export default function LoreDropdown() {
  const [open, setOpen] = useState(true);
  return (
    <div className="lore-menu">
      <button className="nav-link nav-button" onClick={() => setOpen(!open)}>
        <Gem size={18} />
        <span>Lore</span>
        <ChevronDown size={16} className={open ? "turn" : ""} />
      </button>
      {open && (
        <div className="lore-children">
          {lore.map((item) => (
            <NavLink key={item} to={`/category/lore/${item}`} className="sub-link">
              {item.replace(/^\w/, (c) => c.toUpperCase())}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
