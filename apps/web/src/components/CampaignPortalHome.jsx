import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  FilePlus2,
  FileText,
  MapPinned,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Swords,
  UserRound,
  UsersRound
} from "lucide-react";
import { api } from "../api/client.js";
import { CodexButton, CodexCard, EmptyState, PageHero, PageShell, SectionHeader, StatusMessage } from "./ui/index.js";

const sectionMeta = {
  entries: { label: "Статьи", path: "/archive", icon: FileText },
  maps: { label: "Карты", path: "/maps", icon: MapPinned },
  timelineEvents: { label: "Timeline", path: "/timeline", icon: Clock3 },
  sessions: { label: "Сессии", path: "/sessions", icon: CalendarDays },
  handouts: { label: "Материалы", path: "/handouts", icon: Sparkles },
  characters: { label: "Персонажи", path: "/characters", icon: UserRound },
  notes: { label: "Заметки", path: "/notes", icon: NotebookPen }
};

const recentSections = ["entries", "handouts", "timelineEvents", "sessions", "maps"];

const gmActions = [
  { title: "Архив кампании", description: "Статьи, миры, локации и история кампании.", to: "/archive", icon: BookOpen, count: "entries" },
  { title: "Создать материал", description: "Новая статья, NPC, квест, событие или карта.", to: "/editor", icon: FilePlus2 },
  { title: "Игровой стол", description: "Подготовка и управление активной сессией.", to: "/session-desk", icon: Swords, count: "sessions" },
  { title: "Игроки и доступ", description: "Участники, роли и приглашения кампании.", to: "/players", icon: UsersRound },
  { title: "Карты", description: "Карты кампании и объекты игрового мира.", to: "/maps", icon: MapPinned, count: "maps" },
  { title: "Reveal / Handouts", description: "Материалы, которые можно открыть игрокам.", to: "/handouts", icon: Sparkles, count: "handouts" }
];

const playerActions = [
  { title: "Известный архив", description: "Только открытые мастером знания кампании.", to: "/archive", icon: BookOpen, count: "entries" },
  { title: "Мой персонаж", description: "Лист персонажа и доступные игровые данные.", to: "/characters", icon: UserRound, count: "characters" },
  { title: "Материалы", description: "Handouts и открытия текущей кампании.", to: "/handouts", icon: Sparkles, count: "handouts" },
  { title: "Мои заметки", description: "Личные и общие заметки кампании.", to: "/notes", icon: NotebookPen, count: "notes" },
  { title: "Карты", description: "Карты и объекты, открытые вашей группе.", to: "/maps", icon: MapPinned, count: "maps" },
  { title: "Timeline", description: "Известные события и история мира.", to: "/timeline", icon: Clock3, count: "timelineEvents" }
];

function entityId(entity) {
  return entity?.id || entity?._id || "";
}

function activeCampaignId(session) {
  return entityId(session?.activeCampaign) || session?.activeMembership?.campaignId || "";
}

function displayName(session) {
  return session?.user?.name || session?.user?.displayName || session?.user?.email || "Участник";
}

function roleLabel(role = "player") {
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  return "Игрок";
}

function itemLabel(item = {}) {
  return item.title || item.name || item.label || item.summary || "Без названия";
}

function itemTarget(section, item = {}) {
  if (section === "entries" && item.path) return `/page/${encodeURIComponent(item.path)}`;
  return sectionMeta[section]?.path || "/archive";
}

function dateLabel(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
}

function CountCard({ section, count = 0 }) {
  const meta = sectionMeta[section] || sectionMeta.entries;
  const Icon = meta.icon;
  return (
    <Link to={meta.path} className="codex-card archive-count-card">
      <Icon size={20} aria-hidden="true" />
      <span>{meta.label}</span>
      <strong>{Number(count || 0)}</strong>
    </Link>
  );
}

function ActionCard({ action, counts }) {
  const Icon = action.icon;
  const count = action.count ? Number(counts[action.count] || 0) : null;
  return (
    <CodexCard to={action.to} className="workspace-card">
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{action.title}</strong>
        <span>{action.description}</span>
      </div>
      {count !== null ? <span className="codex-pill codex-pill--neutral">{count}</span> : null}
    </CodexCard>
  );
}

