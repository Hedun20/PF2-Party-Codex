import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, RadioTower, ClipboardCopy, Eye, ImageIcon, MonitorPlay, Radio, Sparkles, UsersRound, XCircle } from "lucide-react";
import { api } from "../api/client.js";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { getWorldOwnedPages, isWorldPage, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";
import { labelCategory } from "../utils/labels.js";

function assetUrl(path = "") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/api/assets/") ? path : `/api/assets/${String(path).replace(/^images\//, "")}`;
}

function compactText(text = "", limit = 140) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "Описание пока не заполнено.";
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function playerUrl(world) {
  if (typeof window === "undefined") return `${worldRoute(world)}/player`;
  return `${window.location.origin}${worldRoute(world)}/player`;
}

function RevealPreview({ active, pages = [], emptyTitle = "Ничего не показано" }) {
  if (!active) {
    return (
      <section className="codex-card reveal-preview reveal-preview-empty">
        <div className="reveal-empty-orb"><Radio size={28} /></div>
        <h2>{emptyTitle}</h2>
        <p>Когда GM нажмёт Reveal, здесь появится player-safe карточка: картинка, краткое описание и публичный текст без GM-секретов.</p>
      </section>
    );
  }

  const image = assetUrl(active.image);
  return (
    <section className="codex-card reveal-preview reveal-preview-live">
      <div className="reveal-preview-head">
        <span className="kicker">Now revealing</span>
        <strong>{labelCategory(active.category)}</strong>
      </div>
      {image ? (
        <img className="reveal-preview-image" src={image} alt={active.title} />
      ) : (
        <div className="reveal-preview-image reveal-preview-image-empty"><ImageIcon size={36} /></div>
      )}
      <div className="reveal-preview-body">
        <h1>{active.title}</h1>
        <p>{active.summary || "Описание пока не заполнено."}</p>
        {active.note && <blockquote>{active.note}</blockquote>}
        <div className="tag-row">{(active.tags || []).slice(0, 5).map((tag) => <span key={tag}>{tag}</span>)}</div>
        {active.content && <MarkdownViewer content={active.content} pages={pages} />}
      </div>
    </section>
  );
}

function HandoutCard({ page, activePath, onReveal, disabled }) {
  const image = assetUrl(page.handoutImage || page.avatarImage || page.mapImage || page.image || page.tokenImage || page.frontmatter?.handoutImage || page.frontmatter?.avatarImage);
  const isActive = activePath === page.path;
  return (
    <article className={`codex-card reveal-handout-card ${isActive ? "is-active" : ""}`}>
      {image ? <img src={image} alt="" /> : <div className="reveal-handout-card-icon"><Eye size={24} /></div>}
      <div className="reveal-handout-card-body">
        <span className="kicker">{labelCategory(page.category)}</span>
        <h3>{page.title}</h3>
        <p>{compactText(page.summary || page.frontmatter?.summary)}</p>
      </div>
      <div className="reveal-handout-card-actions">
        <CodexButton as={Link} to={`/page/${encodeURIComponent(page.path)}`} variant="ghost" size="sm"><BookOpen size={14} /> Открыть</CodexButton>
        <CodexButton type="button" onClick={() => onReveal(page)} disabled={disabled} size="sm"><RadioTower size={14} /> {isActive ? "Показано" : "Reveal"}</CodexButton>
      </div>
    </article>
  );
}

