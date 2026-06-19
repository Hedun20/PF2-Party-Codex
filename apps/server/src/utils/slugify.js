export function slugify(value = "untitled") {
  return String(value)
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-") || "untitled";
}

export function titleFromPath(filePath = "") {
  const name = filePath.split(/[\\/]/).pop()?.replace(/\.md$/i, "") || "Untitled";
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
