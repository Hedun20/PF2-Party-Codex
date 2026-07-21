import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock3, FileText, MapPinned, NotebookPen, ShieldAlert, Sparkles, UserRound } from "lucide-react";
import { api } from "../api/client.js";
import { CodexButton, EmptyState, PageHero, PageShell, StatusMessage } from "../components/ui/index.js";

const recentSections = ["entries", "maps", "timelineEvents", "sessions", "handouts"];
const countSections = ["entries", "maps", "timelineEvents", "sessions", "handouts", "characters", "notes"];

const sectionMeta = {
  entries: { label: "Статьи", icon: FileText, path: "/category/lore", empty: "Статьи архива пока не созданы." },
  maps: { label: "Карты", icon: MapPinned, path: "/maps", empty: "Карты пока не добавлены." },
  timelineEvents: { label: "Хронология", icon: Clock3, path: "/timeline", empty: "События хронологии пока не добавлены." },
  sessions: { label: "Сессии", icon: BookOpen, path: "/sessions", empty: "Сессии пока не запланированы." },
  handouts: { label: "Материалы", icon: Sparkles, path: "/handouts", empty: "Handouts пока не открыты игрокам." },
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

const itemMetaLabels = {
  map: "Карта",
  timelineEvent: "Событие хронологии",
  session: "Сессия",
  handout: "Материал",
  public: "Доступно игрокам",
  revealed: "Открыто игрокам",
  gm: "Только GM",
  private: "Приватное",
  draft: "Черновик",
  entries: "Статья",
  maps: "Карта",
  timelineEvents: "Событие хронологии",
  sessions: "Сессия",
  handouts: "Материал"
};

function itemSubline(item = {}, section = "") {
  const kind = itemMetaLabels[item.type] || itemMetaLabels[item.category] || itemMetaLabels[section] || "";
  const visibility = itemMetaLabels[item.visibility] || "";
  const status = item.status && item.status !== item.visibility ? (itemMetaLabels[item.status] || item.status) : "";
  return [kind, visibility, status, item.dateLabel, item.scheduledAt].filter(Boolean).join(" · ");
}

function itemTarget(section, item = {}) {
  if (section === "entries" && item.path) return `/page/${encodeURIComponent(item.path)}`;
  return sectionMeta[section]?.path || "/archive";
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
      <Icon size={20} aria-hidden="true" />
      <span>{sectionLabel(section)}</span>
      <strong>{Number(value || 0)}</strong>
    </Link>
  );
}

