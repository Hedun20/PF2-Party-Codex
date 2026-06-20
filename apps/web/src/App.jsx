import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import FantasyShell from "./components/FantasyShell.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
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

export default function App() {
  const [session, setSession] = useState({ mode: "player", canEdit: false });
  const [mode, setMode] = useState(localStorage.getItem("codex-mode") || "gm");
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

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

  return (
    <FantasyShell
      mode={effectiveMode}
      setMode={session.canEdit ? setMode : () => {}}
      session={session}
      pages={pages}
      categories={categories}
      query={query}
      setQuery={setQuery}
      onSelectPage={(path) => navigate(`/page/${encodeURIComponent(path)}`)}
    >
      <Routes>
        <Route path="/" element={<DashboardPage pages={pages} dashboard={dashboard} mode={effectiveMode} />} />
        <Route path="/category/:category/*" element={<CategoryPage pages={pages} mode={effectiveMode} />} />
        <Route path="/page/:path" element={<PageView mode={effectiveMode} pages={pages} />} />
        <Route path="/editor" element={<EditorPage onSaved={refresh} session={session} />} />
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
