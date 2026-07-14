import { articleTypeConfig } from "../utils/articleFormConfig.js";

function FieldShell({ item, children }) {
  return (
    <label className={item.type === "textarea" ? "codex-field quick-type-field quick-type-field--wide" : "codex-field quick-type-field"}>
      <span>{item.label}</span>
      {children}
      {item.type === "list" ? <small>Разделяйте значения запятыми.</small> : null}
    </label>
  );
}

function FieldInput({ item, value, onChange }) {
  if (item.type === "textarea") {
    return <textarea rows={5} value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder={item.placeholder || ""} />;
  }
  if (item.type === "select") {
    return (
      <select value={value ?? item.defaultValue ?? ""} onChange={(event) => onChange(event.target.value)}>
        {(item.options || []).map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    );
  }
  if (item.type === "checkbox") {
    return (
      <span className="quick-checkbox-control">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        <span>{value ? "Да" : "Нет"}</span>
      </span>
    );
  }
  return (
    <input
      type={item.type === "number" || item.type === "date" ? item.type : "text"}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={item.placeholder || ""}
    />
  );
}

export default function QuickArticleTypeFields({ type, form, onChange }) {
  const config = articleTypeConfig(type);
  if (!config.fields.length) return null;

  return (
    <section className="builder-section quick-type-fields-section">
      <div className="visual-editor-section-head">
        <span className="kicker">Поля типа</span>
        <h2>{config.label}</h2>
        <p>{config.description} Здесь отображаются только поля выбранного типа статьи.</p>
      </div>
      <div className="quick-type-fields-grid">
        {config.fields.map((item) => (
          <FieldShell key={item.key} item={item}>
            <FieldInput item={item} value={form[item.key]} onChange={(value) => onChange(item.key, value)} />
          </FieldShell>
        ))}
      </div>
    </section>
  );
}