function RecentSection({ section, items, manager }) {
  const meta = sectionMeta[section] || sectionMeta.entries;
  const Icon = meta.icon;
  return (
    <article className="codex-card archive-recent-card">
      <div className="archive-recent-head">
        <Icon size={18} aria-hidden="true" />
        <span className="kicker">{sectionLabel(section)}</span>
      </div>
      {items.length ? (
        <div className="archive-recent-list-shell">
          <ul className={items.length > 5 ? "archive-recent-list is-scrollable" : "archive-recent-list"}>
            {items.map((item, index) => (
              <li key={item?.id || item?._id || `${section}-${index}`}>
                <Link to={itemTarget(section, item)}>
                  <strong>{itemLabel(item)}</strong>
                  {itemSubline(item, section) ? <span>{itemSubline(item, section)}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          {items.length > 5 ? <span className="archive-recent-more">Ещё {items.length - 5} — прокрутите список</span> : null}
        </div>
      ) : (
        <p>{manager ? meta.empty : "Пока нет материалов, доступных игроку."}</p>
      )}
      <CodexButton variant="ghost" size="sm" to={meta.path}>Открыть раздел</CodexButton>
    </article>
  );
}

export default function CampaignArchivePage({ session }) {
  const campaignId = useMemo(() => activeCampaignId(session), [session]);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (!campaignId) {
      setState({ loading: false, data: null, error: null });
      return undefined;
    }

    let active = true;
    setState({ loading: true, data: null, error: null });
    api.campaignArchive(campaignId)
      .then((data) => {
        if (active) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (active) setState({ loading: false, data: null, error: { status: error.status || 0, message: error.message || "Архив кампании недоступен." } });
      });

    return () => {
      active = false;
    };
  }, [campaignId, reloadKey]);

  const data = state.data || {};
  const archive = data.archive || {};
  const counts = archive.counts || {};
  const recent = archive.recent || {};
  const availableSections = archive.availableSections || [];
  const campaign = data.campaign || session?.activeCampaign || {};
  const workspace = data.workspace || session?.activeWorkspace || {};
  const role = data.role || session?.activeMembership?.role || "player";
  const manager = isManager(role);
  const visibilityLabel = archive.visibility === "gm" ? "GM видит публичные и приватные материалы" : "Игрок видит только публичные и открытые материалы";
  const accessChanged = state.error && [401, 403].includes(Number(state.error.status));

  return (
    <PageShell className="archive-page">
      <PageHero
        className="archive-hero"
        kicker="Архив кампании"
        title={campaign?.name || "Архив кампании"}
        description={campaignId ? "Единый архив активной кампании: статьи, карты, timeline, сессии, handouts, персонажи и заметки." : "Нет активной кампании для текущей сессии."}
      >
        <div className="workspace-identity-strip">
          {workspace?.name ? <span>Workspace: {workspace.name}</span> : null}
          <span>Роль: {role}</span>
          <span>{visibilityLabel}</span>
        </div>
      </PageHero>

      {!campaignId ? (
        <EmptyState
          icon={ShieldAlert}
          kicker="Архив недоступен"
          title="Активная кампания не выбрана"
          description="Создайте кампанию или примите приглашение перед открытием архива."
          actionLabel="Выбрать кампанию"
          actionTo="/campaigns"
        />
      ) : null}

      {state.error ? (
        <EmptyState
          icon={ShieldAlert}
          kicker={accessChanged ? "Доступ изменился" : "Архив недоступен"}
          title={accessChanged ? "Проверьте активную кампанию" : "Не удалось загрузить архив"}
          description={state.error.message}
          actionLabel={accessChanged ? "Выбрать кампанию" : "Повторить"}
          actionTo={accessChanged ? "/campaigns" : undefined}
          onAction={accessChanged ? undefined : () => setReloadKey((value) => value + 1)}
        />
      ) : null}

      {state.loading ? <StatusMessage>Собираю актуальную сводку активной кампании…</StatusMessage> : null}

      {state.data ? (
        <>
          <section className="archive-summary-grid" aria-label="Сводка архива">
            {countSections.map((section) => <ArchiveCountCard key={section} section={section} value={counts[section]} />)}
          </section>

          <section className="codex-card workspace-status-card">
            <span className="kicker">Состояние архива</span>
            <p>{availableSections.length ? "В кампании уже есть материалы в разделах ниже." : manager ? "Архив пока пустой. Начните с создания статьи, карты или handout." : "Мастер пока не открыл материалы игрокам."}</p>
            <div className="archive-chip-row">
              {availableSections.length ? availableSections.map((section) => <span key={section}>{sectionLabel(section)}</span>) : <span>Нет активных разделов</span>}
            </div>
            {manager ? (
              <div className="workspace-stats-row">
                <CodexButton to="/editor" size="sm">Создать статью</CodexButton>
                <CodexButton to="/maps" variant="secondary" size="sm">Добавить карту</CodexButton>
                <CodexButton to="/handouts" variant="ghost" size="sm">Материалы / Reveal</CodexButton>
              </div>
            ) : null}
          </section>

          <section className="archive-recent-grid" aria-label="Последние материалы архива">
            {recentSections.map((section) => <RecentSection key={section} section={section} items={Array.isArray(recent[section]) ? recent[section] : []} manager={manager} />)}
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
