import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import FantasyShell from "./components/FantasyShell.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import WorldDashboardPage from "./pages/WorldDashboardPage.jsx";
import CategoryPage from "./pages/CategoryPage.jsx";
import PageView from "./pages/PageView.jsx";
import EditorPage from "./pages/EditorPage.jsx";
import FoundryImportExportPage from "./pages/FoundryImportExportPage.jsx";
import GuidePage from "./pages/GuidePage.jsx";
import MissingLinksPage from "./pages/MissingLinksPage.jsx";
import RawEditorPage from "./pages/RawEditorPage.jsx";
import VaultHealthPage from "./pages/VaultHealthPage.jsx";
import PlayerSafetyPage from "./pages/PlayerSafetyPage.jsx";
import TimelinePage from "./pages/TimelinePage.jsx";
import MapsPage from "./pages/MapsPage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import CharactersPage from "./pages/CharactersPage.jsx";
import SessionModePage from "./pages/SessionModePage.jsx";
import PlayerRevealPage, { PlayerPortalView } from "./pages/PlayerRevealPage.jsx";
import MyWorkspacePage from "./pages/MyWorkspacePage.jsx";
import GMToolsPage from "./pages/GMToolsPage.jsx";
import HandoutsPage from "./pages/HandoutsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import SessionsPage from "./pages/SessionsPage.jsx";
import { getWorldOwnedPages, getWorldSearchPages, resolveWorldBySlug, resolveWorldForPage } from "./utils/worldContext.js";

function worldSlugFromPath(pathname = "") {
  const match = pathname.match(/^\/world\/([^/]+)/);
  return match ? match[1] : "";
}

function pagePathFromRoute(pathname = "") {
  const match = pathname.match(/^\/(?:page|edit)\/([^/]+)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function editorWorldFromLocation(location) {
  if (location.pathname !== "/editor") return "";
  return new URLSearchParams(location.search).get("world") || "";
}

export default function App() {
  const [session, setSession] = useState({ mode: "player", canEdit: false, user: null });
  const [mode, setMode] = useState(localStorage.getItem("codex-mode") || "gm");
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const effectiveMode = session.canEdit ? mode : "player";
  const gmView = effectiveMode === "gm" && Boolean(session.canEdit);

  const loadSession = async () => {
    const data = await api.session();
    setSession(data);
    if (!data.canEdit) setMode("player");
    return data;
  };

  const refresh = async () => {
    const [pageData, categoryData] = await Promise.all([api.pages(effectiveMode), api.categories(effectiveMode)]);
    setPages(pageData.pages);
    setCategories(categoryData.categories);
  };

  const handleAuth = async () => {
    await loadSession();
    await refresh();
    navigate("/");
  };

  const handleLogout = async () => {
    await api.logout();
    await loadSession();
    setMode("player");
    navigate("/");
  };

  useEffect(() => {
    loadSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (session.canEdit) localStorage.setItem("codex-mode", mode);
    refresh().catch((error) => {
      if (error.message?.includes("GM access")) setMode("player");
    });
    const timer = setInterval(() => refresh().catch(() => {}), 10000);
    return () => clearInterval(timer);
  }, [effectiveMode, session.canEdit]);

  const dashboard = useMemo(() => pages.find((page) => page.path === "index.md"), [pages]);
  const activeWorldSlug = worldSlugFromPath(location.pathname);
  const routeWorld = useMemo(() => resolveWorldBySlug(pages, activeWorldSlug), [pages, activeWorldSlug]);
  const activePagePath = pagePathFromRoute(location.pathname);
  const editorWorldName = editorWorldFromLocation(location);
  const pageWorld = useMemo(() => (!routeWorld && activePagePath ? resolveWorldForPage(pages, activePagePath) : null), [pages, routeWorld, activePagePath]);
  const editorWorld = useMemo(() => (!routeWorld && !pageWorld && editorWorldName ? resolveWorldBySlug(pages, editorWorldName) : null), [pages, routeWorld, pageWorld, editorWorldName]);
  const activeWorld = routeWorld || pageWorld || editorWorld;
  const worldPages = useMemo(() => activeWorld ? getWorldOwnedPages(pages, activeWorld) : pages, [pages, activeWorld]);
  const shellPages = useMemo(() => activeWorld ? getWorldSearchPages(pages, activeWorld) : pages, [pages, activeWorld]);

  return (
    <FantasyShell
      mode={effectiveMode}
      setMode={session.canEdit ? setMode : () => {}}
      session={session}
      pages={shellPages}
      allPages={pages}
      categories={categories}
      query={query}
      setQuery={setQuery}
      activeWorld={activeWorld}
      onLogout={handleLogout}
      onSelectPage={(path) => navigate(`/page/${encodeURIComponent(path)}`)}
    >
      <Routes>
        <Route path="/login" element={<AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/" element={<DashboardPage pages={pages} dashboard={dashboard} mode={effectiveMode} session={session} />} />
        <Route path="/world/:worldSlug" element={<WorldDashboardPage pages={pages} mode={effectiveMode} session={session} />} />
        <Route path="/world/:worldSlug/category/:category/*" element={<CategoryPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />} />
        <Route path="/world/:worldSlug/timeline" element={<TimelinePage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />} />
        <Route path="/world/:worldSlug/maps" element={<MapsPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />} />
        <Route path="/world/:worldSlug/session" element={gmView ? <SessionModePage pages={pages} mode={effectiveMode} session={session} /> : <PlayerPortalView pages={pages} />} />
        <Route path="/world/:worldSlug/reveal" element={gmView ? <PlayerRevealPage pages={pages} session={session} /> : <PlayerPortalView pages={pages} />} />
        <Route path="/world/:worldSlug/player" element={<PlayerPortalView pages={pages} />} />
        <Route path="/category/:category/*" element={<CategoryPage pages={pages} mode={effectiveMode} />} />
        <Route path="/page/:path" element={<PageView mode={effectiveMode} pages={pages} onChanged={refresh} />} />
        <Route path="/editor" element={<EditorPage onSaved={refresh} session={{ ...session, canEdit: gmView }} activeWorld={activeWorld} />} />
        <Route path="/edit/:path" element={<RawEditorPage mode={gmView ? "gm" : "player"} onSaved={refresh} pages={pages} />} />
        <Route path="/missing" element={gmView ? <MissingLinksPage mode={effectiveMode} /> : <AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/timeline" element={<TimelinePage pages={pages} mode={effectiveMode} />} />
        <Route path="/maps" element={<MapsPage pages={pages} mode={effectiveMode} />} />
        <Route path="/my" element={<MyWorkspacePage pages={pages} mode={effectiveMode} session={session} />} />
        <Route path="/notes" element={<NotesPage pages={pages} />} />
        <Route path="/characters" element={<CharactersPage pages={pages} />} />
        <Route path="/handouts" element={<HandoutsPage pages={pages} mode={effectiveMode} />} />
        <Route path="/sessions" element={<SessionsPage pages={pages} mode={effectiveMode} />} />
        <Route path="/settings" element={<SettingsPage session={session} />} />
        <Route path="/gm-tools" element={gmView ? <GMToolsPage session={session} /> : <AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/health" element={gmView ? <VaultHealthPage mode={effectiveMode} /> : <AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/player-safety" element={gmView ? <PlayerSafetyPage pages={pages} /> : <AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/guide" element={<GuidePage canEdit={gmView} />} />
        <Route path="/foundry" element={gmView ? <FoundryImportExportPage mode={effectiveMode} /> : <AuthPage onAuth={handleAuth} session={session} />} />
      </Routes>
    </FantasyShell>
  );
}