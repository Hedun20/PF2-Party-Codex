import CodexButton from "../components/ui/CodexButton.jsx";
import PageHero from "../components/ui/PageHero.jsx";
import PageShell from "../components/ui/PageShell.jsx";

export default function NotFoundPage() {
  return (
    <PageShell className="not-found-page">
      <PageHero
        kicker="404 · Navigation"
        title="Страница не найдена"
        description="Такого маршрута в Party Codex нет. Возможно, ссылка устарела или была введена с ошибкой."
        actions={<CodexButton to="/">Вернуться на главную</CodexButton>}
      />
    </PageShell>
  );
}
