import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import MarkdownViewer from "../components/MarkdownViewer.jsx";

export default function PageView({ mode }) {
  const { path } = useParams();
  const decodedPath = decodeURIComponent(path);
  const [page, setPage] = useState(null);

  useEffect(() => {
    api.page(decodedPath, mode).then((data) => setPage(data.page));
  }, [decodedPath, mode]);

  if (!page) return <div className="list-header"><h1>Loading page</h1></div>;

  return (
    <div className="page-stack">
      <header className="list-header">
        <span className="kicker">{page.category}</span>
        <h1>{page.title}</h1>
        <p>{page.summary}</p>
        <div className="tag-row">{page.tags?.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </header>
      <MarkdownViewer content={page.content} />
    </div>
  );
}
