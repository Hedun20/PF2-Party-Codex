import { Link } from "react-router-dom";
import { BookOpen, Clock3, Dices, NotebookPen, Search, Sparkles, UserRound } from "lucide-react";
import { CodexCard, PageHero, PageShell } from "../components/ui/index.js";

function role(session) {
  return String(session?.activeMembership?.role || "player").toLowerCase();
}

function canManage(session) {
  return ["owner", "gm"].includes(role(session));
}

function DeskCard({ to, icon: Icon, title, description, primary = false }) {
  return (
    <CodexCard as={Link} to={to} className={`workspace-card session-desk-card${primary ? " primary-workspace-card" : ""}`}>
      <Icon size={24} />
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </CodexCard>
  );
}

export default function SessionDeskPage({ session }) {
  const manager = canManage(session);
  const campaign = session?.activeCampaign?.name || "Активная кампания";

  const gmCards = [
    ["/dice", Dices, "Кубики", "Быстрый dice tray: d20, формулы, история бросков.", true],
    ["/handouts", Sparkles, "Материалы игрокам", "Открыть или проверить материалы, которые увидят участники."],
    ["/notes", NotebookPen, "Быстрые заметки", "Фиксировать решения, имена, последствия и идеи во время игры."],
    ["/archive", Search, "Быстрый поиск по архиву", "Открыть NPC, локацию, квест или известный факт."],
    ["/sessions", Clock3, "Сессии", "Заготовки и будущий recap текущей игры."],
    ["/characters", UserRound, "Персонажи", "Персонажи участников и видимость для GM."]
  ];

  const playerCards = [
    ["/characters", UserRound, "Мой персонаж", "Рабочее место персонажа и будущий character sheet.", true],
    ["/dice", Dices, "Кубики", "Быстрый локальный бросок во время игры."],
    ["/notes", NotebookPen, "Мои заметки", "Личные заметки по сессии."],
    ["/handouts", Sparkles, "Материалы игрокам", "Письма, картинки, улики и подсказки, которые открыл GM."],
    ["/archive", BookOpen, "Известный лор", "Только знания, доступные участнику кампании."]
  ];

  const cards = manager ? gmCards : playerCards;

  return (
    <PageShell className="session-desk-page">
      <PageHero
        kicker="Игровой стол"
        title={manager ? "Рабочий стол сессии" : "Мой игровой стол"}
        description={manager
          ? "Всё, что нужно во время живой игры: кубики, быстрые заметки, материалы игрокам и быстрый доступ к архиву."
          : "Минимальный экран участника во время игры: персонаж, кубики, заметки, открытые материалы и известный лор."}
      >
        <div className="workspace-identity-strip">
          <span>Кампания: {campaign}</span>
          <span>Роль: {role(session)}</span>
        </div>
      </PageHero>

      <section className="workspace-grid">
        {cards.map(([to, Icon, title, description, primary]) => (
          <DeskCard key={to} to={to} icon={Icon} title={title} description={description} primary={primary} />
        ))}
      </section>

      <CodexCard className="workspace-status-card" as="section">
        <span className="kicker">Принцип</span>
        <p>Архив нужен для подготовки и знаний. Игровой стол нужен во время сессии, когда надо быстро бросить кубы, открыть материал или записать заметку.</p>
      </CodexCard>
    </PageShell>
  );
}