function RecentCard({ section, items }) {
  const meta = sectionMeta[section] || sectionMeta.entries;
  const Icon = meta.icon;
  return (
    <CodexCard className="archive-recent-card">
      <span className="kicker"><Icon size={15} aria-hidden="true" /> {meta.label}</span>
      <ul>
        {items.slice(0, 3).map((item, index) => (
          <li key={item.id || item._id || `${section}-${index}`}>
            <Link to={itemTarget(section, item)}>
              <strong>{itemLabel(item)}</strong>
              {dateLabel(item.updatedAt || item.releasedAt || item.scheduledAt) ? <span> · {dateLabel(item.updatedAt || item.releasedAt || item.scheduledAt)}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
      <CodexButton to={meta.path} variant="ghost" size="sm">Открыть раздел</CodexButton>
    </CodexCard>
  );
}

export default function CampaignPortalHome({ session, variant = "player" }) {
  const campaignId = useMemo(() => activeCampaignId(session), [session]);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    if (!campaignId) {
      setState({ loading: false, data: null, error: { status: 403, message: "Активная кампания не выбрана." } });
      return undefined;
    }

    let active = true;
    setState({ loading: true, data: null, error: null });
    api.campaignArchive(campaignId)
      .then((data) => {
        if (active) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (active) setState({ loading: false, data: null, error: { status: error.status || 0, message: error.message || "Не удалось загрузить кампанию." } });
      });
    return () => { active = false; };
  }, [campaignId, reloadKey]);

  const manager = variant === "gm";
  const data = state.data || {};
  const archive = data.archive || {};
  const counts = archive.counts || {};
  const recent = archive.recent || {};
  const role = data.role || session?.activeMembership?.role || (manager ? "gm" : "player");
  const campaign = data.campaign || session?.activeCampaign || {};
  const workspace = data.workspace || session?.activeWorkspace || {};
  const actions = manager ? gmActions : playerActions;
  const visibleRecentSections = recentSections.filter((section) => Array.isArray(recent[section]) && recent[section].length > 0);

  return (
    <PageShell className={`portal-home-page portal-home-page--${variant}`}>
      <PageHero
        kicker={manager ? "GM Portal" : "Player Portal"}
        title={manager ? "Центр управления кампанией" : "Портал игрока"}
        description={manager
          ? "Подготовка, управление доступом и материалы активной кампании в одном рабочем пространстве."
          : "Ваш персонаж, открытые знания, карты, handouts и заметки активной кампании."}
      >
        <div className="workspace-identity-strip">
          <span><UserRound size={15} aria-hidden="true" /> {displayName(session)}</span>
          <span><BookOpen size={15} aria-hidden="true" /> {campaign.name || "Кампания не выбрана"}</span>
          <span><ShieldCheck size={15} aria-hidden="true" /> {roleLabel(role)}</span>
          {workspace.name ? <span>{workspace.name}</span> : null}
        </div>
      </PageHero>

      {state.loading ? <StatusMessage>Загружаю актуальное состояние кампании…</StatusMessage> : null}

      {state.error ? (
        <EmptyState
          icon={ShieldCheck}
          kicker={state.error.status === 401 || state.error.status === 403 ? "Доступ изменился" : "Кампания недоступна"}
          title={state.error.status === 401 || state.error.status === 403 ? "Нужно обновить доступ к кампании" : "Не удалось загрузить портал"}
          description={state.error.message}
          actionLabel={state.error.status === 401 || state.error.status === 403 ? "Выбрать кампанию" : "Повторить"}
          actionTo={state.error.status === 401 || state.error.status === 403 ? "/campaigns" : undefined}
          onAction={state.error.status === 401 || state.error.status === 403 ? undefined : () => setReloadKey((value) => value + 1)}
        />
      ) : null}

      {state.data ? (
        <>
          <section aria-label="Сводка активной кампании">
            <SectionHeader
              kicker="Живое состояние"
              title="Сводка кампании"
              description={manager ? "Все материалы кампании, включая мастерские." : "Только материалы, доступные вашей роли."}
              actions={<CodexButton to="/archive" variant="secondary" size="sm">Открыть весь архив</CodexButton>}
            />
            <div className="archive-summary-grid">
              {Object.keys(sectionMeta).map((section) => <CountCard key={section} section={section} count={counts[section]} />)}
            </div>
          </section>

          <section aria-label="Быстрые действия портала">
            <SectionHeader
              kicker="Рабочее пространство"
              title={manager ? "Управление и подготовка" : "Мои разделы"}
              description={manager ? "Основные инструменты GM для подготовки и проведения игры." : "Основные разделы, доступные игроку в текущей кампании."}
            />
            <div className="workspace-grid">
              {actions.map((action) => <ActionCard key={action.to} action={action} counts={counts} />)}
            </div>
          </section>

          <section aria-label="Последние материалы кампании">
            <SectionHeader
              kicker="Последние изменения"
              title="Недавние материалы"
              description={visibleRecentSections.length ? "Последние обновлённые материалы активной кампании." : "Новых доступных материалов пока нет."}
            />
            {visibleRecentSections.length ? (
              <div className="archive-recent-grid">
                {visibleRecentSections.map((section) => <RecentCard key={section} section={section} items={recent[section]} />)}
              </div>
            ) : (
              <EmptyState
                icon={manager ? FilePlus2 : Sparkles}
                kicker="Пока пусто"
                title={manager ? "Начните наполнять кампанию" : "Мастер ещё не открыл материалы"}
                description={manager ? "Создайте первую статью, карту, сессию или handout." : "Открытые знания и материалы появятся здесь автоматически."}
                actionLabel={manager ? "Создать материал" : "Открыть архив"}
                actionTo={manager ? "/editor" : "/archive"}
              />
            )}
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
