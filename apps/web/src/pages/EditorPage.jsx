import QuickEditor from "../components/QuickEditor.jsx";

export default function EditorPage({ onSaved }) {
  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Markdown-first конструктор</span>
        <h1>Создать статью</h1>
        <p>Быстро создавай миры, страны, города, NPC, врагов, квесты и локации. Прямое редактирование `.md` остаётся главным способом работы.</p>
      </header>
      <QuickEditor onSaved={onSaved} />
    </div>
  );
}
