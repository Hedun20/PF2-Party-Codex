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
  const [mode, setMode] = useState("player");
  const [session, setSession] = useState({ mode: "player", canEdit: false, access: "lan-player" });
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const refresh = async (nextMode = mode) => {
    const [pageData, categoryData] = await Promise.all([api.pages(nextMode), api.categories(nextMode)]);
    setPages(pageData.pages);
    setCategories(categoryData.categories);
  };

  useEffect(() => {
    api.session()
      .then((data) => {
        setSession(data);
        const preferred = data.canEdit ? (localStorage.getItem("codex-mode") || "gm") : "player";
        setMode(preferred === "gm" && !data.canEdit ? "player" : preferred);
      })
      .catch(() => setMode("player"));
  }, []);

  useEffect(() => {
    if (session.canEdit) localStorage.setItem("codex-mode", mode);
    refresh(mode);
    const timer = setInterval(() => refresh(mode), 10000);
    return () => clearInterval(timer);
  }, [mode, session.canEdit]);

  const dashboard = useMemo(() => pages.find((page) => page.path === "index.md"), [pages]);

  return (
    <FantasyShell
      mode={mode}
      setMode={(nextMode) => setMode(session.canEdit ? nextMode : "player")}
      session={session}
      pages={pages}
      categories={categories}
      query={query}
      setQuery={setQuery}
      onSelectPage={(path) => navigate(`/page/${encodeURIComponent(path)}`)}
    >
      <Routes>
        <Route path="/" element={<DashboardPage pages={pages} dashboard={dashboard} mode={mode} session={session} />} />
        <Route path="/category/:category/*" element={<CategoryPage pages={pages} mode={mode} />} />
        <Route path="/page/:path" element={<PageView mode={mode} pages={pages} />} />
        <Route path="/editor" element={<EditorPage mode={mode} session={session} onSaved={() => refresh(mode)} />} />
        <Route path="/edit/:path" element={<RawEditorPage mode={mode} onSaved={refresh} pages={pages} />} />
        <Route path="/missing" element={<MissingLinksPage mode={mode} />} />
        <Route path="/timeline" element={<TimelinePage pages={pages} mode={mode} />} />
        <Route path="/maps" element={<MapsPage pages={pages} mode={mode} />} />
        <Route path="/health" element={<VaultHealthPage mode={mode} />} />
        <Route path="/guide" element={<GuidePage session={session} />} />
        <Route path="/foundry" element={<FoundryImportExportPage mode={mode} />} />
      </Routes>
    </FantasyShell>
  );
}
