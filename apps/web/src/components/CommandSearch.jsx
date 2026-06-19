import { Search } from "lucide-react";
import { labelCategory } from "../utils/labels.js";

export default function CommandSearch({ pages, query, setQuery, onSelectPage }) {
  const results = query.trim()
    ? pages.filter((page) => `${page.title} ${page.summary} ${page.tags?.join(" ")}`.toLowerCase().includes(query.toLowerCase())).slice(0, 7)
    : [];

  return (
    <div className="search-wrap">
      <Search size={18} />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по архиву кампании" />
      {results.length > 0 && (
        <div className="search-results">
          {results.map((page) => (
            <button key={page.path} onClick={() => { setQuery(""); onSelectPage(page.path); }}>
              <strong>{page.title}</strong>
              <span>{labelCategory(page.category)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
