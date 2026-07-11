import { Database, Mail, Settings, ShieldCheck, UsersRound } from "lucide-react";

function activeRole(session) {
  const role = session?.activeMembership?.role || "user";
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return "Без кампании";
}

export default function SettingsPage({ session }) {
  return (
    <div className="page-stack settings-page">
      <section className="hero-panel">
        <span className="kicker">Настройки</span>
        <h1>Настройки workspace и кампании</h1>
        <p>Сводка активной кампании, роли, хранения данных и доставки системных уведомлений.</p>
      </section>

      <section className="workspace-grid settings-grid">
        <article className="codex-card workspace-card">
          <Settings size={22} />
          <div>
            <strong>Кампания</strong>
            <span>{session?.activeCampaign?.name || "Кампания не выбрана"}</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <UsersRound size={22} />
          <div>
            <strong>Роль</strong>
            <span>{activeRole(session)}</span>
          </div>
        </article>
        <article className="codex-card workspace-card" id="mongo">
          <Database size={22} />
          <div>
            <strong>MongoDB</strong>
            <span>Основной источник данных платформы.</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <Mail size={22} />
          <div>
            <strong>Email</strong>
            <span>Канал подтверждения аккаунта и доставки приглашений в кампанию.</span>
          </div>
        </article>
      </section>

      <section className="codex-card workspace-status-card">
        <ShieldCheck size={20} />
        <p>Дополнительные настройки появятся здесь только после подключения соответствующих возможностей для текущего workspace.</p>
      </section>
    </div>
  );
}
