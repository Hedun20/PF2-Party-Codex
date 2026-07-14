import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronDown, Eye, Layers3, Lock, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import QuickArticleTypeFields from "../components/QuickArticleTypeFields.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import {
  ARTICLE_TYPE_CONFIG,
  articleTypeConfig,
  buildArticleForm,
  buildArticlePayload,
  changeArticleTypeForm,
  validateArticleForm,
  visibleLocationFields
} from "../utils/articleFormConfig.js";
import { citiesForContext, countriesForWorld } from "../utils/controlledMetadata.js";
import { labelCategory } from "../utils/labels.js";

function Field({ label, children, hint }) {
  return (
    <label className="codex-field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default function EditorPage({ onSaved, session, activeWorld = null }) {
  const [searchParams] = useSearchParams();
  const initialTitle = searchParams.get("title") || "";
  const initialWorld = searchParams.get("world") || activeWorld?.title || "";
  const initialType = searchParams.get("type") || "lore";
  const [metadata, setMetadata] = useState({ pages: [], worlds: [], countries: [], cities: [] });
  const [form, setForm] = useState(() => buildArticleForm({ initialType, initialTitle, initialWorld }));
  const [state, setState] = useState({ saving: false, error: "", success: "", createdPath: "" });

  useEffect(() => {
    api.metadata("gm").then(setMetadata).catch(() => {});
  }, []);

  useEffect(() => {
    setForm(buildArticleForm({ initialType, initialTitle, initialWorld }));
    setState({ saving: false, error: "", success: "", createdPath: "" });
  }, [initialType, initialTitle, initialWorld]);

  const worlds = metadata.worlds || [];
  const countries = countriesForWorld(metadata.pages || [], form.world);
  const cities = citiesForContext(metadata.pages || [], { world: form.world, country: form.country });
  const locationFields = visibleLocationFields(form.type);
  const selectedConfig = useMemo(() => articleTypeConfig(form.type), [form.type]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeType(type) {
    setForm((current) => changeArticleTypeForm(current, type));
    setState((current) => ({ ...current, error: "", success: "", createdPath: "" }));
  }

  function updateWorld(world) {
    setForm((current) => ({ ...current, world, country: "", city: "" }));
  }

  function updateCountry(country) {
    setForm((current) => ({ ...current, country, city: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    const errors = validateArticleForm(form);
    if (errors.length) {
      setState({ saving: false, error: errors.join(" "), success: "", createdPath: "" });
      return;
    }

    setState({ saving: true, error: "", success: "", createdPath: "" });
    try {
      const payload = buildArticlePayload(form);
      const result = await api.createPage(payload);
      const createdTitle = result.page?.title || payload.title;
      const createdPath = result.page?.path || "";
      setState({ saving: false, error: "", success: `Материал создан: ${createdTitle}`, createdPath });
      setForm(buildArticleForm({ initialType: form.type, initialWorld: form.type === "world" ? "" : form.world || initialWorld }));
      onSaved?.();
      api.metadata("gm").then(setMetadata).catch(() => {});
    } catch (error) {
      const duplicateHint = error?.message?.includes("already exists") ? " Материал с таким названием уже существует — измените название." : "";
      setState({ saving: false, error: `${error.message || "Не удалось создать материал."}${duplicateHint}`, success: "", createdPath: "" });
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
        <p>Один понятный поток: выберите тип, заполните его собственные поля, отделите публичную информацию от секретов мастера и сохраните запись в архив кампании.</p>
      </section>

      <form className="editor-form builder-form quick-create-shell" onSubmit={submit}>
        <section className="builder-section material-type-panel">
          <div className="material-type-copy">
            <span className="kicker">Шаг 1 · Тип материала</span>
            <h2>{selectedConfig.label}</h2>
            <p>{selectedConfig.description}</p>
          </div>
          <label className="material-type-select" htmlFor="material-type-select">
            <span className="material-type-select__label">Выберите тип</span>
            <span className="material-type-select__control">
              <Layers3 size={20} aria-hidden="true" />
              <select id="material-type-select" value={form.type} onChange={(event) => changeType(event.target.value)}>
                {ARTICLE_TYPE_CONFIG.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <ChevronDown className="material-type-select__chevron" size={20} aria-hidden="true" />
            </span>
          </label>
        </section>

        <section className="builder-section create-flow-section">
          <div className="visual-editor-section-head">
            <span className="kicker">Шаг 2 · Основное</span>
            <h2>Название, видимость и место в архиве</h2>
            <p>Страна обязательно принадлежит миру, город — миру и стране. Остальные материалы можно оставить глобальными или привязать к нужному контексту.</p>
          </div>
          <div className="codex-field-grid codex-field-grid--four">
            <Field label="Название"><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder={`Название: ${selectedConfig.label.toLowerCase()}`} required /></Field>
            <Field label="Видимость" hint="Защита применяется на backend, а не только скрывается в интерфейсе.">
              <select value={form.visibility} onChange={(event) => update("visibility", event.target.value)}>
                <option value="public">Public · видно игрокам</option>
                <option value="gm">GM private · только мастеру</option>
                <option value="draft">Черновик · не показывать игрокам</option>
              </select>
            </Field>
            <Field label="Категория"><input value={labelCategory(selectedConfig.category)} disabled /></Field>
            <Field label="Короткое описание"><input value={form.summary} onChange={(event) => update("summary", event.target.value)} placeholder="1–2 строки для карточки и поиска" /></Field>
          </div>

          <div className="codex-field-grid codex-field-grid--four article-location-grid hierarchy-field-grid">
            {locationFields.world ? (
              <Field label={form.type === "country" || form.type === "city" ? "Мир · обязательно" : "Мир"}>
                <select value={form.world || ""} onChange={(event) => updateWorld(event.target.value)} required={["country", "city"].includes(form.type)}>
                  <option value="">Без привязки к миру</option>
                  {worlds.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            ) : null}
            {locationFields.country ? (
              <Field label={form.type === "city" ? "Страна · обязательно" : "Страна"}>
                <select value={form.country || ""} onChange={(event) => updateCountry(event.target.value)} disabled={!form.world} required={form.type === "city"}>
                  <option value="">{form.world ? "Без привязки к стране" : "Сначала выберите мир"}</option>
                  {countries.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            ) : null}
            {locationFields.city ? (
              <Field label="Город">
                <select value={form.city || ""} onChange={(event) => update("city", event.target.value)} disabled={!form.country}>
                  <option value="">{form.country ? "Без привязки к городу" : "Сначала выберите страну"}</option>
                  {cities.map((page) => <option key={page.path} value={page.title}>{page.title}</option>)}
                </select>
              </Field>
            ) : null}
          </div>
        </section>

        <QuickArticleTypeFields type={form.type} form={form} onChange={update} />

        <section className="builder-section article-writing-workspace quick-article-workspace structured-article-builder">
          <div className="visual-editor-section-head">
            <span className="kicker">Шаг 3 · Текст</span>
            <h2>Игрокам и GM — разные блоки</h2>
            <p>Публичный текст войдёт в player-safe представление. Секреты мастера сохранятся отдельно и не попадут игрокам в API.</p>
          </div>
          <div className="structured-story-grid">
            <Field label="Публичный текст / что видят игроки" hint="Описание, слухи, внешний вид, публичная история и handout-текст.">
              <textarea className="story-textarea structured-textarea" rows={14} value={form.publicNotes} onChange={(event) => update("publicNotes", event.target.value)} placeholder="Что можно безопасно показать игрокам." />
            </Field>
            <Field label="GM секреты / правда мастера" hint="Скрытая правда, мотивы NPC, ловушки и условия reveal.">
              <textarea className="story-textarea structured-textarea structured-secret-textarea" rows={14} value={form.gmSecrets} onChange={(event) => update("gmSecrets", event.target.value)} placeholder="Игрокам не показывается." />
            </Field>
          </div>
        </section>

        <section className="builder-section article-meta-section">
          <div className="visual-editor-section-head">
            <span className="kicker">Шаг 4 · Связи</span>
            <h2>Теги и связанные статьи</h2>
          </div>
          <div className="article-meta-grid codex-field-grid">
            <Field label="Теги" hint="Разделяйте запятыми."><input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="культ, порт, тайна" /></Field>
            <Field label="Связанные статьи" hint="Можно указать названия существующих записей."><input value={form.related} onChange={(event) => update("related", event.target.value)} placeholder="Ноктгард, Леди Элира, Печать Пустоты" /></Field>
          </div>
        </section>

        {state.error ? <div className="status-message danger-message" role="alert"><AlertTriangle size={16} /> <span>{state.error}</span></div> : null}
        {state.success ? (
          <div className="status-message success-message" role="status">
            <CheckCircle2 size={16} />
            <span>{state.success}</span>
            {state.createdPath ? <Link to={`/page/${encodeURIComponent(state.createdPath)}`}>Открыть статью</Link> : null}
          </div>
        ) : null}

        <div className="article-submit-bar article-submit-bar--simple quick-create-submit-row">
          <CodexButton type="submit" className="quick-submit" size="md" disabled={state.saving}>
            <Sparkles size={17} /> <span>{state.saving ? "Создаю..." : `Создать: ${selectedConfig.label}`}</span>
          </CodexButton>
          <span className="status-message"><Eye size={16} /> Public видно игрокам</span>
          <span className="status-message"><Lock size={16} /> GM private и draft скрыты backend-ом</span>
        </div>
      </form>
    </div>
  );
}
