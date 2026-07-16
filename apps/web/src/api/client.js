const API = "/api";
const TOKEN_KEY = "pf2-auth-token";
const CAMPAIGN_KEY = "party-codex-active-campaign";
const REQUEST_TIMEOUT_MS = 20_000;

function readStorage(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeStorage(key, value = "") {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Authentication still works for the current tab when browser storage is blocked.
  }
}

let authToken = readStorage(TOKEN_KEY);
let activeCampaignId = readStorage(CAMPAIGN_KEY);

function authHeaders(options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(activeCampaignId ? { "X-Campaign-Id": activeCampaignId } : {})
  };
  return Object.keys(headers).length ? headers : undefined;
}

async function request(path, options = {}) {
  const controller = options.signal ? null : new AbortController();
  const timeout = controller ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      headers: authHeaders(options),
      ...options,
      signal: options.signal || controller?.signal
    });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The request timed out. Check the Party Codex service, then retry.");
    throw new Error("Party Codex could not reach the API. Check the server connection and retry.");
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server is not returning the expected API response. Restart the local app so the new API routes are available.");
  }
  if (!response.ok) {
    const payload = await response.json();
    const error = new Error(payload.error || "Request failed");
    error.code = payload.code || "";
    error.requestId = payload.requestId || response.headers.get("x-request-id") || "";
    throw error;
  }
  return response.json();
}

