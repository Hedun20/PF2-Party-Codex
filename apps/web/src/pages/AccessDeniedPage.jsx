import { Archive, Layers3, ShieldAlert, UserRound } from "lucide-react";
import { CodexButton, EmptyState, PageHero, PageShell } from "../components/ui/index.js";

function roleLabel(role = "player") {
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return "Без активной роли";
}

export default function AccessDeniedPage({ session, requiredRole = "GM или владелец" }) {
  const role = session?.activeMembership?.role || "player";
  const campaign = session?.activeCampaign?.name || "Активная кампания";

  return (
    <PageShell className="access-denied-page">
      <PageHero
        kicker="403 · Campaign permissions"
        title="Недостаточно прав для этого раздела"
        description={`Раздел доступен роли «${requiredRole}». В кампании «${campaign}» ваша текущая роль — ${roleLabel(role)}.`}
      >
        <div className="workspace-identity-strip">
          <span><UserRound size={15} aria-hidden="true" /> {session?.user?.name || session?.user?.email || "Пользователь"}</span>
          <span><Layers3 size={15} aria-hidden="true" /> {campaign}</span>
          <span><ShieldAlert size={15} aria-hidden="true" /> {roleLabel(role)}</span>
        </div>
      </PageHero>

      <EmptyState
        icon={ShieldAlert}
        kicker="Маршрут защищён"
        title="Мастерские данные не были открыты"
        description="Вы можете продолжить работу в доступных игроку разделах или выбрать другую кампанию, где у вас есть роль GM."
      />

      <div className="workspace-stats-row">
        <CodexButton to="/player"><UserRound size={16} aria-hidden="true" /> Портал игрока</CodexButton>
        <CodexButton to="/archive" variant="secondary"><Archive size={16} aria-hidden="true" /> Доступный архив</CodexButton>
        <CodexButton to="/campaigns" variant="ghost"><Layers3 size={16} aria-hidden="true" /> Выбрать кампанию</CodexButton>
      </div>
    </PageShell>
  );
}
