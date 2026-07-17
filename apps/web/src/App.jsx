import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api/client.js";
import ApplicationShell from "./components/ApplicationShell.jsx";
import RouteLoading from "./components/RouteLoading.jsx";
import CampaignScopeGate from "./routing/CampaignScopeGate.jsx";
import LegacyRouteRedirect from "./routing/LegacyRouteRedirect.jsx";
import {
  APP_ROUTES,
  LEGACY_ROUTE_REDIRECTS,
  buildAppPath,
  campaignHomePath,
  campaignIdFromPath,
  replaceCampaignIdInPath
} from "./routing/appRoutes.js";
import { getWorldOwnedPages, getWorldSearchPages, resolveWorldBySlug, resolveWorldForPage } from "./utils/worldContext.js";
import { worldScopeFromSearch } from "./utils/shellContext.js";

const AccessDeniedPage = lazy(() => import("./pages/AccessDeniedPage.jsx"));
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
const TimelinePage = lazy(() => import("./pages/TimelinePage.jsx"));
const WorldDashboardPage = lazy(() => import("./pages/WorldDashboardPage.jsx"));

// Kept reachable until the corresponding product stages remove their legacy modules.
void DashboardPage;
void MyWorkspacePage;
void SessionModePage;

function worldSlugFromPath(pathname = "") {
  const match = pathname.match(/^\/app\/campaigns\/[^/]+\/archive\/worlds\/([^/]+)/);
  return match ? match[1] : "";
}

