import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import FantasyShell from "./components/FantasyShell.jsx";
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
import TimelinePage from "./pages/TimelinePage.jsx";
import MapsPage from "./pages/MapsPage.jsx";
import SessionModePage from "./pages/SessionModePage.jsx";
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
  const [session, setSession] = useState({ mode: "player", canEdit: false });
  const [mode, setMode] = useState(localStorage.getItem("codex-mode") || "gm");
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const effectiveMode = session.canEdit ? mode : "player";

  const refresh = async () => {
    const [pageData, categoryData] = await Promise.all([api.pages(effectiveMode), api.categories(effectiveMode)]);
    setPages(pageData.pages);
    setCategories(categoryData.categories);
  };

  useEffect(() => {
    api.session().then((data) => {
      setSession(data);
      if (!data.canEdit) setMode("player");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (session.canEdit) localStorage.setItem("codex-mode", mode);
    refresh();
    const timer = setInterval(refresh, 10000);
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
      onSelectPage={(path) => navigate(`/page/${encodeURIComponent(path)}`)}
    >
      <Routes>
        <Route path="/" element={<DashboardPage pages={pages} dashboard={dashboard} mode={effectiveMode} session={session} />} />
        <Route path="/world/:worldSlug" element={<WorldDashboardPage pages={pages} mode={effectiveMode} session={session} />} />
        <Route path="/world/:worldSlug/category/:category/*" element={<CategoryPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />} />
        <Route path="/world/:worldSlug/timeline" element={<TimelinePage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />} />
        <Route path="/world/:worldSlug/maps" element={<MapsPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />} />
        <Route path="/world/:worldSlug/session" element={<SessionModePage pages={pages} mode={effectiveMode} session={session} />} />
        <Route path="/category/:category/*" element={<CategoryPage pages={pages} mode={effectiveMode} />} />
        <Route path="/page/:path" element={<PageView mode={effectiveMode} pages={pages} onChanged={refresh} />} />
        <Route path="/editor" element={<EditorPage onSaved={refresh} session={session} activeWorld={activeWorld} />} />
        <Route path="/edit/:path" element={<RawEditorPage mode={effectiveMode} onSaved={refresh} pages={pages} />} />
        <Route path="/missing" element={<MissingLinksPage mode={effectiveMode} />} />
        <Route path="/timeline" element={<TimelinePage pages={pages} mode={effectiveMode} />} />
        <Route path="/maps" element={<MapsPage pages={pages} mode={effectiveMode} />} />
        <Route path="/health" element={<VaultHealthPage mode={effectiveMode} />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/foundry" element={<FoundryImportExportPage mode={effectiveMode} />} />
      </Routes>
    </FantasyShell>
  );
}
