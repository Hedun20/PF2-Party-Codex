import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, RadioTower, Castle, Clock3, Compass, Eye, FileQuestion, MapPinned, MonitorPlay, PenLine, PlayCircle, ScrollText, ShieldCheck, Swords, UsersRound } from "lucide-react";
import EntityCard from "../components/EntityCard.jsx";
import MarkdownViewer from "../components/MarkdownViewer.jsx";
import CodexButton from "../components/ui/CodexButton.jsx";
import { getSharedArchivePages, getWorldOwnedPages, isWorldPage, resolveWorldBySlug, worldRoute } from "../utils/worldContext.js";

const WORLD_BLOCKS = [
  ["Countries", "countries", Castle],
  ["Cities", "cities", Castle],
  ["NPC", "npcs", UsersRound],
  ["Quests", "quests", ScrollText],
  ["Locations", "locations", MapPinned],
  ["Sessions", "sessions", BookOpen]
];

const CREATOR_ACTIONS = [
  ["Session", "session", BookOpen, "recap, player decisions and hooks"],
  ["Scene / location", "location", Compass, "room, tavern, tower, encounter zone"],
  ["NPC", "npc", UsersRound, "ally, trader, witness or rival"],
  ["Quest", "quest", ScrollText, "goal, stakes, reward and fallout"],
  ["Timeline event", "timelineEvent", Clock3, "year, era, importance and links"]
];

const QUEST_DONE_RE = /^(done|completed|complete|closed|failed|archived|cancelled|canceled)/i;

function lowerValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function pageDateValue(page) {
  return page?.frontmatter?.sessionDate || page?.frontmatter?.date || page?.frontmatter?.updated || page?.frontmatter?.created || page?.mtime || page?.updatedAt || page?.createdAt || "";
}

function sortByDateDesc(a, b) {
  return String(pageDateValue(b)).localeCompare(String(pageDateValue(a)));
}

function isActiveQuest(page) {
  if (page?.category !== "quests" && page?.type !== "quest") return false;
  return !QUEST_DONE_RE.test(lowerValue(page?.frontmatter?.status || page?.status));
}

function isNpcLike(page) {
  return ["npcs", "enemies", "characters"].includes(page?.category) || ["npc", "enemy", "pc"].includes(page?.type);
}

function isSessionLike(page) {
  return page?.category === "sessions" || page?.type === "session";
}

function isTimelineLike(page) {
  return page?.type === "timelineEvent" || page?.category === "timeline" || page?.frontmatter?.year || page?.frontmatter?.timelineYear;
}

function editorCreateLink(world, type = "lore", title = "") {
  const params = new URLSearchParams();
  params.set("world", world.title);
  if (type) params.set("type", type);
  if (title) params.set("title", title);
  return `/editor?${params.toString()}`;
}

function compactText(text = "", fallback = "Description is not filled yet.") {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return fallback;
  return value.length > 96 ? `${value.slice(0, 93)}...` : value;
}

function PageMiniList({ title, kicker, icon: Icon, items = [], empty, action }) {
  return (
    <section className="codex-card world-desk-card">
      <div className="world-desk-card-head">
        <div>
          {kicker && <span className="kicker">{kicker}</span>}
          <h3>{title}</h3>
        </div>
        {Icon && <Icon size={19} />}
      </div>
      {items.length > 0 ? (
        <div className="world-desk-list">
          {items.map((page) => (
            <Link key={page.path} to={`/page/${encodeURIComponent(page.path)}`} className="world-desk-list-item">
              <strong>{page.title}</strong>
              <span>{compactText(page.summary || page.frontmatter?.summary)}</span>
            </Link>
          ))}
        </div>
      ) : <p className="world-desk-empty">{empty}</p>}
      {action}
    </section>
  );
}

