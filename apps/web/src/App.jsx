import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import FantasyShell from "./components/FantasyShell.jsx";
import AppShell from "./components/AppShell.jsx";
import RouteLoading from "./components/RouteLoading.jsx";
import { getWorldOwnedPages, getWorldSearchPages, resolveWorldBySlug, resolveWorldForPage } from "./utils/worldContext.js";
import { worldScopeFromSearch } from "./utils/shellContext.js";

const AuthPage = lazy(() => import("./pages/AuthPage.jsx"));
const CampaignArchivePage = lazy(() => import("./pages/CampaignArchivePage.jsx"));
const CampaignHealthPage = lazy(() => import("./pages/CampaignHealthPage.jsx"));
const CategoryPage = lazy(() => import("./pages/CategoryPage.jsx"));
const CharactersPage = lazy(() => import("./pages/CharactersPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const DiceTrayPage = lazy(() => import("./pages/DiceTrayPage.jsx"));
const EditorPage = lazy(() => import("./pages/EditorPage.jsx"));
const FoundryImportExportPage = lazy(() => import("./pages/FoundryImportExportPage.jsx"));
const GMToolsPage = lazy(() => import("./pages/GMToolsPage.jsx"));
const GmHomePage = lazy(() => import("./pages/GmHomePage.jsx"));
const GuidePage = lazy(() => import("./pages/GuidePage.jsx"));
const HandoutsPage = lazy(() => import("./pages/HandoutsPage.jsx"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage.jsx"));
const MapsPage = lazy(() => import("./pages/MapsPage.jsx"));
const MissingLinksPage = lazy(() => import("./pages/MissingLinksPage.jsx"));
const MyWorkspacePage = lazy(() => import("./pages/MyWorkspacePage.jsx"));
const NotesPage = lazy(() => import("./pages/NotesPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage.jsx"));
const PageView = lazy(() => import("./pages/PageView.jsx"));
const PlayerHomePage = lazy(() => import("./pages/PlayerHomePage.jsx"));
const PlayerRevealPage = lazy(() => import("./pages/PlayerRevealPage.jsx"));
const PlayerPortalView = lazy(() => import("./pages/PlayerRevealPage.jsx").then((module) => ({ default: module.PlayerPortalView })));
const PlayerSafetyPage = lazy(() => import("./pages/PlayerSafetyPage.jsx"));
const PlayersPage = lazy(() => import("./pages/PlayersPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const RawEditorPage = lazy(() => import("./pages/RawEditorPage.jsx"));
const SessionDeskPage = lazy(() => import("./pages/SessionDeskPage.jsx"));
const SessionModePage = lazy(() => import("./pages/SessionModePage.jsx"));
const SessionsPage = lazy(() => import("./pages/SessionsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const SimplePlaceholderPage = lazy(() => import("./pages/SimplePlaceholderPage.jsx"));
const TimelinePage = lazy(() => import("./pages/TimelinePage.jsx"));
const WorldDashboardPage = lazy(() => import("./pages/WorldDashboardPage.jsx"));

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

function SessionUnavailable({ message, onRetry }) {
  return (
    <section className="app-error-boundary" role="alert">
      <span className="kicker">Connection unavailable</span>
      <h1>Party Codex could not load your session.</h1>
      <p>{message || "Check that the Party Codex service is available, then retry."}</p>
      <button type="button" onClick={onRetry}>Retry connection</button>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState({ mode: "player", canEdit: false, user: null, activeMembership: null, activeCampaign: null, activeWorkspace: null });
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [mode, setMode] = useState("gm");
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignSwitching, setCampaignSwitching] = useState(false);
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
    api.setActiveCampaignId(data.activeCampaign?.id || "");
    setSession(data);
    setSessionError("");
    if (!canManageCampaign(data)) setMode("player");
    return data;
  };

  const loadCampaigns = async (sessionOverride = session) => {
    if (!sessionOverride?.user) {
      setCampaigns([]);
      return [];
    }
    try {
      const data = await api.campaigns();
      const items = Array.isArray(data.campaigns) ? data.campaigns : [];
      setCampaigns(items);
      return items;
    } catch {
      setCampaigns([]);
      return [];
    }
  };

  const refresh = async (sessionOverride = session, modeOverride = "") => {
    if (sessionOverride?.user && !hasActiveCampaignMembership(sessionOverride)) {
      setPages([]);
      setCategories([]);
      return { pages: [], categories: [] };
    }

    try {
      const requestedMode = modeOverride || (canManageCampaign(sessionOverride) ? mode : "player");
      const [pageData, categoryData] = await Promise.all([api.pages(requestedMode), api.categories(requestedMode)]);
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
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    await refresh(nextSession, nextMode);
    navigate("/");
  };

  const handleOnboardingCreated = async () => {
    const nextSession = await loadSession();
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    await refresh(nextSession, nextMode);
    navigate("/");
  };

  const handleInvitationAccepted = async () => {
    const nextSession = await loadSession();
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    await refresh(nextSession, nextMode);
  };

  const handleCampaignChange = async (campaignId) => {
    if (!campaignId || campaignId === session?.activeCampaign?.id || campaignSwitching) return;
    setCampaignSwitching(true);
    try {
      await api.activateCampaign(campaignId);
      setPages([]);
      setCategories([]);
      const nextSession = await loadSession();
      const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
      setMode(nextMode);
      await loadCampaigns(nextSession);
      await refresh(nextSession, nextMode);
      navigate("/");
    } finally {
      setCampaignSwitching(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    await loadSession();
    setMode("player");
    setPages([]);
    setCategories([]);
    setCampaigns([]);
    navigate("/");
  };

  useEffect(() => {
    let active = true;
    loadSession()
      .then((data) => loadCampaigns(data))
      .catch((error) => {
        if (active) setSessionError(error.message || "The Party Codex API is unavailable.");
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });
    return () => { active = false; };
  }, []);

  const retrySession = async () => {
    setSessionReady(false);
    setSessionError("");
    try {
      const data = await loadSession();
      await loadCampaigns(data);
    } catch (error) {
      setSessionError(error.message || "The Party Codex API is unavailable.");
    } finally {
      setSessionReady(true);
    }
  };

  useEffect(() => {
    if (!signedIn || !hasMembership) {
      setPages([]);
      setCategories([]);
      return undefined;
    }

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

  const onboardingElement = (
    <OnboardingPage
      session={session}
      campaigns={campaigns}
      onCreated={handleOnboardingCreated}
      onCampaignChange={handleCampaignChange}
      campaignSwitching={campaignSwitching}
    />
  );
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
  const accountRoute = (element) => {
    if (!signedIn) return <AuthPage onAuth={handleAuth} session={session} />;
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
      campaigns={campaigns}
      onCampaignChange={handleCampaignChange}
      campaignSwitching={campaignSwitching}
      onLogout={handleLogout}
      onSelectPage={(path) => navigate(`/page/${encodeURIComponent(path)}`)}
    >
      <AppShell session={session} canManage={canManage}>
        <Suspense fallback={<RouteLoading />}>
        {!sessionReady ? <RouteLoading /> : sessionError ? <SessionUnavailable message={sessionError} onRetry={retrySession} /> : (
        <Routes>
        <Route path="/login" element={<AuthPage onAuth={handleAuth} session={session} />} />
        <Route path="/invite/:token" element={<InviteAcceptPage session={session} onAccepted={handleInvitationAccepted} />} />
        <Route path="/campaigns" element={accountRoute(onboardingElement)} />
        <Route path="/" element={campaignRoute(<DashboardPage pages={pages} dashboard={dashboard} mode={effectiveMode} session={session} />)} />
        <Route path="/gm" element={managerRoute(<GmHomePage session={session} />)} />
        <Route path="/player" element={campaignRoute(<PlayerHomePage session={session} />)} />
        <Route path="/archive" element={campaignRoute(<CampaignArchivePage session={session} />)} />
        <Route path="/players" element={managerRoute(<PlayersPage session={session} />)} />
        <Route path="/profile" element={accountRoute(<ProfilePage session={session} campaigns={campaigns} onCampaignChange={handleCampaignChange} campaignSwitching={campaignSwitching} onOnboardingCreated={handleOnboardingCreated} />)} />
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
        <Route path="/characters" element={campaignRoute(<CharactersPage pages={worldPages} session={session} canManage={canManage} />)} />
        <Route path="/handouts" element={campaignRoute(<HandoutsPage pages={worldPages} mode={effectiveMode} />)} />
        <Route path="/sessions" element={campaignRoute(<SessionsPage pages={worldPages} mode={effectiveMode} />)} />
        <Route path="/settings" element={campaignRoute(<SettingsPage session={session} />)} />
        <Route path="/gm-tools" element={managerRoute(<GMToolsPage session={session} />)} />
        <Route path="/health" element={managerRoute(<CampaignHealthPage mode={effectiveMode} />)} />
        <Route path="/player-safety" element={managerRoute(<PlayerSafetyPage pages={pages} />)} />
        <Route path="/session-desk" element={campaignRoute(<SessionDeskPage session={session} />)} />
        <Route path="/dice" element={campaignRoute(<DiceTrayPage />)} />
        <Route path="/guide" element={<GuidePage canEdit={gmView} />} />
        <Route path="/foundry" element={managerRoute(<FoundryImportExportPage mode={effectiveMode} />)} />
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
        )}
        </Suspense>
      </AppShell>
    </FantasyShell>
  );
}
