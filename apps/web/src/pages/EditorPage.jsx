import { useSearchParams } from "react-router-dom";
import QuickEditor from "../components/QuickEditor.jsx";

export default function EditorPage({ onSaved }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Quick Create</span>
        <h1>Создать статью</h1>
        <p>Минимум полей сверху, детали и Maps 2.0 спрятаны в “Дополнительно”. Markdown-импорт может заполнить форму без немедленной записи в vault.</p>
      </header>
      <QuickEditor onSaved={onSaved} initialTitle={initialTitle} />
    </div>
  );
}
