import { Link } from "react-router-dom";
import { Crown, Copy, Mail, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import OnboardingPage from "./OnboardingPage.jsx";

function roleLabel(role = "user") {
  if (role === "owner") return "Владелец кампании";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return "Без кампании";
}

function displayName(user = {}) {
  return user.displayName || user.name || user.email || "Пользователь";
}

function copyEmail(email = "") {
  if (!email || !navigator?.clipboard) return;
  navigator.clipboard.writeText(email).catch(() => {});
}

export default function ProfilePageV2({ session, onOnboardingCreated }) {
  const user = session?.user || {};
  const membership = session?.activeMembership || {};
  const campaign = session?.activeCampaign || {};
  const workspace = session?.activeWorkspace || {};
  const hasCampaign = Boolean(membership?.id);

  if (user?.id && !hasCampaign) {
    return <OnboardingPage session={session} onCreated={onOnboardingCreated} />;
  }

  return (
    <div className="page-stack profile-page">
      <section className="hero-panel">
        <span className="kicker">Профиль</span>
        <h1>{displayName(user)}</h1>
        <p>Аккаунт, активный workspace, кампания и роль в текущей кампании.</p>
        <div className="workspace-identity-strip">
          {user.email ? <span className="profile-email-chip"><Mail size={15} /> <span>{user.email}</span></span> : null}
          <span><ShieldCheck size={15} /> {roleLabel(membership.role || "user")}</span>
          {campaign.name ? <span><Crown size={15} /> {campaign.name}</span> : null}
        </div>
      </section>

      <section className="workspace-grid settings-grid">
        <article className="codex-card workspace-card profile-account-card">
          <UserRound size={22} />
          <div><strong>Аккаунт</strong><span className="profile-email-text">{user.email || "Email не указан"}</span></div>
          {user.email ? <button type="button" className="codex-button codex-button--ghost codex-button--sm" onClick={() => copyEmail(user.email)}><Copy size={14} /> Copy</button> : null}
        </article>
        <article className="codex-card workspace-card">
          <UsersRound size={22} />
          <div><strong>Workspace</strong><span>{workspace.name || "Workspace не выбран"}</span></div>
        </article>
        <article className="codex-card workspace-card">
          <Crown size={22} />
          <div><strong>Кампания</strong><span>{campaign.name || "Кампания не выбрана"}</span></div>
        </article>
        <article className="codex-card workspace-card">
          <ShieldCheck size={22} />
          <div><strong>Доступ</strong><span>{roleLabel(membership.role || "user")}</span></div>
        </article>
      </section>

      <section className="codex-card workspace-status-card">
        <span className="kicker">Быстрые действия</span>
        <div className="workspace-stats-row">
          <Link className="codex-button codex-button--secondary codex-button--sm" to="/my">Открыть workspace</Link>
          <Link className="codex-button codex-button--ghost codex-button--sm" to="/settings">Настройки</Link>
          <Link className="codex-button codex-button--ghost codex-button--sm" to="/archive">Архив кампании</Link>
        </div>
      </section>
    </div>
  );
}