function WorldGmDesktop({ world, ownedPages, canEdit }) {
  const maps = ownedPages.filter((page) => page.mapImage).slice(0, 4);
  const activeQuests = ownedPages.filter(isActiveQuest).slice(0, 4);
  const npcPages = ownedPages.filter(isNpcLike).slice(0, 4);
  const sessions = ownedPages.filter(isSessionLike).sort(sortByDateDesc).slice(0, 4);
  const timeline = ownedPages.filter(isTimelineLike).sort(sortByDateDesc).slice(0, 4);
  const playerHandouts = ownedPages.filter((page) => page.visibility === "public" && !isWorldPage(page)).slice(0, 4);
  const nextTitle = `${world.title}: next session`;

  return (
    <section className="world-gm-desktop">
      <div className="world-gm-desktop-main codex-card">
        <div className="world-desk-orb"><PlayCircle size={34} /></div>
        <span className="kicker">GM Desktop</span>
        <h2>Launch this world in two clicks</h2>
        <p>This is the GM prep desk: scenes, maps, NPCs, active quests, recaps, reveal controls and session notes. Players never land here.</p>
        <div className="world-desk-primary-actions">
          <CodexButton as={Link} to={`${worldRoute(world)}/session`}><PlayCircle size={16} /> Start Session</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/maps`} variant="secondary"><MapPinned size={16} /> Maps</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/timeline`} variant="secondary"><Clock3 size={16} /> Timeline</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/reveal`} variant="secondary"><RadioTower size={16} /> Reveal</CodexButton>
          {canEdit && <CodexButton as={Link} to={editorCreateLink(world, "session", nextTitle)} variant="ghost"><BookOpen size={16} /> Recap</CodexButton>}
        </div>
        {canEdit && (
          <div className="world-create-dock">
            {CREATOR_ACTIONS.map(([label, type, Icon, hint]) => (
              <Link key={type} to={editorCreateLink(world, type)} className="world-create-pill">
                <Icon size={15} />
                <span>{label}</span>
                <em>{hint}</em>
              </Link>
            ))}
          </div>
        )}
      </div>

      <PageMiniList title="Scenes and maps" kicker="Run now" icon={MapPinned} items={maps} empty="Add mapImage to a map/location article and it appears here." action={<Link className="small-context-link" to={`${worldRoute(world)}/maps`}>All maps</Link>} />
      <PageMiniList title="Active quests" kicker="Party stakes" icon={Swords} items={activeQuests} empty="No active quests yet." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "quest")}>Create quest</Link> : null} />
      <PageMiniList title="Nearby NPC" kicker="Who to play" icon={UsersRound} items={npcPages} empty="World NPCs appear here after linking to the world." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "npc")}>Create NPC</Link> : null} />
      <PageMiniList title="Recent sessions" kicker="Recap" icon={BookOpen} items={sessions} empty="Create the first recap after play." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "session", nextTitle)}>Create recap</Link> : null} />
      <PageMiniList title="Timeline events" kicker="World history" icon={Clock3} items={timeline} empty="Events with year/timelineYear appear here." action={canEdit ? <Link className="small-context-link" to={editorCreateLink(world, "timelineEvent")}>Add event</Link> : null} />
      <PageMiniList title="Show to players" kicker="Player handout" icon={Eye} items={playerHandouts} empty="Public articles can be revealed as handouts." action={<Link className="small-context-link" to={`${worldRoute(world)}/reveal`}>Open Reveal Mode</Link>} />
    </section>
  );
}

function WorldPlayerDesktop({ world, ownedPages }) {
  const handouts = ownedPages.filter((page) => page.visibility === "public" && !isWorldPage(page)).slice(0, 6);
  const maps = ownedPages.filter((page) => page.mapImage).slice(0, 3);
  const quests = ownedPages.filter(isActiveQuest).slice(0, 4);
  const timeline = ownedPages.filter(isTimelineLike).sort(sortByDateDesc).slice(0, 4);

  return (
    <section className="world-gm-desktop world-player-desktop">
      <div className="world-gm-desktop-main codex-card">
        <div className="world-desk-orb"><ShieldCheck size={34} /></div>
        <span className="kicker">Player Portal</span>
        <h2>Your view of this world</h2>
        <p>This desk contains only player-visible material: public handouts, known quests, shared maps and timeline entries. GM preparation, session launch and reveal controls are hidden.</p>
        <div className="world-desk-primary-actions">
          <CodexButton as={Link} to={`${worldRoute(world)}/player`}><MonitorPlay size={16} /> Open live portal</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/maps`} variant="secondary"><MapPinned size={16} /> Public maps</CodexButton>
          <CodexButton as={Link} to={`${worldRoute(world)}/timeline`} variant="secondary"><Clock3 size={16} /> Public timeline</CodexButton>
        </div>
      </div>
      <PageMiniList title="Player handouts" kicker="Allowed lore" icon={Eye} items={handouts} empty="The GM has not published handouts in this world yet." />
      <PageMiniList title="Known quests" kicker="Party goals" icon={Swords} items={quests} empty="No public active quests yet." />
      <PageMiniList title="Public maps" kicker="Where you can go" icon={MapPinned} items={maps} empty="No public maps are available yet." />
      <PageMiniList title="Known timeline" kicker="What happened" icon={Clock3} items={timeline} empty="No public timeline events yet." />
    </section>
  );
}

function categoryMatches(page, category) {
  return page.category === category || page.category?.startsWith(`${category}/`);
}

function WorldStat({ value, label }) {
  return <span><strong>{value}</strong>{label}</span>;
}