export function PlayerPortalView({ pages = [] }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const [reveal, setReveal] = useState(null);

  useEffect(() => {
    if (!world) return;
    let alive = true;
    const load = () => api.revealGet(world.title).then((data) => alive && setReveal(data.reveal)).catch(() => {});
    load();
    const timer = window.setInterval(load, 3500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [world?.title]);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Player Portal</span>
          <h1>Мир не найден</h1>
          <p>Игроки открывают portal из конкретного мира, чтобы видеть только разрешённые handouts.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack player-portal-page">
      <section className="hero-panel reveal-hero reveal-player-hero">
        <div>
          <span className="kicker">Player Portal</span>
          <h1>{world.title}: экран игроков</h1>
          <p>Здесь появляется то, что GM прямо сейчас показывает группе. Секретные GM-блоки и приватные статьи сюда не попадают.</p>
        </div>
        <div className="reveal-live-badge"><MonitorPlay size={20} /> Waiting for GM reveal</div>
      </section>
      <RevealPreview active={reveal?.active} pages={pages} emptyTitle="GM пока ничего не показал" />
    </div>
  );
}

export default function PlayerRevealPage({ pages = [], session }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const [reveal, setReveal] = useState(null);
  const [message, setMessage] = useState("");
  const [busyPath, setBusyPath] = useState("");
  const [copied, setCopied] = useState(false);

  const handouts = useMemo(() => {
    if (!world) return [];
    return getWorldOwnedPages(pages, world)
      .filter((page) => page.path !== world.path && !isWorldPage(page) && page.visibility === "public")
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title));
  }, [pages, world]);

  useEffect(() => {
    if (!world) return;
    let alive = true;
    const load = () => api.revealGet(world.title).then((data) => alive && setReveal(data.reveal)).catch(() => {});
    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [world?.title]);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">Player Reveal</span>
          <h1>Мир не найден</h1>
          <p>Reveal открывается из конкретного мира, чтобы не смешивать handouts разных кампаний.</p>
          <CodexButton as={Link} to="/category/worlds" variant="secondary"><ArrowLeft size={16} /> К списку миров</CodexButton>
        </section>
      </div>
    );
  }

  async function revealPage(page) {
    setBusyPath(page.path);
    setMessage("");
    try {
      const data = await api.revealSet({ world: world.title, path: page.path });
      setReveal(data.reveal);
      setMessage(`Показано игрокам: ${page.title}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyPath("");
    }
  }

  async function clearReveal() {
    setMessage("");
    try {
      const data = await api.revealClear(world.title);
      setReveal(data.reveal);
      setMessage("Экран игроков очищен.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function copyPlayerLink() {
    const link = playerUrl(world);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const activePath = reveal?.active?.path || "";

  return (
    <div className="page-stack player-reveal-page">
      <section className="hero-panel reveal-hero">
        <div>
          <span className="kicker">Player Reveal / Handout Mode</span>
          <h1>{world.title}: показать игрокам</h1>
          <p>GM выбирает одну public/player-safe карточку, а игроки видят её на отдельном portal-экране. Это первый шаг к будущим player accounts и персонажам.</p>
          <div className="world-mode-actions">
            <CodexButton as={Link} to={worldRoute(world)} variant="secondary"><ArrowLeft size={16} /> Назад к миру</CodexButton>
            <CodexButton as={Link} to={`${worldRoute(world)}/player`} variant="ghost"><UsersRound size={16} /> Player portal</CodexButton>
            <CodexButton type="button" variant="ghost" onClick={copyPlayerLink}><ClipboardCopy size={16} /> {copied ? "Ссылка скопирована" : "Скопировать LAN link"}</CodexButton>
            <CodexButton type="button" variant="danger" onClick={clearReveal}><XCircle size={16} /> Очистить экран</CodexButton>
          </div>
        </div>
        <div className="reveal-status-card codex-card">
          <RadioTower size={25} />
          <strong>{reveal?.active ? "Сейчас показывается" : "Reveal пуст"}</strong>
          <span>{reveal?.active?.title || "Выбери handout ниже"}</span>
        </div>
      </section>

      {message && <div className={`status-message ${message.includes("нельзя") || message.includes("ошиб") ? "danger-message" : ""}`}>{message}</div>}

      <section className="reveal-layout-grid">
        <RevealPreview active={reveal?.active} pages={pages} />
        <section className="codex-card reveal-safety-card">
          <div className="session-panel-head">
            <div>
              <span className="kicker">Player-safe guard</span>
              <h2>Почему это безопаснее</h2>
            </div>
            <Sparkles size={20} />
          </div>
          <p>Reveal берёт статью через player-mode API. Если статья GM-only или содержит secret/GM Secrets, она не попадёт на экран игроков.</p>
          <ul className="session-tips-list">
            <li><Eye size={15} /> Показывай только public-материалы.</li>
            <li><MonitorPlay size={15} /> Игроки открывают `/player` и ждут reveal.</li>
            <li><UsersRound size={15} /> Позже сюда лягут player accounts и персонажи.</li>
          </ul>
        </section>
      </section>

      <section className="section-band reveal-handout-band">
        <div className="section-title-row">
          <div>
            <span className="kicker">Public handouts</span>
            <h2>Что можно показать сейчас</h2>
          </div>
          <span>{handouts.length} player-safe карточек</span>
        </div>
        {handouts.length ? (
          <div className="reveal-handout-grid">
            {handouts.map((page) => <HandoutCard key={page.path} page={page} activePath={activePath} onReveal={revealPage} disabled={busyPath === page.path} />)}
          </div>
        ) : (
          <p className="empty-copy">Публичных handouts в этом мире пока нет. Сделай NPC, локацию, картинку или слух `visibility: public`.</p>
        )}
      </section>
    </div>
  );
}
