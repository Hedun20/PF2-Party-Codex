import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, MailCheck } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

function targetRoute(role = "player") {
  return ["owner", "gm"].includes(String(role).toLowerCase()) ? "/gm" : "/player";
}

function authReturnPath(token = "") {
  const invitePath = `/invite/${encodeURIComponent(String(token || ""))}`;
  return `/login?returnTo=${encodeURIComponent(invitePath)}`;
}

export default function InviteAcceptPage({ session, onAccepted }) {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const signedIn = Boolean(session?.user);
  const [state, setState] = useState({ loading: false, error: "", success: "", role: "" });

  useEffect(() => {
    if (!signedIn || !token) return;
    let active = true;
    setState({ loading: true, error: "", success: "", role: "" });
    api.acceptInvitation(token)
      .then(async (data) => {
        if (!active) return;
        const role = data.activeMembership?.role || data.membership?.role || data.role || "player";
        setState({ loading: false, error: "", success: "Invitation accepted.", role });
        if (onAccepted) await onAccepted();
        setTimeout(() => navigate(targetRoute(role)), 500);
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error.message || "Invitation could not be accepted.", success: "", role: "" });
      });
    return () => {
      active = false;
    };
  }, [signedIn, token]);

  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">Campaign invitation</span>
        <h1>Join campaign</h1>
        <p>Accepting an invitation requires an existing logged-in account with the invited email address.</p>
      </section>

      {!signedIn ? (
        <section className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Login required</span>
          <p>Log in or register with the invited email. Party Codex will return to this invitation automatically after authentication; the invite token is never stored in browser storage.</p>
          <CodexButton as={Link} to={authReturnPath(token)}>Login / Register</CodexButton>
        </section>
      ) : null}

      {state.loading ? (
        <section className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Accepting invitation</span>
          <p>Verifying token and activating campaign membership.</p>
        </section>
      ) : null}

      {state.error ? (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Invitation unavailable</span>
          <p>{state.error}</p>
        </section>
      ) : null}

      {state.success ? (
        <section className="codex-card workspace-status-card">
          <CheckCircle2 size={22} />
          <span className="kicker">Invitation accepted</span>
          <p>{state.success} Redirecting to your {targetRoute(state.role) === "/gm" ? "GM Portal" : "Player Portal"}.</p>
        </section>
      ) : null}
    </div>
  );
}
