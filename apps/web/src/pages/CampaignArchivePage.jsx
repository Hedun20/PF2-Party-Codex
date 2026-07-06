import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const recentSections = ["entries", "maps", "timelineEvents", "sessions", "handouts"];

function entityId(entity) {
  return entity?.id || entity?._id || entity?.campaignId || "";
}

function activeCampaignId(session) {
  return (
    entityId(session?.activeCampaign) ||
    session?.activeMembership?.campaignId ||
    session?.membership?.campaignId ||
    session?.campaignId ||
    ""
  );
}

function itemLabel(item) {
  return item?.title || item?.name || item?.label || item?.summary || item?.id || item?._id || "Untitled";
}

function sectionLabel(section) {
  return section.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

export default function CampaignArchivePage({ session }) {
  const campaignId = useMemo(() => activeCampaignId(session), [session]);
  const [state, setState] = useState({ loading: false, data: null, error: "" });

  useEffect(() => {
    if (!campaignId) {
      setState({ loading: false, data: null, error: "" });
      return;
    }

    let active = true;
    setState({ loading: true, data: null, error: "" });
    api.campaignArchive(campaignId)
      .then((data) => {
        if (active) setState({ loading: false, data, error: "" });
      })
      .catch((error) => {
        if (active) setState({ loading: false, data: null, error: error.message || "Archive is unavailable." });
      });

    return () => {
      active = false;
    };
  }, [campaignId]);

  const data = state.data || {};
  const archive = data.archive || {};
  const counts = archive.counts || {};
  const recent = archive.recent || {};
  const availableSections = archive.availableSections || [];
  const campaign = data.campaign || session?.activeCampaign || {};
  const workspace = data.workspace || session?.activeWorkspace || {};
  const role = data.role || session?.activeMembership?.role || session?.membership?.role || session?.role || (session?.canEdit ? "gm" : "player");

  return (
    <div className="page-stack archive-page">
      <section className="hero-panel archive-hero">
        <span className="kicker">Campaign Archive</span>
        <h1>{campaign?.name || "Campaign Archive"}</h1>
        <p>{campaignId ? "Campaign content summary from the active archive contract." : "No active campaign is available for this session."}</p>
        <div className="workspace-identity-strip">
          {workspace?.name ? <span>Workspace: {workspace.name}</span> : null}
          <span>Role: {role}</span>
          {campaignId ? <span>Campaign ID: {campaignId}</span> : null}
        </div>
      </section>

      {!campaignId ? (
        <section className="codex-card workspace-status-card">
          <span className="kicker">Archive unavailable</span>
          <p>Choose or join a campaign before opening the archive.</p>
        </section>
      ) : null}

      {state.error ? (
        <section className="codex-card workspace-status-card">
          <span className="kicker">Archive unavailable</span>
          <p>{state.error}</p>
        </section>
      ) : null}

      {state.loading ? (
        <section className="codex-card workspace-status-card">
          <span className="kicker">Loading archive</span>
          <p>Fetching the current campaign summary.</p>
        </section>
      ) : null}

      {state.data ? (
        <>
          <section className="archive-summary-grid" aria-label="Archive counts">
            {Object.entries(counts).map(([key, value]) => (
              <article className="codex-card archive-count-card" key={key}>
                <span>{sectionLabel(key)}</span>
                <strong>{Number(value || 0)}</strong>
              </article>
            ))}
          </section>

          <section className="codex-card workspace-status-card">
            <span className="kicker">Available sections</span>
            <div className="archive-chip-row">
              {availableSections.length ? availableSections.map((section) => <span key={section}>{sectionLabel(section)}</span>) : <span>No sections returned.</span>}
            </div>
          </section>

          <section className="archive-recent-grid" aria-label="Recent archive items">
            {recentSections.map((section) => {
              const items = Array.isArray(recent[section]) ? recent[section] : [];
              return (
                <article className="codex-card archive-recent-card" key={section}>
                  <span className="kicker">Recent {sectionLabel(section)}</span>
                  {items.length ? (
                    <ul>
                      {items.map((item, index) => <li key={item?.id || item?._id || `${section}-${index}`}>{itemLabel(item)}</li>)}
                    </ul>
                  ) : (
                    <p>No recent items returned.</p>
                  )}
                </article>
              );
            })}
          </section>
        </>
      ) : null}
    </div>
  );
}