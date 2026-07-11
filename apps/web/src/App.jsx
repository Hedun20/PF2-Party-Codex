import { useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import FantasyShell from "./components/FantasyShell.jsx";
import AppShell from "./components/AppShell.jsx";
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
import CampaignArchivePage from "./pages/CampaignArchivePage.jsx";
import GmHomePage from "./pages/GmHomePage.jsx";
import PlayerHomePage from "./pages/PlayerHomePage.jsx";
import SimplePlaceholderPage from "./pages/SimplePlaceholderPage.jsx";
import DiceTrayPage from "./pages/DiceTrayPage.jsx";
import SessionDeskPage from "./pages/SessionDeskPage.jsx";
import PlayersPage from "./pages/PlayersPageV2.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import InviteAcceptPage from "./pages/InviteAcceptPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import { getWorldOwnedPages, getWorldSearchPages, resolveWorldBySlug, resolveWorldForPage } from "./utils/worldContext.js";
import { worldScopeFromSearch } from "./utils/shellContext.js";

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

function activeMembership(session) {
  return session?.activeMembership || null;
}

function hasActiveCampaignMembership(session) {
  return Boolean(activeMembership(session)?.id);
}

function campaignRole(session) {
  return String(activeMembership(session)?.role || "").toLowerCase();
}

function canManageCampaign(session) {
  return ["owner", "gm"].includes(campaignRole(session));
}

export default function App() {
  const [session, setSession] = useState({ mode: "player", canEdit: false, user: null, activeMembership: null, activeCampaign: null, activeWorkspace: null });
  const [mode, setMode] = useState("gm");
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const signedIn = Boolean(session?.user);
  const hasMembership = hasActiveCampaignMembership(session);
  const canManage = canManageCampaign(session);
  const effectiveMode = canManage ? mode : "player";
  const gmView = effectiveMode === "gm" && canManage;

  const loadSession = async () => {
    const data = await api.session();
    setSession(data);
    if (!canManageCampaign(data)) setMode("player");
    return data;
  };

  const refresh = async (sessionOverride = session) => {
    if (sessionOverride?.user && !hasActiveCampaignMembership(sessionOverride)) {
      setPages([]);
      setCategories([]);
      return { pages: [], categories: [] };
    }

    try {
      const [pageData, categoryData] = await Promise.all([api.pages(effectiveMode), api.categories(effectiveMode)]);
      setPages(Array.isArray(pageData.pages) ? pageData.pages : []);
      setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
      return { pages: pageData.pages || [], categories: categoryData.categories || [] };
    } catch (error) {
      if (error.message?.includes("GM access")) setMode("player");
      if (sessionOverride?.user && !hasActiveCampaignMembership(sessionOverride)) {
        setPages([]);
        setCategories([]);
      }
      return { pages: [], categories: [] };
    }
  };

  const handleAuth = async () => {
    const nextSession = await loadSession();
    if (canManageCampaign(nextSession)) setMode("gm");
    await refresh(nextSession);
    navigate("/");
  };

  const handleOnboardingCreated = async () => {
    const nextSession = await loadSession();
    if (canManageCampaign(nextSession)) setMode("gm");
    await refresh(nextSession);
    navigate("/");
  };

  const handleLogout = async () => {
    await api.logout();
    await loadSession();
    setMode("player");
    setPages([]);
    setCategories([]);
    navigate("/");
  };

  useEffect(() => {
    loadSession().catch(() => {});
  }, []);

  useEffect(() => {
    if (!signedIn || !hasMembership) {
      setPages([]);
      setCategories([]);
      return undefined;
    }

    if (canManage) localStorage.setItem("codex-mode", mode);
    const refreshVisibleCampaign = () => {
      if (document.visibilityState !== "hidden") refresh().catch(() => {});
    };

    refreshVisibleCampaign();
    window.addEventListener("focus", refreshVisibleCampaign);
    document.addEventListener("visibilitychange", refreshVisibleCampaign);
    return () => {
      window.removeEventListener("focus", refreshVisibleCampaign);
      document.removeEventListener("visibilitychange", refreshVisibleCampaign);
    };
  }, [effectiveMode, canManage, hasMembership, signedIn]);

  const dashboard = useMemo(() => pages.find((page) => page.path === "index.md"), [pages]);
  const activeWorldSlug = worldSlugFromPath(location.pathname);
  const routeWorld = useMemo(() => resolveWorldBySlug(pages, activeWorldSlug), [pages, activeWorldSlug]);
  const activePagePath = pagePathFromRoute(location.pathname);
  const editorWorldName = editorWorldFromLocation(location);
  const queryWorldName = worldScopeFromSearch(location.search);
  const pageWorld = useMemo(() => (!routeWorld && activePagePath ? resolveWorldForPage(pages, activePagePath) : null), [pages, routeWorld, activePagePath]);
  const editorWorld = useMemo(() => (!routeWorld && !pageWorld && editorWorldName ? resolveWorldBySlug(pages, editorWorldName) : null), [pages, routeWorld, pageWorld, editorWorldName]);
  const queryWorld = useMemo(() => (!routeWorld && !pageWorld && !editorWorld && queryWorldName ? resolveWorldBySlug(pages, queryWorldName) : null), [pages, routeWorld, pageWorld, editorWorld, queryWorldName]);
  const activeWorld = routeWorld || pageWorld || editorWorld || queryWorld;
  const worldPages = useMemo(() => activeWorld ? getWorldOwnedPages(pages, activeWorld) : pages, [pages, activeWorld]);
  const shellPages = useMemo(() => activeWorld ? getWorldSearchPages(pages, activeWorld) : pages, [pages, activeWorld]);

  const onboardingElement = <OnboardingPage session={session} onCreated={handleOnboardingCreated} />;
  const accessDeniedElement = (
    <SimplePlaceholderPage title="GM access required" kicker="Campaign permissions">
      This route requires an active campaign membership with owner or GM role.
    </SimplePlaceholderPage>
  );
  const campaignRoute = (element) => {
    if (!signedIn) return <AuthPage onAuth={handleAuth} session={session} />;
    if (!hasMembership) return onboardingElement;
    return element;
  };
  const managerRoute = (element) => {
    if (!signedIn) return <AuthPage onAuth={handleAuth} session={session} />;
    if (!hasMembership) return onboardingElement;
    if (!canManage) return accessDeniedElement;
    return element;
  };

  return (
    <FantasyShell
      mode={effectiveMode}
      setMode={canManage ? setMode : () => {}}
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
      <AppShell session={session} canManage={canManage}>
        <Routes>
        <Route path="/login" element={<AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/invite/:token" element={<InviteAcceptPage session={session} onAccepted={loadSession} />} />
        <Route path="/" element={campaignRoute(<DashboardPage pages={pages} dashboard={dashboard} mode={effectiveMode} session={session} />)} />
        <Route path="/gm" element={managerRoute(<GmHomePage session={session} />)} />
        <Route path="/player" element={campaignRoute(<PlayerHomePage session={session} />)} />
        <Route path="/archive" element={campaignRoute(<CampaignArchivePage session={session} />)} />
        <Route path="/players" element={managerRoute(<PlayersPage session={session} />)} />
        <Route path="/profile" element={campaignRoute(<ProfilePage session={session} onOnboardingCreated={handleOnboardingCreated} />)} />
        <Route path="/world/:worldSlug" element={campaignRoute(<WorldDashboardPage pages={pages} mode={effectiveMode} session={session} />)} />
        <Route path="/world/:worldSlug/category/:category/*" element={campaignRoute(<CategoryPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
        <Route path="/world/:worldSlug/timeline" element={campaignRoute(<TimelinePage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
        <Route path="/world/:worldSlug/maps" element={campaignRoute(<MapsPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
        <Route path="/world/:worldSlug/session" element={campaignRoute(gmView ? <SessionModePage pages={pages} mode={effectiveMode} session={session} /> : <PlayerPortalView pages={pages} />)} />
        <Route path="/world/:worldSlug/reveal" element={campaignRoute(gmView ? <PlayerRevealPage pages={pages} session={session} /> : <PlayerPortalView pages={pages} />)} />
        <Route path="/world/:worldSlug/player" element={campaignRoute(<PlayerPortalView pages={pages} />)} />
        <Route path="/category/:category/*" element={campaignRoute(<CategoryPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
        <Route path="/page/:path" element={campaignRoute(<PageView mode={effectiveMode} pages={pages} onChanged={refresh} />)} />
        <Route path="/editor" element={managerRoute(<EditorPage onSaved={refresh} session={{ ...session, canEdit: gmView }} activeWorld={activeWorld} />)} />
        <Route path="/edit/:path" element={managerRoute(<RawEditorPage mode="gm" onSaved={refresh} pages={pages} />)} />
        <Route path="/missing" element={managerRoute(<MissingLinksPage mode={effectiveMode} />)} />
        <Route path="/timeline" element={campaignRoute(<TimelinePage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
        <Route path="/maps" element={campaignRoute(<MapsPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
        <Route path="/my" element={campaignRoute(<MyWorkspacePage pages={pages} mode={effectiveMode} session={session} />)} />
        <Route path="/notes" element={campaignRoute(<NotesPage pages={worldPages} />)} />
        <Route path="/characters" element={campaignRoute(<CharactersPage pages={worldPages} />)} />
        <Route path="/handouts" element={campaignRoute(<HandoutsPage pages={worldPages} mode={effectiveMode} />)} />
        <Route path="/sessions" element={campaignRoute(<SessionsPage pages={worldPages} mode={effectiveMode} />)} />
        <Route path="/settings" element={campaignRoute(<SettingsPage session={session} />)} />
        <Route path="/gm-tools" element={managerRoute(<GMToolsPage session={session} />)} />
        <Route path="/health" element={managerRoute(<VaultHealthPage mode={effectiveMode} />)} />
        <Route path="/player-safety" element={managerRoute(<PlayerSafetyPage pages={pages} />)} />
        <Route path="/session-desk" element={campaignRoute(<SessionDeskPage session={session} />)} />
        <Route path="/dice" element={campaignRoute(<DiceTrayPage />)} />
        <Route path="/guide" element={<GuidePage canEdit={gmView} />} />
        <Route path="/foundry" element={managerRoute(<FoundryImportExportPage mode={effectiveMode} />)} />
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </FantasyShell>
  );
}