async function downloadRequest(path) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API}${path}`, { headers: authHeaders({}), signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The download timed out. Please retry.");
    throw new Error("Party Codex could not reach the download service.");
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : {};
    const error = new Error(payload.error || "Download failed");
    error.code = payload.code || "";
    error.requestId = payload.requestId || response.headers.get("x-request-id") || "";
    throw error;
  }
  return response.blob();
}

function queryString(params = {}) {
  const pairs = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    });
  return pairs.length ? `?${pairs.join("&")}` : "";
}

function setToken(token = "") {
  authToken = token;
  writeStorage(TOKEN_KEY, token);
}

function setActiveCampaignId(campaignId = "") {
  activeCampaignId = String(campaignId || "");
  writeStorage(CAMPAIGN_KEY, activeCampaignId);
}

export const api = {
  setToken,
  setActiveCampaignId,
  getToken: () => authToken,
  getActiveCampaignId: () => activeCampaignId,
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  resendVerification: (email, returnTo = "") => request("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email, returnTo }) }),
  requestPasswordReset: (email) => request("/auth/password-recovery/request", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (payload) => request("/auth/password-recovery/complete", { method: "POST", body: JSON.stringify(payload) }),
  login: async (payload) => {
    const data = await request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    setToken(data.token);
    setActiveCampaignId(data.activeCampaign?.id || "");
    return data;
  },
  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      setToken("");
      setActiveCampaignId("");
    }
  },
  me: () => request("/auth/me"),
  session: () => request("/session"),
  profile: () => request("/profile"),
  updateProfile: (payload) => request("/profile", { method: "PATCH", body: JSON.stringify(payload) }),
  createWorkspaceOnboarding: async (payload) => {
    const data = await request("/onboarding/workspace", { method: "POST", body: JSON.stringify(payload) });
    setActiveCampaignId(data.activeCampaign?.id || data.campaign?.id || "");
    return data;
  },
  campaigns: () => request("/campaigns"),
  subscription: () => request("/subscription"),
  createCampaign: async (payload) => {
    const data = await request("/campaigns", { method: "POST", body: JSON.stringify(payload) });
    setActiveCampaignId(data.activeCampaign?.id || data.campaign?.id || "");
    return data;
  },
  activateCampaign: async (campaignId) => {
    const data = await request(`/campaigns/${encodeURIComponent(campaignId)}/activate`, { method: "POST", body: JSON.stringify({}) });
    setActiveCampaignId(data.activeCampaign?.id || campaignId);
    return data;
  },
  pages: (mode) => request(`/pages?mode=${mode}`),
  missingLinks: (mode) => request(`/missing-links?mode=${mode}`),
  page: (path, mode) => request(`/page?path=${encodeURIComponent(path)}&mode=${mode}`),
  rawPage: (path, mode) => request(`/page/raw?path=${encodeURIComponent(path)}&mode=${mode}`),
  categories: (mode) => request(`/categories?mode=${mode}`),
  search: (query, mode) => request(`/search?q=${encodeURIComponent(query)}&mode=${mode}`),
  preview: (path, mode) => request(`/preview?path=${encodeURIComponent(path)}&mode=${mode}`),
  revealGet: (world) => request(`/reveal?world=${encodeURIComponent(world || "")}`),
  revealSet: (payload) => request("/reveal", { method: "POST", body: JSON.stringify(payload) }),
  revealClear: (world) => request(`/reveal?world=${encodeURIComponent(world || "")}`, { method: "DELETE" }),
  createPage: (payload) => request("/page", { method: "POST", body: JSON.stringify(payload) }),
  savePage: (payload) => request("/page", { method: "PUT", body: JSON.stringify(payload) }),
  saveRawPage: (payload) => request("/page/raw", { method: "PUT", body: JSON.stringify(payload) }),
  deletePage: (path) => request(`/page?path=${encodeURIComponent(path)}`, { method: "DELETE" }),
  markdownImportPreview: (formData) => request("/markdown/import/preview", { method: "POST", body: formData }),
  markdownImportCommit: (payload) => request("/markdown/import/commit", { method: "POST", body: JSON.stringify(payload) }),
  metadata: (mode) => request(`/metadata?mode=${mode}`),
  audit: (mode) => request(`/audit?mode=${mode}`),
  auditLog: (limit = 200) => request(`/audit-log?limit=${limit}`),
  playerSafety: () => request("/player-safety"),

  campaignArchive: (campaignId) => request(`/campaigns/${encodeURIComponent(campaignId)}/archive`),
  archive: (params = {}) => request(`/archive${queryString(params)}`),
  campaignMemberships: (campaignId) => request(`/campaigns/${encodeURIComponent(campaignId)}/memberships`),
  updateCampaignMembership: (campaignId, membershipId, payload) => request(`/campaigns/${encodeURIComponent(campaignId)}/memberships/${encodeURIComponent(membershipId)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  removeCampaignMembership: (campaignId, membershipId) => request(`/campaigns/${encodeURIComponent(campaignId)}/memberships/${encodeURIComponent(membershipId)}`, { method: "DELETE" }),
  campaignInvitations: (campaignId, params = {}) => request(`/campaigns/${encodeURIComponent(campaignId)}/invitations${queryString(params)}`),
  createCampaignInvitation: (campaignId, payload) => request(`/campaigns/${encodeURIComponent(campaignId)}/invitations`, { method: "POST", body: JSON.stringify(payload) }),
  revokeCampaignInvitation: (campaignId, invitationId) => request(`/campaigns/${encodeURIComponent(campaignId)}/invitations/${encodeURIComponent(invitationId)}`, { method: "DELETE" }),
  acceptInvitation: async (token) => {
    const data = await request("/invitations/accept", { method: "POST", body: JSON.stringify({ token }) });
    setActiveCampaignId(data.activeCampaign?.id || data.invitation?.campaignId || "");
    return data;
  },

  maps: (params = {}) => request(`/maps${queryString(params)}`),
  map: (id, params = {}) => request(`/maps/${encodeURIComponent(id)}${queryString(params)}`),
  createMap: (payload) => request("/maps", { method: "POST", body: JSON.stringify(payload) }),
  updateMap: (id, payload) => request(`/maps/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteMap: (id) => request(`/maps/${encodeURIComponent(id)}`, { method: "DELETE" }),
  mapObjects: (mapId, params = {}) => request(`/maps/${encodeURIComponent(mapId)}/objects${queryString(params)}`),
  createMapObject: (mapId, payload) => request(`/maps/${encodeURIComponent(mapId)}/objects`, { method: "POST", body: JSON.stringify(payload) }),
  updateMapObject: (id, payload) => request(`/map-objects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteMapObject: (id) => request(`/map-objects/${encodeURIComponent(id)}`, { method: "DELETE" }),
  timelineEvents: (params = {}) => request(`/timeline-events${queryString(params)}`),
  createTimelineEvent: (payload) => request("/timeline-events", { method: "POST", body: JSON.stringify(payload) }),
  updateTimelineEvent: (id, payload) => request(`/timeline-events/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTimelineEvent: (id) => request(`/timeline-events/${encodeURIComponent(id)}`, { method: "DELETE" }),
  sessions: (params = {}) => request(`/sessions${queryString(params)}`),
  createSession: (payload) => request("/sessions", { method: "POST", body: JSON.stringify(payload) }),
  updateSession: (id, payload) => request(`/sessions/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteSession: (id) => request(`/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  handouts: (params = {}) => request(`/handouts${queryString(params)}`),
  createHandout: (payload) => request("/handouts", { method: "POST", body: JSON.stringify(payload) }),
  updateHandout: (id, payload) => request(`/handouts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteHandout: (id) => request(`/handouts/${encodeURIComponent(id)}`, { method: "DELETE" }),
  notes: (scope = "mine") => request(`/notes?scope=${encodeURIComponent(scope)}`),
  createNote: (payload) => request("/notes", { method: "POST", body: JSON.stringify(payload) }),
  updateNote: (id, payload) => request(`/notes/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteNote: (id) => request(`/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  characters: (scope = "mine") => request(`/characters?scope=${encodeURIComponent(scope)}`),
  createCharacter: (payload) => request("/characters", { method: "POST", body: JSON.stringify(payload) }),
  updateCharacter: (id, payload) => request(`/characters/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateCharacterPresentation: (id, payload) => request(`/characters/${encodeURIComponent(id)}/presentation`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCharacter: (id) => request(`/characters/${encodeURIComponent(id)}`, { method: "DELETE" }),
  characterImportDryRun: (adapter, payload) => request(`/characters/import/${adapter}/dry-run`, { method: "POST", body: JSON.stringify(payload) }),
  characterImportCommit: (adapter, payload) => request(`/characters/import/${adapter}/commit`, { method: "POST", body: JSON.stringify(payload) }),
  pf2Options: (source = "auto") => request(`/pf2/options?source=${encodeURIComponent(source)}`),
  uploadAsset: (formData) => request("/assets/upload", { method: "POST", body: formData }),
  assetList: (mode) => request(`/assets/list?mode=${mode}`),
  foundryImportPreview: (formData) => request("/foundry/import", { method: "POST", body: formData }),
  foundryImportCommit: (items, conflictMode) => {
    const form = new FormData();
    form.append("preview", "false");
    form.append("items", JSON.stringify(items));
    form.append("conflictMode", conflictMode);
    return request("/foundry/import", { method: "POST", body: form });
  },
  foundryExport: (payload) => request("/foundry/export", { method: "POST", body: JSON.stringify(payload) }),
  foundryExportDownload: () => downloadRequest("/foundry/export/download")
};