function pagePathFromRoute(pathname = "") {
  const match = pathname.match(/^\/app\/campaigns\/[^/]+\/archive\/entries\/([^/]+)(?:\/edit)?$/);
  if (!match || match[1] === "new") return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function editorWorldFromLocation(location) {
  if (!/\/archive\/entries\/(?:new|[^/]+\/edit)$/.test(location.pathname)) return "";
  return new URLSearchParams(location.search).get("world") || "";
}

function activeMembership(session) {
  return session?.activeMembership || null;
}

function hasActiveCampaignMembership(session) {
  return Boolean(activeMembership(session)?.id && session?.activeCampaign?.id);
}

function campaignRole(session) {
  return String(activeMembership(session)?.role || "").toLowerCase();
}

function canManageCampaign(session) {
  return ["owner", "gm"].includes(campaignRole(session));
}

function shouldReconcileCampaign(error) {
  const status = Number(error?.status || 0);
  return status === 401 || status === 403;
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
  const [campaignNotice, setCampaignNotice] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const signedIn = Boolean(session?.user);
  const hasMembership = hasActiveCampaignMembership(session);
  const canManage = canManageCampaign(session);
  const effectiveMode = canManage ? mode : "player";
  const gmView = effectiveMode === "gm" && canManage;
  const activeCampaignId = session?.activeCampaign?.id || "";

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

  const canonicalLocationForCampaign = (campaignId) => {
    if (!campaignId) return buildAppPath("campaignSelect");
    if (campaignIdFromPath(location.pathname)) {
      return `${replaceCampaignIdInPath(location.pathname, campaignId)}${location.search || ""}`;
    }
    return campaignHomePath(campaignId);
  };

  const reconcileCampaignContext = async (previousSession = session) => {
    const previousCampaignId = previousSession?.activeCampaign?.id || "";
    const previousRole = campaignRole(previousSession);
    const nextSession = await loadSession();
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    setPages([]);
    setCategories([]);

    if (!nextSession?.user) {
      setCampaigns([]);
      setCampaignNotice({ tone: "danger", message: "Сессия завершилась. Войдите снова, чтобы продолжить работу с кампаниями." });
      navigate(buildAppPath("login"), { replace: true });
      return nextSession;
    }

    if (!hasActiveCampaignMembership(nextSession)) {
      setCampaignNotice({ tone: "warning", message: "Доступ к активной кампании изменился. Выберите другую кампанию, примите приглашение или создайте новую." });
      navigate(buildAppPath("campaignSelect"), { replace: true });
      return nextSession;
    }

    const nextCampaignId = nextSession.activeCampaign?.id || "";
    const nextRole = campaignRole(nextSession);
    if (previousCampaignId && nextCampaignId !== previousCampaignId) {
      setCampaignNotice({ tone: "warning", message: `Предыдущая кампания больше недоступна. Активирована кампания «${nextSession.activeCampaign?.name || "другая кампания"}».` });
      navigate(canonicalLocationForCampaign(nextCampaignId), { replace: true });
    } else if (previousRole && nextRole !== previousRole) {
      setCampaignNotice({ tone: "warning", message: `Ваша роль в кампании изменилась: теперь ${nextRole || "участник"}. Доступные разделы обновлены.` });
      navigate(campaignHomePath(nextCampaignId), { replace: true });
    } else {
      setCampaignNotice({ tone: "danger", message: "Не удалось подтвердить доступ к выбранной кампании. Повторите действие или выберите другую кампанию." });
    }
    return nextSession;
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
      if (shouldReconcileCampaign(error) && sessionOverride?.user) {
        await reconcileCampaignContext(sessionOverride);
      } else if (error.message?.includes("GM access")) {
        setMode("player");
      }
      if (sessionOverride?.user && !hasActiveCampaignMembership(sessionOverride)) {
        setPages([]);
        setCategories([]);
      }
      return { pages: [], categories: [] };
    }
  };

  const handleAuth = async () => {
    setCampaignNotice(null);
    const nextSession = await loadSession();
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    await refresh(nextSession, nextMode);
    navigate(campaignHomePath(nextSession?.activeCampaign?.id || ""), { replace: true });
  };

  const handleOnboardingCreated = async () => {
    setCampaignNotice(null);
    const nextSession = await loadSession();
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    await refresh(nextSession, nextMode);
    navigate(campaignHomePath(nextSession?.activeCampaign?.id || ""), { replace: true });
  };

  const handleInvitationAccepted = async () => {
    setCampaignNotice(null);
    const nextSession = await loadSession();
    const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
    setMode(nextMode);
    await loadCampaigns(nextSession);
    await refresh(nextSession, nextMode);
    navigate(campaignHomePath(nextSession?.activeCampaign?.id || ""), { replace: true });
  };

  const handleCampaignChange = async (campaignId, options = {}) => {
    if (!campaignId || campaignId === session?.activeCampaign?.id || campaignSwitching) return;
    setCampaignSwitching(true);
    setCampaignNotice(null);
    try {
      await api.activateCampaign(campaignId);
      setPages([]);
      setCategories([]);
      const nextSession = await loadSession();
      const nextMode = canManageCampaign(nextSession) ? "gm" : "player";
      setMode(nextMode);
      await loadCampaigns(nextSession);
      await refresh(nextSession, nextMode);
      const resolvedCampaignId = nextSession?.activeCampaign?.id || campaignId;
      const targetPath = options.targetPath
        || (options.preserveLocation ? `${replaceCampaignIdInPath(location.pathname, resolvedCampaignId)}${location.search || ""}` : campaignHomePath(resolvedCampaignId));
      navigate(targetPath, { replace: true });
    } catch (error) {
      setCampaignNotice({ tone: "danger", message: `Не удалось переключить кампанию. ${error.message || "Повторите попытку."}` });
      if (shouldReconcileCampaign(error)) {
        try {
          await reconcileCampaignContext(session);
        } catch (reconcileError) {
          setSessionError(reconcileError.message || "Не удалось обновить состояние кампаний.");
        }
      }
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
    setCampaignNotice(null);
    navigate(buildAppPath("login"), { replace: true });
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
  }, [effectiveMode, canManage, hasMembership, signedIn, activeCampaignId]);

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
  const accessDeniedElement = <AccessDeniedPage session={session} />;
  const loginRedirect = <Navigate to={buildAppPath("login")} replace state={{ returnTo: `${location.pathname}${location.search || ""}` }} />;

  const accountRoute = (element) => signedIn ? element : loginRedirect;
  const campaignRoute = (element, { manager = false } = {}) => {
    if (!signedIn) return loginRedirect;
    if (!hasMembership) return <Navigate to={buildAppPath("campaignSelect")} replace />;
    const requestedCampaignId = campaignIdFromPath(location.pathname);
    return (
      <CampaignScopeGate
        requestedCampaignId={requestedCampaignId}
        activeCampaignId={activeCampaignId}
        campaigns={campaigns}
        onActivate={handleCampaignChange}
        denied={accessDeniedElement}
      >
        {manager && !canManage ? accessDeniedElement : element}
      </CampaignScopeGate>
    );
  };

  const entryTarget = !signedIn
    ? buildAppPath("login")
    : hasMembership
      ? campaignHomePath(activeCampaignId)
      : buildAppPath("campaignSelect");

  return (
    <ApplicationShell
      session={session}
      pages={shellPages}
      allPages={pages}
      categories={categories}
      activeWorld={activeWorld}
      campaigns={campaigns}
      onCampaignChange={handleCampaignChange}
      campaignSwitching={campaignSwitching}
      campaignNotice={campaignNotice}
      onLogout={handleLogout}
      onSelectPage={(path) => navigate(buildAppPath("archiveEntry", { campaignId: activeCampaignId, path }))}
    >
      <Suspense fallback={<RouteLoading />}>
        {!sessionReady ? <RouteLoading /> : sessionError ? <SessionUnavailable message={sessionError} onRetry={retrySession} /> : (
          <Routes>
            <Route path={APP_ROUTES.entry.pattern} element={<Navigate to={entryTarget} replace />} />
            <Route path={APP_ROUTES.login.pattern} element={<AuthPage onAuth={handleAuth} session={session} />} />
            <Route path={APP_ROUTES.invitation.pattern} element={<InviteAcceptPage session={session} onAccepted={handleInvitationAccepted} />} />
            <Route path={APP_ROUTES.help.pattern} element={<GuidePage canEdit={gmView} />} />
            <Route path={APP_ROUTES.campaignSelect.pattern} element={accountRoute(onboardingElement)} />
            <Route path={APP_ROUTES.accountProfile.pattern} element={accountRoute(<ProfilePage session={session} campaigns={campaigns} onCampaignChange={handleCampaignChange} campaignSwitching={campaignSwitching} onOnboardingCreated={handleOnboardingCreated} onProfileChanged={loadSession} />)} />
            <Route path={APP_ROUTES.accountSettings.pattern} element={accountRoute(<Navigate to={buildAppPath("accountProfile")} replace />)} />

            <Route path={APP_ROUTES.campaignHome.pattern} element={campaignRoute(canManage ? <GmHomePage session={session} /> : <PlayerHomePage session={session} />)} />
            <Route path={APP_ROUTES.archive.pattern} element={campaignRoute(<CampaignArchivePage session={session} />)} />
            <Route path={APP_ROUTES.archiveWorld.pattern} element={campaignRoute(<WorldDashboardPage pages={pages} mode={effectiveMode} session={session} />)} />
            <Route path={APP_ROUTES.archiveMaps.pattern} element={campaignRoute(<MapsPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
            <Route path={APP_ROUTES.archiveTimeline.pattern} element={campaignRoute(<TimelinePage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />
            <Route path={APP_ROUTES.archiveHandouts.pattern} element={campaignRoute(<HandoutsPage pages={worldPages} mode={effectiveMode} />)} />
            <Route path={APP_ROUTES.archiveEntryNew.pattern} element={campaignRoute(<EditorPage onSaved={refresh} session={{ ...session, canEdit: gmView }} activeWorld={activeWorld} />, { manager: true })} />
            <Route path={APP_ROUTES.archiveEntryEdit.pattern} element={campaignRoute(<RawEditorPage mode="gm" onSaved={refresh} pages={pages} />, { manager: true })} />
            <Route path={APP_ROUTES.archiveEntry.pattern} element={campaignRoute(<PageView mode={effectiveMode} pages={pages} onChanged={refresh} />)} />
            <Route path={APP_ROUTES.archiveCategory.pattern} element={campaignRoute(<CategoryPage pages={worldPages} mode={effectiveMode} activeWorld={activeWorld} />)} />

            <Route path={APP_ROUTES.session.pattern} element={campaignRoute(<SessionDeskPage session={session} />)} />
            <Route path={APP_ROUTES.sessionDice.pattern} element={campaignRoute(<DiceTrayPage />)} />
            <Route path={APP_ROUTES.notes.pattern} element={campaignRoute(<NotesPage pages={worldPages} />)} />
            <Route path={APP_ROUTES.myCharacter.pattern} element={campaignRoute(<CharactersPage pages={worldPages} session={session} canManage={false} />)} />

            <Route path={APP_ROUTES.manageSessions.pattern} element={campaignRoute(<SessionsPage pages={worldPages} mode={effectiveMode} />, { manager: true })} />
            <Route path={APP_ROUTES.managePlayers.pattern} element={campaignRoute(<PlayersPage session={session} />, { manager: true })} />
            <Route path={APP_ROUTES.manageCharacters.pattern} element={campaignRoute(<CharactersPage pages={worldPages} session={session} canManage={true} />, { manager: true })} />
            <Route path={APP_ROUTES.manageImports.pattern} element={campaignRoute(<FoundryImportExportPage mode={effectiveMode} />, { manager: true })} />
            <Route path={APP_ROUTES.manageArchiveHealth.pattern} element={campaignRoute(<CampaignHealthPage mode={effectiveMode} />, { manager: true })} />
            <Route path={APP_ROUTES.manageMissingLinks.pattern} element={campaignRoute(<MissingLinksPage mode={effectiveMode} />, { manager: true })} />
            <Route path={APP_ROUTES.manageVisibility.pattern} element={campaignRoute(<PlayerSafetyPage pages={pages} />, { manager: true })} />
            <Route path={APP_ROUTES.manageTools.pattern} element={campaignRoute(<GMToolsPage session={session} />, { manager: true })} />
            <Route path={APP_ROUTES.manageSettings.pattern} element={campaignRoute(<SettingsPage session={session} />, { manager: true })} />
            <Route path={APP_ROUTES.preview.pattern} element={campaignRoute(<PlayerRevealPage pages={pages} session={session} />, { manager: true })} />

            {LEGACY_ROUTE_REDIRECTS.map((spec) => (
              <Route key={spec.path} path={spec.path} element={<LegacyRouteRedirect spec={spec} campaignId={activeCampaignId} canManage={canManage} />} />
            ))}

            <Route path={APP_ROUTES.notFound.pattern} element={<NotFoundPage session={session} />} />
          </Routes>
        )}
      </Suspense>
    </ApplicationShell>
  );
}
