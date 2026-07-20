import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Archive,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Dices,
  FilePlus2,
  History,
  Map,
  Menu,
  MoonStar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  Users,
  X
} from "lucide-react";
import { IconButton, SilverleafLeafIcon, TextInput } from "./Ui.jsx";

const navigation = [
  { to: "/foundations", label: "Foundations", icon: Sparkles },
  { to: "/archive", label: "Campaign Archive", icon: Archive },
  { to: "/entry", label: "Lore Entry Detail", icon: BookOpen },
  { to: "/entry/new", label: "Create Archive Entry", icon: FilePlus2 },
  { to: "/npcs", label: "NPC Roster", icon: Users },
  { to: "/timeline", label: "Campaign Timeline", icon: History },
  { to: "/maps", label: "Campaign Maps", icon: Map },
  { to: "/character", label: "Character Dossier", icon: UserRound },
  { to: "/dice", label: "Dice Workspace", icon: Dices },
  { to: "/invitations", label: "Players & Invites", icon: UserPlus }
];

const pageNames = {
  "/foundations": "Design System Lab",
  "/archive": "Campaign Archive",
  "/entry": "The Shattered Oath",
  "/entry/new": "Create Archive Entry",
  "/npcs": "NPC Roster",
  "/timeline": "Campaign Timeline",
  "/maps": "Campaign Maps",
  "/character": "Character Dossier",
  "/dice": "Dice Workspace",
  "/invitations": "Players & Invitations"
};

export default function BrandingShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className={`branding-shell${collapsed ? " is-collapsed" : ""}`}>
      <aside className={`branding-sidebar${mobileOpen ? " is-mobile-open" : ""}`}>
        <div className="branding-logo">
          <span className="branding-logo__mark"><SilverleafLeafIcon size={31} /></span>
          <div className="branding-logo__copy">
            <strong>Royal Archive</strong>
            <small>PF2 Party Codex</small>
          </div>
          <IconButton label="Close navigation" icon={X} className="branding-sidebar__mobile-close" onClick={() => setMobileOpen(false)} />
        </div>

        <div className="branding-sidebar__meta">
          <MoonStar size={18} strokeWidth={1.45} aria-hidden="true" />
          <span>Silverleaf Dark · foundation</span>
        </div>

        <nav className="branding-nav" aria-label="Branding prototype pages">
          <p className="branding-nav__label">Design system</p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink end key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `branding-nav__link${isActive ? " is-active" : ""}`}>
              <span className="branding-nav__marker" aria-hidden="true" />
              <Icon size={19} strokeWidth={1.45} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="branding-sidebar__footer">
          <button type="button" className="branding-collapse" onClick={() => setCollapsed((current) => !current)}>
            {collapsed ? <ChevronRight size={18} strokeWidth={1.45} aria-hidden="true" /> : <ChevronLeft size={18} strokeWidth={1.45} aria-hidden="true" />}
            <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
          </button>
        </div>
      </aside>

      {mobileOpen ? <button className="branding-mobile-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <div className="branding-workspace">
        <header className="branding-topbar">
          <button type="button" className="branding-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={20} strokeWidth={1.45} aria-hidden="true" />
          </button>
          <div className="branding-context">
            <div className="branding-context__item">
              <small>Active campaign</small>
              <strong>The Lost Sentinel</strong>
            </div>
            <div className="branding-context__item">
              <small>Role</small>
              <strong>Game Master</strong>
            </div>
            <div className="branding-context__item">
              <small>World</small>
              <strong>Silverleaf Vale</strong>
            </div>
          </div>
          <div className="branding-topbar__tools">
            <TextInput className="branding-search" icon={Search} aria-label="Search branding prototype" placeholder="Search the archive..." />
            <IconButton label="Notifications" icon={Bell} />
            <IconButton label="Settings" icon={Settings} />
            <span className="branding-avatar" aria-label="Demo account">DM</span>
          </div>
        </header>

        <main className="branding-main">
          <div className="branding-breadcrumbs">
            <BookOpen size={14} strokeWidth={1.45} aria-hidden="true" />
            <span>Branding</span>
            <ChevronRight size={13} strokeWidth={1.45} aria-hidden="true" />
            <strong>{pageNames[location.pathname] || "Design System Lab"}</strong>
            <span className="branding-breadcrumbs__badge"><ShieldCheck size={13} strokeWidth={1.45} aria-hidden="true" /> JSX prototype</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
