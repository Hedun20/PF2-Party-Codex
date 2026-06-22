import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, RadioTower, CheckCircle2, ClipboardCopy, Eye, FileText, MapPinned, PenLine, PlayCircle, ScrollText, ShieldAlert, Sparkles, Swords, UsersRound } from "lucide-react";
import CodexButton from "../components/ui/CodexButton.jsx";
import { api } from "../api/client.js";
import { getWorldOwnedPages, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";

const QUEST_DONE_RE = /^(done|completed|complete|closed|failed|archived|cancelled|canceled|готово|закрыт|провален|архив)/i;

function lowerValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function pageDateValue(page) {
  return page?.frontmatter?.sessionDate
    || page?.frontmatter?.date
    || page?.frontmatter?.updated
    || page?.frontmatter?.created
    || page?.mtime
    || page?.updatedAt
    || page?.createdAt
    || "";
}

function sortByDateDesc(a, b) {
  return String(pageDateValue(b)).localeCompare(String(pageDateValue(a)));
}

function isActiveQuest(page) {
  if (page?.category !== "quests" && page?.type !== "quest") return false;
  const status = lowerValue(page?.frontmatter?.status || page?.status);
  return !QUEST_DONE_RE.test(status);
}

function isNpcLike(page) {
  return ["npcs", "enemies", "characters"].includes(page?.category) || ["npc", "enemy", "pc"].includes(page?.type);
}

function isSessionLike(page) {
  return page?.category === "sessions" || page?.type === "session";
}

function compactText(text = "", fallback = "Описание пока не заполнено.") {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return fallback;
  return value.length > 118 ? `${value.slice(0, 115)}...` : value;
}

function editorCreateLink(world, type = "session", title = "") {
  const params = new URLSearchParams();
  params.set("world", world.title);
  params.set("type", type);
  if (title) params.set("title", title);
  return `/editor?${params.toString()}`;
}

function sessionStorageKey(world) {
  return `pf2-session-mode:${world?.path || world?.title || "world"}`;
}

function ListPanel({ title, kicker, icon: Icon, items = [], empty, cta, onReveal, revealDisabled }) {
  return (
    <section className="codex-card session-panel">
      <div className="session-panel-head">
        <div>
          <span className="kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
        {Icon && <Icon size={20} />}
      </div>
      {items.length ? (
        <div className="session-link-list">
          {items.map((page) => (
            <div key={page.path} className="session-link-row">
              <Link to={`/page/${encodeURIComponent(page.path)}`} className="session-link-item">
                <strong>{page.title}</strong>
                <span>{compactText(page.summary || page.frontmatter?.summary)}</span>
              </Link>
              {onReveal && (
                <button type="button" className="session-reveal-button" onClick={() => onReveal(page)} disabled={revealDisabled === page.path}>
                  <RadioTower size={14} /> Reveal
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="session-empty">{empty}</p>
      )}
      {cta}
    </section>
  );
}

function ChecklistItem({ children }) {
  return <li><CheckCircle2 size={16} /> <span>{children}</span></li>;
}

export default function SessionModePage({ pages = [], mode = "player", session }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [revealMessage, setRevealMessage] = useState("");
  const [revealingPath, setRevealingPath] = useState("");

  useEffect(() => {
    if (!world) return;
    setNotes(localStorage.getItem(sessionStorageKey(world)) || "");
  }, [world?.path]);

  useEffect(() => {
    if (!world) return;
    localStorage.setItem(sessionStorageKey(world), notes);
  }, [world?.path, notes]);

  const ownedPages = useMemo(() => world ? getWorldOwnedPages(pages, world).filter((page) => page.path !== world.path) : [], [pages, world]);
  const maps = ownedPages.filter((page) => page.mapImage).slice(0, 5);
  const activeQuests = ownedPages.filter(isActiveQuest).slice(0, 5);
  const npcs = ownedPages.filter(isNpcLike).slice(0, 6);
  const handouts = ownedPages.filter((page) => page.visibility === "public").slice(0, 5);
  const lastSessions = ownedPages.filter(isSessionLike).sort(sortByDateDesc).slice(0, 3);
  const nextTitle = world ? `${world.title}: session recap` : "Session recap";

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Session Mode</span>
          <h1>Мир не найден</h1>
          <p>Режим сессии открывается из конкретного мира, чтобы сохранить тему, музыку и контекст.</p>
          <CodexButton as={Link} to="/category/worlds" variant="secondary"><ArrowLeft size={16} /> К списку миров</CodexButton>
        </section>
      </div>
    );
  }

  const copyNotes = async () => {
    const text = notes.trim() || `# ${nextTitle}\n\n## Что произошло\n- \n\n## Кого встретили\n- \n\n## Крючки на следующую игру\n- `;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const revealHandout = async (page) => {
    if (!world || !page) return;
    setRevealMessage("");
    setRevealingPath(page.path);
    try {
      await api.revealSet({ world: world.title, path: page.path });
      setRevealMessage(`Показано игрокам: ${page.title}`);
    } catch (error) {
      setRevealMessage(error.message);
    } finally {
      setRevealingPath("");
    }
  };

  return (
    <div className="page-stack session-mode-page">
      <section className="hero-panel session-hero-panel">
        <div className="session-hero-copy">
          <span className="kicker">Session Mode</span>
          <h1>{world.title}: режим игры</h1>
          <p>Один экран для ведения партии: сцены, карты, NPC, активные квесты, handouts и черновые заметки. Тема и World Sound остаются от текущего мира.</p>
          <div className="world-mode-actions">
            <CodexButton as={Link} to={worldRoute(world)} variant="secondary"><ArrowLeft size={16} /> Назад к миру</CodexButton>
            {session?.canEdit && <CodexButton as={Link} to={editorCreateLink(world, "session", nextTitle)}><BookOpen size={16} /> Создать recap</CodexButton>}
            <CodexButton type="button" variant="ghost" onClick={copyNotes}><ClipboardCopy size={16} /> {copied ? "Скопировано" : "Скопировать заметки"}</CodexButton>
            <CodexButton as={Link} to={`${worldRoute(world)}/reveal`} variant="ghost"><RadioTower size={16} /> Reveal Mode</CodexButton>
          </div>
        </div>
        <div className="session-readiness codex-card">
          <div className="session-live-orb"><PlayCircle size={30} /></div>
          <h2>Перед стартом</h2>
          <ul>
            <ChecklistItem>Включи World Sound в верхней панели.</ChecklistItem>
            <ChecklistItem>Открой первую карту или сцену.</ChecklistItem>
            <ChecklistItem>Подготовь 2–3 NPC, которых партия может встретить.</ChecklistItem>
            <ChecklistItem>После игры скопируй заметки в recap.</ChecklistItem>
          </ul>
        </div>
      </section>

      {revealMessage && <div className={`status-message ${revealMessage.includes("нельзя") ? "danger-message" : ""}`}>{revealMessage}</div>}

      <section className="session-mode-grid">
        <section className="codex-card session-notes-panel">
          <div className="session-panel-head">
            <div>
              <span className="kicker">Live notes</span>
              <h2>Заметки сессии</h2>
            </div>
            <PenLine size={20} />
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={`# ${nextTitle}\n\n## Что произошло\n- \n\n## Кого встретили\n- \n\n## Крючки на следующую игру\n- `}
          />
          <div className="session-notes-actions">
            <CodexButton type="button" onClick={copyNotes}><ClipboardCopy size={16} /> {copied ? "Скопировано" : "Скопировать"}</CodexButton>
            {session?.canEdit && <CodexButton as={Link} to={editorCreateLink(world, "session", nextTitle)} variant="secondary"><FileText size={16} /> Открыть recap</CodexButton>}
            <CodexButton type="button" variant="ghost" onClick={() => setNotes("")}>Очистить</CodexButton>
          </div>
          <p className="session-note-hint">Заметки сохраняются локально в браузере для этого мира. Это черновик, не финальная статья vault — после игры скопируй его в recap.</p>
        </section>

        <ListPanel title="Сцены и карты" kicker="Открыть сейчас" icon={MapPinned} items={maps} empty="Карты появятся здесь, когда у статьи есть mapImage." cta={<Link className="small-context-link" to={`${worldRoute(world)}/maps`}>Все карты мира</Link>} />
        <ListPanel title="Активные квесты" kicker="Ставки партии" icon={Swords} items={activeQuests} empty="Создай quest со статусом active/idea — он появится в режиме сессии." cta={session?.canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "quest")}>Создать квест</Link> : null} />
        <ListPanel title="NPC / враги" kicker="Кого играть" icon={UsersRound} items={npcs} empty="NPC и враги мира появятся здесь после привязки к миру." cta={session?.canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "npc")}>Создать NPC</Link> : null} />
        <ListPanel title="Player handouts" kicker="Показать игрокам" icon={Eye} items={handouts} empty="Публичные статьи мира станут быстрыми handouts для игроков." onReveal={session?.canEdit ? revealHandout : null} revealDisabled={revealingPath} cta={<Link className="small-context-link" to={`${worldRoute(world)}/reveal`}>Открыть полный Reveal Mode</Link>} />
        <ListPanel title="Последние recap" kicker="Память кампании" icon={BookOpen} items={lastSessions} empty="После первой игры создай recap, и он появится здесь." cta={session?.canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "session", nextTitle)}>Новый recap</Link> : null} />

        <section className="codex-card session-panel session-danger-panel">
          <div className="session-panel-head">
            <div>
              <span className="kicker">GM safety</span>
              <h2>Что не показывать случайно</h2>
            </div>
            <ShieldAlert size={20} />
          </div>
          <p>В Session Mode handout-блок берёт только public-страницы. GM/secret материалы остаются в мастерском режиме и не должны попадать в player view.</p>
          <ul className="session-tips-list">
            <li><Sparkles size={15} /> Для раскрытия игрокам меняй visibility на public.</li>
            <li><ScrollText size={15} /> Секреты лучше держать в GM notes/secret blocks.</li>
            <li><Eye size={15} /> Перед показом статьи открой её как player preview.</li>
          </ul>
        </section>
      </section>
    </div>
  );
}
