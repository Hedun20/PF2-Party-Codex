import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock3, FileText, MapPinned, NotebookPen, Sparkles, UserRound } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

const recentSections = ["entries", "maps", "timelineEvents", "sessions", "handouts"];
const countSections = ["entries", "maps", "timelineEvents", "sessions", "handouts", "characters", "notes"];

const sectionMeta = {
  entries: { label: "Статьи", icon: FileText, path: "/category/lore", empty: "Статьи архива пока не созданы." },
  maps: { label: "Карты", icon: MapPinned, path: "/maps", empty: "Карты пока не добавлены." },
  timelineEvents: { label: "Timeline", icon: Clock3, path: "/timeline", empty: "События timeline пока не добавлены." },
  sessions: { label: "Сессии", icon: BookOpen, path: "/sessions", empty: "Сессии пока не запланированы." },
  handouts: { label: "Материалы игрокам", icon: Sparkles, path: "/handouts", empty: "Материалы пока не открыты игрокам." },
  characters: { label: "Персонажи", icon: UserRound, path: "/characters", empty: "Персонажи пока не добавлены." },
  notes: { label: "Заметки", icon: NotebookPen, path: "/notes", empty: "Заметки пока не созданы." }
};

function entityId(entity) {
  return entity?.id || entity?._id || entity?.campaignId || "";
}

function activeCampaignId(session) {
  return entityId(session?.activeCampaign) || session?.activeMembership?.campaignId || "";
}

function itemLabel(item) {
  return item?.title || item?.name || item?.label || item?.summary || item?.id || item?._id || "Без названия";
}

function itemSubline(item = {}) {
  const parts = [item.type, item.category, item.visibility, item.status, item.dateLabel, item.scheduledAt].filter(Boolean);
  return parts.join(" · ");
}

function sectionLabel(section) {
  return sectionMeta[section]?.label || section.replace(/([A-Z])/g, " $1");
}

function isManager(role = "") {
  return ["owner", "gm"].includes(String(role).toLowerCase());
}

function ArchiveCountCard({ section, value }) {
  const meta = sectionMeta[section] || sectionMeta.entries;
  const Icon = meta.icon;
  return (
    <Link to={meta.path} className="codex-card archive-count-card">
      <Icon size={20} />
      <span>{sectionLabel(section)}</span>
      <strong>{Number(value || 0)}</strong>
    </Link>
  );
}

function RecentSection({ section, items, manager }) {
  const meta = sectionMeta[section] || sectionMeta.entries;
  return (
    <article className="codex-card archive-recent-card">
      <span className="kicker">{sectionLabel(section)}</span>
      {items.length ? (
        <ul>
          {items.map((item, index) => (
            <li key={item?.id || item?._id || `${section}-${index}`}>
              <strong>{itemLabel(item)}</strong>
              {itemSubline(item) ? <span> · {itemSubline(item)}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>{manager ? meta.empty : "Пока нет материалов, доступных игроку."}</p>
      )}
      <CodexButton as={Link} variant="ghost" size="sm" to={meta.path}>Открыть раздел</CodexButton>
    </article>
  );
}

export default function CampaignArchivePage({ session }) {
  const campaignId = useMemo(() => activeCampaignId(session), [session]);
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!campaignId) {
      setState({ loading: false, data: null, error: "" });
      return;
    }

    let active = true;
    setState({ loading: true, data: null, error: "" });
    api.campaignArchive(campaignId)
      .then((data) => {
        if (active) setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (active) setState({ loading: false, data: null, error: error.message || "Архив кампании недоступен." });
      });

    return () => {
      active = false;
    };
  }, [campaignId]);

  const data = state.data || {};
  const archive = data.archive || {};
  const rawCounts = archive.counts || {};
  const counts = Object.fromEntries(countSections.map((section) => [section, rawCounts[section] || 0]));
  const recent = archive.recent || {};
  const availableSections = archive.availableSections || [];
  const campaign = data.campaign || session?.activeCampaign || {};
  const workspace = data.workspace || session?.activeWorkspace || {};
  const role = data.role || session?.activeMembership?.role || "player";
  const manager = isManager(role);
  const visibilityLabel = archive.visibility === "gm" ? "GM видит публичные и приватные материалы" : "Игрок видит только публичные и открытые материалы";

  return (
    <div className="page-stack archive-page">
      <section className="hero-panel archive-hero">
        <span className="kicker">Архив кампании</span>
        <h1>{campaign?.name || "Архив кампании"}</h1>
        <p>{campaignId ? "Единый архив активной кампании: статьи, карты, timeline, сессии, материалы игрокам, персонажи и заметки." : "Нет активной кампании для текущей сессии."}</p>
        <div className="workspace-identity-strip">
          {workspace?.name ? <span>Workspace: {workspace.name}</span> : null}
          <span>Роль: {role}</span>
          <span>{visibilityLabel}</span>
        </div>
      </section>

      {!campaignId ? (
        <section className="codex-card workspace-status-card">
          <span className="kicker">Архив недоступен</span>
          <p>Создайте кампанию или примите приглашение перед открытием архива.</p>
        </section>
      ) : null}

      {state.error ? (
        <section className="codex-card workspace-status-card">
          <span className="kicker">Архив недоступен</span>
          <p>{state.error}</p>
        </section>
      ) : null}

      {state.loading ? (
        <section className="codex-card workspace-status-card">
          <span className="kicker">Загрузка архива</span>
          <p>Получаю сводку активной кампании.</p>
        </section>
      ) : null}

      {state.data ? (
        <>
          <section className="archive-summary-grid" aria-label="Сводка архива">
            {countSections.map((key) => <ArchiveCountCard key={key} section={key} value={counts[key]} />)}
          </section>

          <section className="codex-card workspace-status-card">
            <span className="kicker">Состояние архива</span>
            <p>{availableSections.length ? "В кампании уже есть данные в разделах ниже." : manager ? "Архив пока пустой. Начните с создания статьи, карты или материала игрокам." : "Мастер пока не открыл материалы игрокам."}</p>
            <div className="archive-chip-row">
              {availableSections.length ? availableSections.map((section) => <span key={section}>{sectionLabel(section)}</span>) : <span>Нет активных разделов</span>}
            </div>
            {manager ? (
              <div className="workspace-stats-row">
                <CodexButton as={Link} size="sm" to="/editor">Создать статью</CodexButton>
                <CodexButton as={Link} variant="secondary" size="sm" to="/maps">Добавить карту</CodexButton>
                <CodexButton as={Link} variant="ghost" size="sm" to="/handouts">Материалы игрокам</CodexButton>
              </div>
            ) : null}
          </section>

          <section className="archive-recent-grid" aria-label="Последние материалы архива">
            {recentSections.map((section) => <RecentSection key={section} section={section} items={Array.isArray(recent[section]) ? recent[section] : []} manager={manager} />)}
          </section>
        </>
      ) : null}
    </div>
  );
}
