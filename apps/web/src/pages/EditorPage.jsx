import { Link, useSearchParams } from "react-router-dom";
import QuickEditor from "../components/QuickEditor.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";

export default function EditorPage({ onSaved, session }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";

  if (!session?.canEdit) {
    return (
      <div className="page-stack">
        <header className="list-header">
          <span className="kicker">Player mode</span>
          <h1>Создание скрыто</h1>
          <p>Создавать и изменять статьи может только мастер на машине, где запущен сервер. Открой Codex через <code>localhost</code>.</p>
          <CodexButton as={Link} variant="secondary" to="/guide">Как подключать игроков</CodexButton>
        </header>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Quick Create</span>
        <h1>Создать статью</h1>
        <p>Сначала минимум полей. Подтип лора, привязки, медиа и Maps 2.0 раскрываются только когда они нужны.</p>
      </header>
      <QuickEditor onSaved={onSaved} initialTitle={initialTitle} />
    </div>
  );
}
