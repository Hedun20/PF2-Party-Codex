import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Castle, ClipboardCopy, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

export default function AuthPage({ onAuth }) {
  const [params, setParams] = useSearchParams();
  const resetToken = params.get("resetToken") || "";
  const [mode, setMode] = useState(() => resetToken ? "reset" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resetToken) setMode("reset");
  }, [resetToken]);

  const verifiedMessage = useMemo(() => {
    if (params.get("verified") === "1") return "Email confirmed. You can log in now.";
    if (params.get("verified") === "invalid") return "Verification link is invalid or expired.";
    if (params.get("reset") === "1") return "Password updated. Log in with the new password.";
    return "";
  }, [params]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setActionUrl("");
    setCopied(false);
    setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
  }

  async function copyActionUrl() {
    if (!actionUrl) return;
    try {
      await navigator.clipboard.writeText(actionUrl);
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
    setActionUrl("");
    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) throw new Error("Passwords do not match.");
        const data = await api.register(form);
        setActionUrl(data.devVerifyUrl || "");
        setMessage("Account created. Confirm the email, then log in to create a campaign workspace or accept an invitation.");
        setMode("login");
      } else if (mode === "forgot") {
        const data = await api.requestPasswordReset(form.email);
        setActionUrl(data.devResetUrl || "");
        setMessage(data.message || "If the account exists, a password reset message has been queued.");
      } else if (mode === "reset") {
        if (!resetToken) throw new Error("Password reset link is missing or invalid.");
        if (form.password !== form.confirmPassword) throw new Error("Passwords do not match.");
        await api.resetPassword({ token: resetToken, password: form.password });
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setParams({ reset: "1" });
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

  async function resendVerification() {
    if (!form.email || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await api.resendVerification(form.email);
      setMessage(data.message || "If the account is awaiting confirmation, a new email has been queued.");
    } catch (err) {
      setError(err.message || "Could not queue a new confirmation email.");
    } finally {
      setBusy(false);
    }
  }

  const statusText = mode === "reset"
    ? "Choose a new password. Completing the reset signs out existing sessions for this account."
    : "Registration creates an account only. Campaign access comes from workspace creation or an invitation.";
  const title = mode === "register" ? "Create account" : mode === "forgot" ? "Recover account" : mode === "reset" ? "Set new password" : "Campaign access";
  const submitLabel = mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Update password" : "Enter codex";

  return (
    <section className="auth-page" aria-label="Party Codex account access">
      <section className="auth-panel">
        <div className="auth-brand">
          <Castle size={30} />
          <div>
            <span>Party Codex</span>
            <strong>{title}</strong>
          </div>
        </div>
        {mode !== "reset" ? (
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Log in</button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Register</button>
          </div>
        ) : null}
        {(verifiedMessage || message || error) && (
          <div className={`auth-message ${error || params.get("verified") === "invalid" ? "error" : "success"}`}>
            {error || message || verifiedMessage}
            {actionUrl && (
              <div className="auth-verify-link-row">
                <a href={actionUrl}>{actionUrl}</a>
                <button type="button" onClick={copyActionUrl}><ClipboardCopy size={15} /> {copied ? "Copied" : "Copy"}</button>
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
          {mode !== "reset" ? (
            <label>
              <span><Mail size={16} /> Email</span>
              <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" required />
            </label>
          ) : null}
          {mode !== "forgot" ? (
            <label>
              <span><KeyRound size={16} /> {mode === "reset" ? "New password" : "Password"}</span>
              <input type="password" value={form.password} onChange={(event) => update("password", event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={256} required />
            </label>
          ) : null}
          {["register", "reset"].includes(mode) ? (
            <label>
              <span><KeyRound size={16} /> Confirm password</span>
              <input type="password" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" minLength={8} maxLength={256} required />
            </label>
          ) : null}
          <CodexButton type="submit" disabled={busy}>{busy ? "Working..." : submitLabel}</CodexButton>
          {mode === "login" ? (
            <>
              <button type="button" className="auth-resend-link" disabled={busy || !form.email} onClick={resendVerification}>Resend email confirmation</button>
              <button type="button" className="auth-resend-link" disabled={busy} onClick={() => switchMode("forgot")}>Forgot password?</button>
            </>
          ) : null}
          {["forgot", "reset"].includes(mode) ? (
            <button type="button" className="auth-resend-link" disabled={busy} onClick={() => { setParams({}); switchMode("login"); }}>Back to login</button>
          ) : null}
        </form>
        <div className="auth-note">
          <ShieldCheck size={18} />
          <span>{statusText}</span>
        </div>
        <Link className="auth-player-link" to="/guide">Read how Party Codex works</Link>
      </section>
    </section>
  );
}
