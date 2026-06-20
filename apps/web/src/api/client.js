const API = "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: options.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Сервер ещё не обновлён. Перезапусти локалку, чтобы новые API-ручки стали доступны.");
  }
  if (!response.ok) throw new Error((await response.json()).error || "Request failed");
  return response.json();
}

export const api = {
  pages: (mode) => request(`/pages?mode=${mode}`),
  missingLinks: (mode) => request(`/missing-links?mode=${mode}`),
  page: (path, mode) => request(`/page?path=${encodeURIComponent(path)}&mode=${mode}`),
  categories: (mode) => request(`/categories?mode=${mode}`),
  search: (query, mode) => request(`/search?q=${encodeURIComponent(query)}&mode=${mode}`),
  preview: (path, mode) => request(`/preview?path=${encodeURIComponent(path)}&mode=${mode}`),
  createPage: (payload) => request("/page", { method: "POST", body: JSON.stringify(payload) }),
  savePage: (payload) => request("/page", { method: "PUT", body: JSON.stringify(payload) }),
  metadata: (mode) => request(`/metadata?mode=${mode}`),
  audit: (mode) => request(`/audit?mode=${mode}`),
  uploadAsset: (formData) => request("/assets/upload", { method: "POST", body: formData }),
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
