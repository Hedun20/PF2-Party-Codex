import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Database, FileQuestion, FileUp, HeartHandshake, Import, ScrollText, ShieldAlert, ShieldCheck, UploadCloud, Wrench } from "lucide-react";
import { api } from "../api/client.js";

const tools = [
  ["Campaign Health", "/health", ShieldCheck, "Content integrity, asset links and player-safety readiness."],
  ["Missing Articles", "/missing", FileQuestion, "Wiki links that need real entries."],
  ["Foundry Import/Export", "/foundry", Import, "Move journals and campaign data between Foundry and Codex."],
  ["Player Safety", "/player-safety", ShieldAlert, "Lines, veils and safety notes for the campaign."],
  ["Raw Editor", "/edit/index.md", ScrollText, "Technical markdown editor for emergency fixes."],
  ["Create Article", "/editor", FileUp, "Structured editor for worlds, NPC, quests and lore."],
  ["Settings", "/settings", Wrench, "Workspace and platform settings shell."],
  ["Data Systems", "/settings#mongo", Database, "Campaign storage, platform modules and readiness notes."]
];

export default function GMToolsPage({ session }) {
  const [files, setFiles] = useState([]);
  const [pastedText, setPastedText] = useState("");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [conflictMode, setConflictMode] = useState("skip");

  const warningCount = useMemo(() => preview.reduce((sum, item) => sum + (item.warnings?.length || 0), 0), [preview]);

  async function buildPreview() {
    if (!files.length && !pastedText.trim()) {
      setMessage("Choose Markdown/text files or paste campaign notes first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      files.slice(0, 200).forEach((file) => form.append("files", file));
      if (pastedText.trim()) {
        form.append("files", new File([pastedText], "campaign-notes.md", { type: "text/markdown" }));
      }
      const result = await api.markdownImportPreview(form);
      const items = Array.isArray(result.preview) ? result.preview : [];
      setPreview(items);
      setMessage(`Prepared ${items.length} archive candidates. Review them, then commit.`);
    } catch (error) {
      setMessage(error.message || "Import preview failed.");
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    if (!preview.length) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await api.markdownImportCommit({ items: preview, conflictMode });
      const written = result?.written?.length || 0;
      const skipped = result?.skipped?.length || 0;
      setMessage(`Import complete: ${written} written, ${skipped} skipped. The Campaign Archive can use the new material immediately.`);
      setPreview([]);
      setFiles([]);
      setPastedText("");
    } catch (error) {
      setMessage(error.message || "Import commit failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack gm-tools-page">
      <section className="hero-panel">
        <span className="kicker">GM Tools</span>
        <h1>Campaign operations</h1>
        <p>Imports, diagnostics and technical tools live here so the primary navigation stays focused on campaign work.</p>
      </section>

      <section className="codex-card quick-import-card" id="quick-import">
        <div className="quick-import-heading">
          <div>
            <span className="kicker">Fast campaign import</span>
            <h2>Drop the old campaign here</h2>
            <p>Upload up to 200 Markdown/text files at once, or paste a large block of GM notes. Party Codex will infer article titles, types and archive paths before anything is written.</p>
          </div>
          <UploadCloud size={30} aria-hidden="true" />
        </div>

        <div className="quick-import-grid">
          <label className="quick-import-dropzone">
            <strong>Files</strong>
            <span>.md / text, multiple selection supported</span>
            <input
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 200))}
            />
            <small>{files.length ? `${files.length} file(s) selected` : "Nothing selected yet"}</small>
          </label>

          <label className="quick-import-paste">
            <strong>Paste campaign dump</strong>
            <textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder="Paste session notes, lore, NPC notes, quests, locations or an exported campaign text here…"
              rows={9}
            />
          </label>
        </div>

        <div className="quick-import-actions">
          <button type="button" className="codex-button" onClick={buildPreview} disabled={busy}>{busy ? "Processing…" : "Analyze import"}</button>
          {preview.length ? (
            <>
              <label>
                Conflict handling
                <select value={conflictMode} onChange={(event) => setConflictMode(event.target.value)}>
                  <option value="skip">Skip existing</option>
                  <option value="copy">Create copies</option>
                  <option value="overwrite">Overwrite existing</option>
                </select>
              </label>
              <button type="button" className="codex-button" onClick={commitImport} disabled={busy}>Commit {preview.length} items</button>
            </>
          ) : null}
        </div>

        {message ? <p className="quick-import-message">{message}</p> : null}

        {preview.length ? (
          <div className="quick-import-preview">
            <div className="quick-import-summary">
              <strong>{preview.length} candidates</strong>
              <span>{warningCount} warning(s)</span>
            </div>
            <div className="quick-import-preview-list">
              {preview.slice(0, 60).map((item) => (
                <article key={item.id || item.targetPath} className="quick-import-preview-row">
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.type} → {item.targetPath}</span>
                  </div>
                  {item.warnings?.length ? <small>{item.warnings.join(" · ")}</small> : <small>Ready</small>}
                </article>
              ))}
            </div>
            {preview.length > 60 ? <small>Showing first 60 of {preview.length} candidates.</small> : null}
          </div>
        ) : null}
      </section>

      <section className="workspace-grid gm-tools-grid">
        {tools.map(([title, to, Icon, text]) => (
          <Link key={title} to={to} className="codex-card workspace-card">
            <Icon size={22} />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </Link>
        ))}
      </section>

      <section className="codex-card workspace-status-card">
        <span className="kicker">Access</span>
        <p><HeartHandshake size={16} /> This page is intended for owner/GM memberships. Player navigation does not show it.</p>
        {session?.activeCampaign?.name && <p>Active campaign: <strong>{session.activeCampaign.name}</strong></p>}
      </section>
    </div>
  );
}
