import { Link } from "react-router-dom";
import { BookOpen, Clock3, Dices, MapPinned, NotebookPen, Sparkles, UserRound } from "lucide-react";

function role(session) {
  return session?.activeMembership?.role || "player";
}

const playerCards = [
  ["Известный архив", "/archive", "Лор, статьи и сведения, которые GM уже открыл участникам.", BookOpen],
  ["Материалы", "/handouts", "Handouts, изображения и подсказки, открытые для группы.", Sparkles],
  ["Карты", "/maps", "Карты и объекты карты, доступные участнику.", MapPinned],
  ["Timeline", "/timeline", "Известные события кампании и публичная история.", Clock3],
  ["Мой персонаж", "/characters", "Рабочее место персонажа кампании.", UserRound],
  ["Мои заметки", "/notes", "Личные заметки участника.", NotebookPen],
  ["Кубики", "/dice", "Локальный dice tray для быстрых бросков.", Dices],
  ["Профиль", "/profile", "Сессия, кампания и права доступа.", UserRound]
];

export default function PlayerHomePage({ session }) {
  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">Player Portal</span>
        <h1>Портал участника</h1>
        <p>Безопасный доступ к материалам кампании: архив, handouts, карты, timeline, персонаж, заметки и кубики.</p>
        <div className="workspace-identity-strip">
          <span>{session?.user?.name || session?.user?.displayName || session?.user?.email || "Участник"}</span>
          {session?.activeCampaign?.name ? <span>Кампания: {session.activeCampaign.name}</span> : null}
          <span>Роль: {role(session)}</span>
        </div>
      </section>
      <section className="workspace-grid">
        {playerCards.map(([title, to, description, Icon], index) => (
          <Link key={to} to={to} className={`codex-card workspace-card${index === 0 ? " primary-workspace-card" : ""}`}>
            <Icon size={22} />
            <strong>{title}</strong>
            <span>{description}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
