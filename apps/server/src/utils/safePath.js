import path from "path";

export function normalizeVaultPath(input = "") {
  return String(input).replace(/\\/g, "/").replace(/^\/+/, "");
}

export function resolveInside(baseDir, requestedPath = "") {
  const normalized = normalizeVaultPath(requestedPath);
  const resolved = path.resolve(baseDir, normalized);
  const relative = path.relative(baseDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    const error = new Error("Path escapes the vault");
    error.status = 400;
    throw error;
  }
  return resolved;
}

export function ensureMarkdownPath(requestedPath) {
  const normalized = normalizeVaultPath(requestedPath);
  if (!normalized || normalized.includes("\0") || !normalized.endsWith(".md")) {
    const error = new Error("A safe .md path is required");
    error.status = 400;
    throw error;
  }
  return normalized;
}
