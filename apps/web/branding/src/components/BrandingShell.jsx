import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Dices,
  Gem,
  Menu,
  MoonStar,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
  X
} from "lucide-react";
import { IconButton } from "./Ui.jsx";

const navigation = [
  { to: "/foundations", label: "Foundations", icon: Sparkles },
  { to: "/character", label: "Character Dossier", icon: UserRound },
  { to: "/dice", label: "Dice Workspace", icon: Dices },
  { to: "/invitations", label: "Players & Invites", icon: UserPlus }
];

const pageNames = {
  "/foundations": "Design System Lab",
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
          <span className="branding-logo__mark"><Gem size={27} aria-hidden="true" /></span>
          <div className="branding-logo__copy">
            <strong>Royal Archive</strong>
            <small>Silverleaf Dark</small>
          </div>
          <IconButton label="Close navigation" icon={X} className="branding-sidebar__mobile-close" onClick={() => setMobileOpen(false)} />
        </div>

        <div className="branding-sidebar__meta">
          <MoonStar size={18} aria-hidden="true" />
          <span>Approved theme · dark mode</span>
        </div>

        <nav className="branding-nav" aria-label="Branding prototype pages">
          <p className="branding-nav__label">Prototype brochure</p>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `branding-nav__link${isActive ? " is-active" : ""}`}>
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="branding-sidebar__footer">
          <button type="button" className="branding-collapse" onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <ChevronLeft size={18} aria-hidden="true" />}
            <span>{collapsed ? "Expand" : "Collapse sidebar"}</span>
          </button>
        </div>
      </aside>

      {mobileOpen ? <button className="branding-mobile-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <div className="branding-workspace">
        <header className="branding-topbar">
          <button type="button" className="branding-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu size={20} aria-hidden="true" />
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
            <label className="branding-search">
              <Search size={17} aria-hidden="true" />
              <input aria-label="Search branding prototype" placeholder="Search the archive..." />
            </label>
            <IconButton label="Notifications" icon={Bell} />
            <IconButton label="Settings" icon={Settings} />
            <span className="branding-avatar" aria-label="Demo account">DM</span>
          </div>
        </header>

        <main className="branding-main">
          <div className="branding-breadcrumbs">
            <BookOpen size={14} aria-hidden="true" />
            <span>Branding</span>
            <ChevronRight size={13} aria-hidden="true" />
            <strong>{pageNames[location.pathname] || "Design System Lab"}</strong>
            <span className="branding-breadcrumbs__badge"><ShieldCheck size={13} aria-hidden="true" /> JSX prototype</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