export default function WorldDashboardPage({ pages = [], mode = "player", session }) {
  const { worldSlug } = useParams();
  const world = resolveWorldBySlug(pages, worldSlug);
  const canEdit = mode === "gm" && Boolean(session?.canEdit);

  if (!world) {
    return (
      <div className="page-stack">
        <section className="hero-panel world-missing-panel">
          <span className="kicker">World not found</span>
          <h1>This world is not in the archive</h1>
          <p>Check the link or return to the world list. The world may have been renamed or deleted.</p>
          <CodexButton as={Link} to="/category/worlds" variant="secondary"><ArrowLeft size={16} /> World list</CodexButton>
        </section>
      </div>
    );
  }

  const ownedPages = getWorldOwnedPages(pages, world).filter((page) => page.path !== world.path);
  const sharedPages = canEdit ? getSharedArchivePages(pages).filter((page) => !["dashboard", "_examples"].includes(page.category)).slice(0, 8) : [];
  const mapCount = ownedPages.filter((page) => page.mapImage).length;
  const timelineCount = ownedPages.filter((page) => page.type === "timelineEvent" || page.category === "timeline" || page.category === "sessions" || page.frontmatter?.year || page.frontmatter?.timelineYear).length;
  const characterCount = ownedPages.filter((page) => ["npcs", "enemies", "characters"].includes(page.category)).length;
  const locationCount = ownedPages.filter((page) => ["countries", "cities", "locations"].includes(page.category)).length;

  return (
    <div className="page-stack world-mode-page">
      <section className="hero-panel world-mode-hero">
        <div className="world-mode-hero-copy">
          <span className="kicker">{canEdit ? "Active GM world" : "Active player world"}</span>
          <h1>{world.title}</h1>
          <p>{world.summary || "This world needs a public summary and a player-safe introduction."}</p>
          <div className="world-mode-actions">
            <CodexButton as={Link} to="/" variant="secondary"><ArrowLeft size={16} /> Archive</CodexButton>
            <CodexButton as={Link} to={`/page/${encodeURIComponent(world.path)}`} variant="ghost"><BookOpen size={16} /> World article</CodexButton>
            {canEdit && <CodexButton as={Link} to={`/editor?world=${encodeURIComponent(world.title)}`}><PenLine size={16} /> Create in world</CodexButton>}
          </div>
        </div>
        <div className="world-mode-stat-card codex-card">
          <WorldStat value={ownedPages.length} label="articles" />
          <WorldStat value={locationCount} label="places" />
          <WorldStat value={characterCount} label="characters" />
          <WorldStat value={mapCount} label="maps" />
          <WorldStat value={timelineCount} label="events" />
        </div>
      </section>

      <section className="world-command-strip">
        <Link to={`${worldRoute(world)}/maps`} className="codex-card world-command-card"><MapPinned size={19} /><strong>{canEdit ? "World maps" : "Public maps"}</strong><span>{mapCount} maps</span></Link>
        <Link to={`${worldRoute(world)}/timeline`} className="codex-card world-command-card"><Clock3 size={19} /><strong>{canEdit ? "World timeline" : "Public timeline"}</strong><span>{timelineCount} events</span></Link>
        {canEdit ? (
          <>
            <Link to={`${worldRoute(world)}/reveal`} className="codex-card world-command-card"><MonitorPlay size={19} /><strong>Player Reveal</strong><span>GM handout screen</span></Link>
            <Link to={`${worldRoute(world)}/session`} className="codex-card world-command-card"><PlayCircle size={19} /><strong>Session Mode</strong><span>GM play desk</span></Link>
            <Link to="/missing" className="codex-card world-command-card"><FileQuestion size={19} /><strong>Missing links</strong><span>GM diagnostics</span></Link>
          </>
        ) : (
          <Link to={`${worldRoute(world)}/player`} className="codex-card world-command-card"><MonitorPlay size={19} /><strong>Live portal</strong><span>wait for GM reveal</span></Link>
        )}
      </section>

      {canEdit ? <WorldGmDesktop world={world} ownedPages={ownedPages} canEdit={canEdit} /> : <WorldPlayerDesktop world={world} ownedPages={ownedPages} />}

      {world.content && (
        <section className="section-band world-intro-band">
          <div className="section-title-row">
            <h2>World introduction</h2>
            <Link to={`/page/${encodeURIComponent(world.path)}`}>Open full article</Link>
          </div>
          <MarkdownViewer content={world.content} pages={pages} />
        </section>
      )}

      {WORLD_BLOCKS.map(([title, category]) => {
        const items = ownedPages.filter((page) => categoryMatches(page, category)).slice(0, 6);
        if (!items.length) return null;
        return (
          <section className="section-band" key={category}>
            <div className="section-title-row">
              <div>
                <span className="kicker">{world.title}</span>
                <h2>{title}</h2>
              </div>
              <Link to={`${worldRoute(world)}/category/${category}`}>All entries</Link>
            </div>
            <div className="codex-card-grid card-grid">{items.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
          </section>
        );
      })}

      {canEdit && (
        <section className="section-band shared-archive-band">
          <div className="section-title-row">
            <div>
              <span className="kicker">Shared materials</span>
              <h2>From the archive</h2>
            </div>
            <Link to="/">Back to archive</Link>
          </div>
          {sharedPages.length > 0 ? (
            <div className="codex-card-grid card-grid">{sharedPages.map((page) => <EntityCard key={page.path} page={page} mode={mode} />)}</div>
          ) : <p className="empty-copy">Shared archive articles without world context will appear here.</p>}
        </section>
      )}
    </div>
  );
}