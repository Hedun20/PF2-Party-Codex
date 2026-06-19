import QuickEditor from "../components/QuickEditor.jsx";

export default function EditorPage({ onSaved }) {
  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">Markdown-first authoring</span>
        <h1>Quick Create</h1>
        <p>Create structured entries without giving up direct `.md` editing.</p>
      </header>
      <QuickEditor onSaved={onSaved} />
    </div>
  );
}
