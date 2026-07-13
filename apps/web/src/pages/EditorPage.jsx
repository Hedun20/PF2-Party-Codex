import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Eye, Lock, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import { articleTypes, categoryByType } from "../components/ArticleVisualEditor.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { citiesForContext, countriesForWorld } from "../utils/controlledMetadata.js";
import { labelCategory } from "../utils/labels.js";

function normalizeType(value = "") {
  return articleTypes.some(([type]) => type === value) ? value : "lore";
}

function visibleLocationFields(type = "lore") {
  return {
    world: type !== "world",
    country: !["world", "country"].includes(type),
    city: !["world", "country", "city"].includes(type)
  };
}

function splitList(value = "") {
  return String(value || "")
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({ label, children, hint }) {
  return (
    <label className="codex-field">
      {label}
      {children}
      {hint ? <span>{hint}</span> : null}
    </label>
  );
}

function buildInitialForm({ initialType, initialTitle, initialWorld }) {
  const type = normalizeType(initialType);
  return {
    type,
    name: initialTitle || "",
    title: initialTitle || "",
    visibility: "public",
    category: categoryByType[type] || "lore",
    world: type === "world" ? "" : initialWorld,
    country: "",
    city: "",
    summary: "",
    publicNotes: "",
    gmSecrets: "",
    tags: "",
    related: ""
  };
}

export default function EditorPage({ onSaved, session, activeWorld = null }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialWorld = searchParams.get("world") || activeWorld?.title || "";
  const initialType = searchParams.get("type") || "lore";
  const [metadata, setMetadata] = useState({ pages: [], worlds: [], countries: [], cities: [] });
  const [form, setForm] = useState(() => buildInitialForm({ initialType, initialTitle, initialWorld }));
  const [state, setState] = useState({ saving: false, error: "", success: "" });

  useEffect(() => {
    api.metadata("gm").then(setMetadata).catch(() => {});
  }, []);

  useEffect(() => {
    setForm(buildInitialForm({ initialType, initialTitle, initialWorld }));
  }, [initialType, initialTitle, initialWorld]);

  const worlds = metadata.worlds || [];
  const countries = countriesForWorld(metadata.pages || [], form.world);
  const cities = citiesForContext(metadata.pages || [], { world: form.world, country: form.country });
  const locationFields = visibleLocationFields(form.type);
  const category = categoryByType[form.type] || form.category || "lore";
  const selectedTypeLabel = useMemo(() => articleTypes.find(([value]) => value === form.type)?.[1] || "Материал", [form.type]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeType(type) {
    setForm((current) => ({
      ...current,
      type,
      category: categoryByType[type] || "lore",
      world: type === "world" ? "" : current.world,
      country: ["world", "country"].includes(type) ? "" : current.country,
      city: ["world", "country", "city"].includes(type) ? "" : current.city
    }));
  }

  function updateWorld(world) {
    setForm((current) => ({ ...current, world, country: "", city: "" }));
  }

  function updateCountry(country) {
    setForm((current) => ({ ...current, country, city: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    setState({ saving: false, error: "", success: "" });
    const title = (form.name || form.title || "").trim();
    if (!title) {
      setState({ saving: false, error: "Введите название материала.", success: "" });
      return;
    }
    setState({ saving: true, error: "", success: "" });
    try {
      const payload = {
        ...form,
        name: title,
        title,
        category,
        tags: splitList(form.tags),
        related: splitList(form.related),
        summary: form.summary.trim(),
        publicNotes: form.publicNotes.trim(),
        gmSecrets: form.gmSecrets.trim()
      };
      const result = await api.createPage(payload);
      setState({ saving: false, error: "", success: `Материал создан: ${result.page?.title || title}` });
      onSaved?.();
      api.metadata("gm").then(setMetadata).catch(() => {});
    } catch (error) {
      setState({ saving: false, error: error.message || "Не удалось создать материал.", success: "" });
    }
  }

  if (!session?.canEdit) {
    return (
      <div className="page-stack">
        <section className="hero-panel">
          <span className="kicker">Доступ закрыт</span>
          <h1>Создание материалов доступно только GM</h1>
          <p>Создавать и редактировать материалы кампании может владелец кампании или GM. Права берутся из active membership.</p>
          <CodexButton as={Link} variant="secondary" to="/guide">Открыть гайд</CodexButton>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack create-article-page">
      <section className="hero-panel">
        <span className="kicker">Создание материала</span>
        <h1>{initialWorld ? `Создать в мире: ${initialWorld}` : "Создать статью"}</h1>
        <p>Быстрый рабочий экран GM: тип, видимость, привязка к миру, публичный текст и секреты мастера разделены сразу.</p>
      </section>

      <form className="editor-form builder-form quick-create-shell" onSubmit={submit}>
        <section className="builder-section quick-create-panel">
          <div className="quick-create-copy">
            <span className="kicker">Тип материала</span>
            <h2>{selectedTypeLabel}</h2>
            <p>Выберите, что создаёт GM: мир, город, NPC, квест, лор, карту или событие.</p>
          </div>
          <div className="type-grid compact-type-grid">
            {articleTypes.map(([value, label]) => (
              <button key={value} type="button" className={form.type === value ? "type-chip active" : "type-chip"} onClick={() => changeType(value)}>{label}</button>
            ))}
          </div>
        </section>

        <section className="builder-section create-flow-section">
          <div className="visual-editor-section-head">
            <span className="kicker">Основное</span>
            <h2>Название, видимость и место в архиве</h2>
            <p>Мир не выбирает мир, страна выбирает мир, город выбирает страну, остальные материалы можно привязать к миру, стране или городу.</p>
          </div>
          <div className="codex-field-grid codex-field-grid--four">
            <Field label="Название"><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Например: Капитан Варос" /></Field>
            <Field label="Видимость" hint="Public видно игрокам. GM private скрыто от игроков. Черновик не показывается игрокам.">
              <select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}>
                <option value="public">Public · видно игрокам</option>
                <option value="gm">GM private · только мастеру</option>
                <option value="draft">Черновик · не показывать игрокам</option>
              </select>
            </Field>
            <Field label="Категория"><input value={labelCategory(category)} disabled /></Field>
            <Field label="Короткое summary"><input value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="1–2 строки для списка и поиска" /></Field>
          </div>

          <div className="codex-field-grid codex-field-grid--four article-location-grid">
            {locationFields.world ? (
              <Field label="Мир">
                <select value={form.world || ""} onChange={(event) => updateWorld(event.target.value)}>
                  <option value="">Без привязки к миру</option>
                  {worlds.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            ) : null}
            {locationFields.country ? (
              <Field label="Страна">
                <select value={form.country || ""} onChange={(event) => updateCountry(event.target.value)}>
                  <option value="">Без привязки к стране</option>
                  {countries.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            ) : null}
            {locationFields.city ? (
              <Field label="Город">
                <select value={form.city || ""} onChange={(event) => update("city", event.target.value)}>
                  <option value="">Без привязки к городу</option>
                  {cities.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
        </section>

        <section className="builder-section article-writing-workspace quick-article-workspace structured-article-builder">
          <div className="visual-editor-section-head">
            <span className="kicker">Текст</span>
            <h2>Для игроков и для GM отдельно</h2>
            <p>Публичный текст можно показывать участникам. Секреты GM скрыты от игроков.</p>
          </div>
          <div className="structured-story-grid">
            <Field label="Публичный текст / что видят игроки" hint="Описание, слухи, внешний вид, публичная история, handout-текст.">
              <textarea className="story-textarea structured-textarea" rows={14} value={form.publicNotes} onChange={(event) => update("publicNotes", event.target.value)} placeholder="Что можно безопасно показать игрокам." />
            </Field>
            <Field label="GM секреты / правда мастера" hint="Скрытая правда, мотивы NPC, ловушки, условия reveal.">
              <textarea className="story-textarea structured-textarea structured-secret-textarea" rows={14} value={form.gmSecrets} onChange={(event) => update("gmSecrets", event.target.value)} placeholder="Игрокам не показывается." />
            </Field>
          </div>
        </section>

        <section className="builder-section article-meta-section">
          <div className="article-meta-grid">
            <Field label="Теги"><input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="через запятую: культ, порт, тайна" /></Field>
            <Field label="Связанные статьи"><input value={form.related} onChange={(event) => update("related", event.target.value)} placeholder="через запятую: Город, NPC, Квест" /></Field>
          </div>
        </section>

        {state.error ? <div className="status-message danger-message"><AlertTriangle size={16} /> {state.error}</div> : null}
        {state.success ? <div className="status-message success-message"><CheckCircle2 size={16} /> {state.success}</div> : null}

        <div className="article-submit-bar">
          <div className="article-visibility-status" aria-label="Статус видимости материала">
            <span className="article-status-chip article-status-chip--public"><Eye size={16} /> Public видно игрокам</span>
            <span className="article-status-chip article-status-chip--private"><Lock size={16} /> GM private скрыто</span>
          </div>
          <CodexButton type="submit" className="quick-submit" size="md" disabled={state.saving}>
            <Sparkles size={17} /> <span>{state.saving ? "Создаю..." : "Создать статью"}</span>
          </CodexButton>
        </div>
      </form>
    </div>
  );
}
