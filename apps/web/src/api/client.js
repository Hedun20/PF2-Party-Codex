const API = "/api";
const TOKEN_KEY = "pf2-auth-token";

let authToken = localStorage.getItem(TOKEN_KEY) || "";

function authHeaders(options = {}) {
  if (options.body instanceof FormData) return authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
  return {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: authHeaders(options),
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Server is not returning the expected API response. Restart the local app so the new API routes are available.");
  }
  if (!response.ok) throw new Error((await response.json()).error || "Request failed");
  return response.json();
}

function setToken(token = "") {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export const api = {
  setToken,
  getToken: () => authToken,
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: async (payload) => {
    const data = await request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
    setToken(data.token);
    return data;
  },
  logout: async () => {
    try {
      await request("/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      setToken("");
    }
  },
  me: () => request("/auth/me"),
  session: () => request("/session"),
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
  foundryExport: (payload) => request("/foundry/export", { method: "POST", body: JSON.stringify(payload) })
};