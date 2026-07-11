import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Castle, ClipboardCopy, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api/client.js";

export default function AuthPage({ onAuth, session }) {
  const [params] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const verifiedMessage = useMemo(() => {
    if (params.get("verified") === "1") return "Email confirmed. You can log in now.";
    if (params.get("verified") === "invalid") return "Verification link is invalid or expired.";
    return "";
  }, [params]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function copyVerifyUrl() {
    if (!verifyUrl) return;
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setVerifyUrl("");
    try {
      if (mode === "register") {
        const data = await api.register(form);
        setVerifyUrl(data.devVerifyUrl || "");
        setMessage("Account created. Confirm the email, then log in to create a campaign workspace or accept an invitation.");
        setMode("login");
      } else {
        await api.login({ email: form.email, password: form.password });
        await onAuth?.();
      }
    } catch (err) {
      setError(err.message || "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  const statusText = "Registration creates an account only. Campaign access comes from workspace creation or an invitation.";

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <Castle size={30} />
          <div>
            <span>Party Codex</span>
            <strong>{mode === "login" ? "Campaign access" : "Create account"}</strong>
          </div>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Log in</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        {(verifiedMessage || message || error) && (
          <div className={`auth-message ${error || params.get("verified") === "invalid" ? "error" : "success"}`}>
            {error || message || verifiedMessage}
            {verifyUrl && (
              <div className="auth-verify-link-row">
                <a href={verifyUrl}>{verifyUrl}</a>
                <button type="button" onClick={copyVerifyUrl}><ClipboardCopy size={15} /> {copied ? "Copied" : "Copy"}</button>
              </div>
            )}
          </div>
        )}
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              <span><UserRound size={16} /> Display name</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            <span><Mail size={16} /> Email</span>
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required />
          </label>
          <label>
            <span><KeyRound size={16} /> Password</span>
            <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
          </label>
          <button className="gold-button" type="submit" disabled={busy}>{busy ? "Working..." : mode === "login" ? "Enter codex" : "Create account"}</button>
        </form>
        <div className="auth-note">
          <ShieldCheck size={18} />
          <span>{statusText}</span>
        </div>
        <Link className="auth-player-link" to="/guide">Read how Party Codex works</Link>
      </section>
    </main>
  );
}
