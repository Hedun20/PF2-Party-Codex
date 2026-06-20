import { useSearchParams } from "react-router-dom";
import QuickEditor from "../components/QuickEditor.jsx";

export default function EditorPage({ onSaved }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Markdown-first конструктор</span>
        <h1>Создать статью</h1>
        <p>Быстро создавай миры, страны, города, NPC, врагов, квесты и локации. Прямое редактирование `.md` остаётся главным способом работы.</p>
      </header>
      <QuickEditor onSaved={onSaved} initialTitle={initialTitle} />
    </div>
  );
}
