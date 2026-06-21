import { Link, useSearchParams } from "react-router-dom";
import QuickEditor from "../components/QuickEditor.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";

export default function EditorPage({ onSaved, session }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialWorld = searchParams.get("world") || "";

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
        <h1>{initialWorld ? `Создать в мире: ${initialWorld}` : "Создать статью"}</h1>
        <p>{initialWorld ? "Новая статья автоматически получит привязку к выбранному миру. Это можно изменить вручную." : "Сначала минимум полей. Подтип лора, привязки, медиа и Maps 2.0 раскрываются только когда они нужны."}</p>
      </header>
      <QuickEditor onSaved={onSaved} initialTitle={initialTitle} initialWorld={initialWorld} />
    </div>
  );
}
