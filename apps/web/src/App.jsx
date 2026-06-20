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
  const [mode, setMode] = useState(localStorage.getItem("codex-mode") || "player");
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const refresh = async () => {
    const [pageData, categoryData] = await Promise.all([api.pages(mode), api.categories(mode)]);
    setPages(pageData.pages);
    setCategories(categoryData.categories);
  };

  useEffect(() => {
    localStorage.setItem("codex-mode", mode);
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, [mode]);

  const dashboard = useMemo(() => pages.find((page) => page.path === "index.md"), [pages]);

  return (
    <FantasyShell
      mode={mode}
      setMode={setMode}
      pages={pages}
      categories={categories}
      query={query}
      setQuery={setQuery}
      onSelectPage={(path) => navigate(`/page/${encodeURIComponent(path)}`)}
    >
      <Routes>
        <Route path="/" element={<DashboardPage pages={pages} dashboard={dashboard} mode={mode} />} />
        <Route path="/category/:category/*" element={<CategoryPage pages={pages} mode={mode} />} />
        <Route path="/page/:path" element={<PageView mode={mode} pages={pages} />} />
        <Route path="/editor" element={<EditorPage onSaved={refresh} />} />
        <Route path="/edit/:path" element={<RawEditorPage mode={mode} onSaved={refresh} pages={pages} />} />
        <Route path="/missing" element={<MissingLinksPage mode={mode} />} />
        <Route path="/timeline" element={<TimelinePage pages={pages} mode={mode} />} />
        <Route path="/maps" element={<MapsPage pages={pages} mode={mode} />} />
        <Route path="/health" element={<VaultHealthPage mode={mode} />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/foundry" element={<FoundryImportExportPage mode={mode} />} />
      </Routes>
    </FantasyShell>
  );
}
