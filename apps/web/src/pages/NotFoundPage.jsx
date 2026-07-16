import { Archive, Home, Layers3, LogIn } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";
import PageHero from "../components/ui/PageHero.jsx";
import PageShell from "../components/ui/PageShell.jsx";

export default function NotFoundPage({ session }) {
  const signedIn = Boolean(session?.user);
  const hasCampaign = Boolean(session?.activeMembership?.id);

  return (
    <PageShell className="not-found-page">
      <PageHero
        kicker="404 · Navigation"
        title="Страница не найдена"
        description="Такого маршрута в Party Codex нет. Ссылка могла устареть после изменения кампании или структуры архива."
        actions={(
          <>
            <CodexButton to="/"><Home size={16} aria-hidden="true" /> На главную</CodexButton>
            {hasCampaign ? <CodexButton to="/archive" variant="secondary"><Archive size={16} aria-hidden="true" /> Архив кампании</CodexButton> : null}
            {signedIn && !hasCampaign ? <CodexButton to="/campaigns" variant="secondary"><Layers3 size={16} aria-hidden="true" /> Выбрать кампанию</CodexButton> : null}
            {!signedIn ? <CodexButton to="/login" variant="secondary"><LogIn size={16} aria-hidden="true" /> Войти</CodexButton> : null}
          </>
        )}
      />
    </PageShell>
  );
}
