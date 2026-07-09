import { Link } from "react-router-dom";
import { BookOpen, Dices, NotebookPen, Sparkles, UserRound } from "lucide-react";

function role(session) {
  return session?.activeMembership?.role || "player";
}

const playerCards = [
  ["Мой игровой стол", "/session-desk", "Персонаж, кубики, заметки и открытые GM материалы во время игры.", UserRound],
  ["Мой персонаж", "/characters", "Рабочее место персонажа и будущий character sheet.", UserRound],
  ["Кубики", "/dice", "Локальный dice tray для быстрых бросков.", Dices],
  ["Мои заметки", "/notes", "Личные заметки участника.", NotebookPen],
  ["Известный лор", "/archive", "Лор, NPC, квесты и сведения, которые GM уже открыл участникам.", BookOpen],
  ["Материалы игрокам", "/handouts", "Письма, картинки, улики и подсказки, открытые для группы.", Sparkles],
  ["Профиль", "/profile", "Аккаунт, кампания и роль доступа.", UserRound]
];

export default function PlayerHomePage({ session }) {
  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">Player Portal</span>
        <h1>Портал участника</h1>
        <p>Минимальный набор для игры: персонаж, кубики, заметки, известный лор и материалы игрокам. Карты не вынесены отдельно — GM открывает нужные изображения как материалы.</p>
        <div className="workspace-identity-strip">
          <span>{session?.user?.name || session?.user?.displayName || session?.user?.email || "Участник"}</span>
          {session?.activeCampaign?.name ? <span>Кампания: {session.activeCampaign.name}</span> : null}
          <span>Роль: {role(session)}</span>
        </div>
      </section>
      <section className="workspace-grid">
        {playerCards.map(([title, to, description, Icon], index) => (
          <Link key={to} to={to} className={`codex-card workspace-card player-portal-card${index === 0 ? " primary-workspace-card" : ""}`}>
            <Icon size={22} />
            <div>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
