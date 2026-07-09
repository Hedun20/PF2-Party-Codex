import { Download, Settings, ShieldCheck, SlidersHorizontal, UsersRound } from "lucide-react";

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
        <h1>Настройки кампании</h1>
        <p>Пользовательские настройки активной кампании, доступа и будущих возможностей продукта.</p>
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
        <article className="codex-card workspace-card">
          <SlidersHorizontal size={22} />
          <div>
            <strong>Интерфейс</strong>
            <span>Язык, тема и вид главных рабочих зон будут настраиваться здесь.</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <Download size={22} />
          <div>
            <strong>Данные кампании</strong>
            <span>Импорт, экспорт и резервные копии будут вынесены в отдельный безопасный блок.</span>
          </div>
        </article>
      </section>

      <section className="codex-card workspace-status-card">
        <ShieldCheck size={20} />
        <p>Техническая диагностика, health checks и служебные журналы остаются в разделе “Диагностика”, а не в обычных настройках игрока или GM.</p>
      </section>
    </div>
  );
}
