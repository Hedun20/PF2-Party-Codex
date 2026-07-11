import { Link } from "react-router-dom";
import { Database, FileQuestion, FileUp, HeartHandshake, Import, ScrollText, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";

const tools = [
  ["Campaign Health", "/health", ShieldCheck, "Content integrity, asset links and player-safety readiness."],
  ["Missing Articles", "/missing", FileQuestion, "Wiki links that need real entries."],
  ["Foundry Import/Export", "/foundry", Import, "Move journals and campaign data between Foundry and Codex."],
  ["Player Safety", "/player-safety", ShieldAlert, "Lines, veils and safety notes for the campaign."],
  ["Raw Editor", "/edit/index.md", ScrollText, "Technical markdown editor for emergency fixes."],
  ["Create Article", "/editor", FileUp, "Structured editor for worlds, NPC, quests and lore."],
  ["Settings", "/settings", Wrench, "Workspace and platform settings shell."],
  ["Mongo Systems", "/settings#mongo", Database, "Database-backed platform modules and health notes."]
];

export default function GMToolsPage({ session }) {
  return (
    <div className="page-stack gm-tools-page">
      <section className="hero-panel">
        <span className="kicker">GM Tools</span>
        <h1>Tools moved out of the main sidebar</h1>
        <p>Diagnostics, imports and technical pages live here so the primary navigation stays clean for actual campaign work.</p>
      </section>

      <section className="workspace-grid gm-tools-grid">
        {tools.map(([title, to, Icon, text]) => (
          <Link key={title} to={to} className="codex-card workspace-card">
            <Icon size={22} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="codex-card workspace-status-card">
        <span className="kicker">Access</span>
        <p><HeartHandshake size={16} /> This page is intended for owner/GM memberships. Player navigation does not show it.</p>
        {session?.activeCampaign?.name && <p>Active campaign: <strong>{session.activeCampaign.name}</strong></p>}
      </section>
    </div>
  );
}
