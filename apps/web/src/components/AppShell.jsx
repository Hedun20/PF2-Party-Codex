import { Link, NavLink } from "react-router-dom";
import { BriefcaseBusiness, Library, ShieldCheck, UserRound } from "lucide-react";

const gmLinks = [
  ["Dashboard", "/"],
  ["Campaign Archive", "/archive"],
  ["World / Codex / Pages", "/category/worlds"],
  ["Maps", "/maps"],
  ["Timeline", "/timeline"],
  ["Sessions", "/sessions"],
  ["Handouts", "/handouts"],
  ["Characters", "/characters"],
  ["Notes", "/notes"],
  ["Players", "/players"],
  ["Settings", "/settings"]
];

const playerLinks = [
  ["Home", "/player"],
  ["Known Lore", "/archive"],
  ["Handouts", "/handouts"],
  ["Maps", "/maps"],
  ["Timeline", "/timeline"],
  ["My Character", "/characters"],
  ["My Notes", "/notes"],
  ["Profile", "/profile"]
];

function hasCampaignMembership(session) {
  return Boolean(session?.activeMembership?.id);
}

function PortalLink({ to, children }) {
  return (
    <NavLink className={({ isActive }) => `portal-nav-link${isActive ? " active" : ""}`} to={to} end={to === "/"}>
      {children}
    </NavLink>
  );
}

function PortalGroup({ icon: Icon, title, links }) {
  return (
    <section className="portal-nav-section" aria-label={title}>
      <div className="portal-nav-heading">
        <Icon size={16} />
        <span>{title}</span>
      </div>
      <div className="portal-nav-links">
        {links.map(([label, to]) => <PortalLink key={`${title}-${to}`} to={to}>{label}</PortalLink>)}
      </div>
    </section>
  );
}

export default function AppShell({ children, session, canManage }) {
  const signedIn = Boolean(session?.user);

  if (!signedIn || !hasCampaignMembership(session)) return children;

  return (
    <div className="portal-shell">
      <nav className="portal-nav" aria-label="Portal navigation">
        <Link className="portal-nav-home" to="/archive">
          <Library size={18} />
          <span>Campaign Archive</span>
        </Link>
        {canManage ? <PortalGroup icon={BriefcaseBusiness} title="GM Portal" links={gmLinks} /> : null}
        <PortalGroup icon={UserRound} title="Player Portal" links={playerLinks} />
        {canManage ? <PortalGroup icon={ShieldCheck} title="Admin" links={[["Admin", "/admin"]]} /> : null}
      </nav>
      <div className="portal-content">{children}</div>
    </div>
  );
}
