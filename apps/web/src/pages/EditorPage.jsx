import { Link, useSearchParams } from "react-router-dom";
import QuickEditor from "../components/QuickEditor.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";

export default function EditorPage({ onSaved, session, activeWorld = null }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialWorld = searchParams.get("world") || activeWorld?.title || "";
  const initialType = searchParams.get("type") || "lore";

  if (!session?.canEdit) {
    return (
      <div className="page-stack">
        <header className="list-header">
          <span className="kicker">Доступ закрыт</span>
          <h1>Создание статей доступно только GM</h1>
          <p>Создавать и редактировать статьи может владелец кампании или GM. Права берутся из active membership.</p>
          <CodexButton as={Link} variant="secondary" to="/guide">Открыть гайд</CodexButton>
        </header>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Создание статьи</span>
        <h1>{initialWorld ? `Создать в мире: ${initialWorld}` : "Создать статью"}</h1>
        <p>{initialWorld ? "Новая статья автоматически получит привязку к выбранному миру. Это можно изменить вручную." : "Быстрое создание материала кампании: тип, название, видимость, привязка к миру и текст для игроков/GM."}</p>
      </header>
      <QuickEditor onSaved={onSaved} initialTitle={initialTitle} initialWorld={initialWorld} initialType={initialType} />
    </div>
  );
}
