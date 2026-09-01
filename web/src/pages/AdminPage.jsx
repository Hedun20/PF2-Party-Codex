import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { CodexButton, CodexCard, PageHero, PageShell, SectionHeader, StatusMessage } from "../components/ui/index.js";

async function platformRequest(path, options = {}) {
  const token = api.getToken();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Admin request failed.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function verificationLabel(user) {
  if (!user.emailVerified) return "Unverified";
  if (user.verificationMethod === "platformAdmin") return "Verified manually";
  return "Verified";
}

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState(null);

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) => `${user.email || ""} ${user.name || ""}`.toLowerCase().includes(needle));
  }, [users, query]);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [statusPayload, usersPayload] = await Promise.all([
        platformRequest("/platform/status"),
        platformRequest("/platform/users?limit=500")
      ]);
      setStatus(statusPayload);
      setUsers(Array.isArray(usersPayload.items) ? usersPayload.items : []);
    } catch (error) {
      setMessage({ tone: "danger", text: error.status === 403 ? "Platform administrator access is required." : error.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setVerified(user, verified) {
    if (!user?.id || busyId) return;
    const reason = verified
      ? window.prompt("Reason for manual verification", "Email provider unavailable during alpha")
      : window.prompt("Reason for revoking verification", "Administrative correction");
    if (reason === null) return;

    setBusyId(user.id);
    setMessage(null);
    try {
      const payload = await platformRequest(`/platform/users/${encodeURIComponent(user.id)}/verification`, {
        method: "POST",
        body: JSON.stringify({ verified, reason })
      });
      setUsers((items) => items.map((item) => item.id === user.id ? payload.user : item));
      setMessage({ tone: "success", text: verified ? `Account ${user.email} verified.` : `Verification revoked for ${user.email}.` });
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setBusyId("");
    }
  }

  return (
    <PageShell className="admin-page">
      <PageHero kicker="Platform operations" title="Admin Panel" description="Support, account verification and platform diagnostics without direct MongoDB edits." />

      {message ? <StatusMessage tone={message.tone}>{message.text}</StatusMessage> : null}

      <section className="admin-summary-grid">
        <CodexCard>
          <span className="kicker">Users</span>
          <strong>{status?.identity?.usersCount ?? "—"}</strong>
        </CodexCard>
        <CodexCard>
          <span className="kicker">Workspaces</span>
          <strong>{status?.identity?.workspacesCount ?? "—"}</strong>
        </CodexCard>
        <CodexCard>
          <span className="kicker">Campaigns</span>
          <strong>{status?.identity?.campaignsCount ?? "—"}</strong>
        </CodexCard>
        <CodexCard>
          <span className="kicker">Memberships</span>
          <strong>{status?.identity?.membershipsCount ?? "—"}</strong>
        </CodexCard>
      </section>

      <section className="admin-users-section">
        <SectionHeader title="Accounts" description="Manual verification is an audited alpha fallback while outbound email is unavailable." />
        <label className="admin-search-field">
          <span>Search users</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Email or name" />
        </label>

        {loading ? <StatusMessage>Loading platform accounts…</StatusMessage> : null}
        {!loading && !filteredUsers.length ? <StatusMessage>No accounts match this search.</StatusMessage> : null}

        <div className="admin-user-list">
          {filteredUsers.map((user) => (
            <CodexCard key={user.id} className="admin-user-card">
              <div className="admin-user-main">
                <strong>{user.name || user.email || "Unnamed account"}</strong>
                <span>{user.email}</span>
                <small>{verificationLabel(user)} · {user.status || "active"} · {user.platformRole || "user"}</small>
              </div>
              <div className="admin-user-actions">
                {user.emailVerified ? (
                  <CodexButton variant="secondary" disabled={busyId === user.id} onClick={() => setVerified(user, false)}>Revoke verification</CodexButton>
                ) : (
                  <CodexButton disabled={busyId === user.id} onClick={() => setVerified(user, true)}>Verify account</CodexButton>
                )}
              </div>
            </CodexCard>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
