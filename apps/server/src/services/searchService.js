import MiniSearch from "minisearch";
import { listPages } from "./vaultService.js";

export function searchPages(query = "", mode = "player") {
  const docs = listPages(mode).map((page) => ({
    id: page.path,
    title: page.title,
    summary: page.summary,
    tags: page.tags.join(" "),
    category: page.category,
    content: page.content,
    page
  }));
  const miniSearch = new MiniSearch({
    fields: ["title", "summary", "tags", "category", "content"],
    storeFields: ["page"],
    searchOptions: { boost: { title: 4, tags: 2 }, fuzzy: 0.2, prefix: true }
  });
  miniSearch.addAll(docs);
  if (!query.trim()) return docs.slice(0, 20).map((doc) => doc.page);
  return miniSearch.search(query).map((result) => result.page);
}
