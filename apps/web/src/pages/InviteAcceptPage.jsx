import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, LogOut, MailCheck, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

function targetRoute(role = "player") {
  return ["owner", "gm"].includes(String(role).toLowerCase()) ? "/gm" : "/player";
}

function authReturnPath(token = "") {
  const invitePath = `/invite/${encodeURIComponent(String(token || ""))}`;
  return `/login?returnTo=${encodeURIComponent(invitePath)}`;
}

function roleLabel(role = "player") {
  return ["owner", "gm"].includes(String(role).toLowerCase()) ? "мастера" : "игрока";
}

function expiryLabel(value = "") {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Срок не указан";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function InviteAcceptPage({ session, onAccepted }) {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const signedIn = Boolean(session?.user);
  const [previewState, setPreviewState] = useState({ loading: true, error: "", invitation: null });
  const [actionState, setActionState] = useState({ busy: false, error: "", accepted: false, role: "" });
  const [switchingAccount, setSwitchingAccount] = useState(false);

  async function loadPreview(active = () => true) {
    if (!token) {
      if (active()) setPreviewState({ loading: false, error: "Invitation token is missing.", invitation: null });
      return;
    }
    if (active()) setPreviewState({ loading: true, error: "", invitation: null });
    try {
      const data = await api.invitationPreview(token);
      if (active()) setPreviewState({ loading: false, error: "", invitation: data.invitation || null });
    } catch (error) {
      if (active()) setPreviewState({ loading: false, error: error.message || "Invitation could not be loaded.", invitation: null });
    }
  }

  useEffect(() => {
    let mounted = true;
    loadPreview(() => mounted);
    return () => {
      mounted = false;
    };
  }, [token, signedIn, session?.user?.id]);

  async function acceptInvite() {
    if (!token || actionState.busy) return;
    setActionState((current) => ({ ...current, busy: true, error: "" }));
    try {
      const data = await api.acceptInvitation(token);
      const role = data.activeMembership?.role || data.membership?.role || data.role || "player";
      setActionState({ busy: false, error: "", accepted: true, role });
      await onAccepted?.();
    } catch (error) {
      setActionState((current) => ({ ...current, busy: false, error: error.message || "Invitation could not be accepted." }));
    }
  }

  async function useAnotherAccount() {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    try {
      await api.logout();
    } finally {
      window.location.assign(authReturnPath(token));
    }
  }

  const invitation = previewState.invitation;
  const accepted = actionState.accepted || Boolean(invitation?.acceptedByCurrentUser);
  const role = actionState.role || invitation?.role || "player";
  const mismatch = signedIn && invitation?.emailMatchesCurrentUser === false;
  const status = invitation?.status || "";
  const unavailable = ["expired", "revoked"].includes(status);
  const acceptedElsewhere = status === "accepted" && !invitation?.acceptedByCurrentUser && !actionState.accepted;

  return (
    <div className="page-stack placeholder-page invitation-accept-page">
      <section className="hero-panel">
        <span className="kicker">Campaign invitation</span>
        <h1>{invitation?.campaignName || "Join campaign"}</h1>
        <p>{invitation ? `Рабочее пространство: ${invitation.workspaceName}. Роль после принятия: ${roleLabel(invitation.role)}.` : "Проверяем приглашение перед входом в кампанию."}</p>
      </section>

      {previewState.loading ? (
        <section className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Проверяем приглашение</span>
          <p>Загружаем безопасную сводку кампании. Приглашение не будет принято автоматически.</p>
        </section>
      ) : null}

      {previewState.error ? (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Invitation unavailable</span>
          <p>{previewState.error}</p>
          <CodexButton type="button" variant="secondary" onClick={() => loadPreview()}><RefreshCw size={16} /><span>Проверить снова</span></CodexButton>
        </section>
      ) : null}

      {invitation ? (
        <section className="codex-card workspace-status-card invitation-preview-card">
          <ShieldCheck size={22} />
          <span className="kicker">Проверенное приглашение</span>
          <h2>{invitation.campaignName}</h2>
          <p>Приглашение предназначено для адреса {invitation.emailHint}. Полный адрес Party Codex не раскрывает.</p>
          <div className="workspace-stat-grid">
            <article><span>Роль</span><strong>{roleLabel(invitation.role)}</strong></article>
            <article><span>Статус</span><strong>{status || "pending"}</strong></article>
            <article><span>Действует до</span><strong>{expiryLabel(invitation.expiresAt)}</strong></article>
          </div>
        </section>
      ) : null}

      {invitation && !signedIn && status === "pending" ? (
        <section className="codex-card workspace-status-card">
          <MailCheck size={22} />
          <span className="kicker">Login required</span>
          <p>Войдите или зарегистрируйтесь с приглашённым email. После авторизации вы вернётесь на эту страницу и отдельно подтвердите вступление.</p>
          <CodexButton as={Link} to={authReturnPath(token)}>Login / Register</CodexButton>
        </section>
      ) : null}

      {invitation && mismatch && status === "pending" ? (
        <section className="codex-card workspace-status-card">
          <UserCheck size={22} />
          <span className="kicker">Другой аккаунт</span>
          <p>Текущий аккаунт не совпадает с адресом {invitation.emailHint}. Выйдите и войдите под приглашённым адресом.</p>
          <CodexButton type="button" variant="secondary" disabled={switchingAccount} onClick={useAnotherAccount}><LogOut size={16} /><span>{switchingAccount ? "Выходим..." : "Использовать другой аккаунт"}</span></CodexButton>
        </section>
      ) : null}

      {invitation && signedIn && invitation.canAccept && !accepted ? (
        <section className="codex-card workspace-status-card">
          <UserCheck size={22} />
          <span className="kicker">Подтверждение вступления</span>
          <p>Аккаунт совпадает с приглашением. Нажатие создаст или восстановит membership и сделает эту кампанию активной.</p>
          {actionState.error ? <p className="status-message status-message--danger" role="alert">{actionState.error}</p> : null}
          <CodexButton type="button" disabled={actionState.busy} onClick={acceptInvite}>{actionState.busy ? "Принимаем..." : "Accept invitation"}</CodexButton>
        </section>
      ) : null}

      {invitation && unavailable ? (
        <section className="codex-card workspace-status-card">
          <Clock3 size={22} />
          <span className="kicker">Приглашение больше не действует</span>
          <p>{status === "expired" ? "Срок приглашения истёк. Попросите мастера отправить новое." : "Приглашение было отозвано мастером кампании."}</p>
        </section>
      ) : null}

      {invitation && acceptedElsewhere ? (
        <section className="codex-card workspace-status-card">
          <AlertTriangle size={22} />
          <span className="kicker">Приглашение уже использовано</span>
          <p>Ссылка уже была принята другим аккаунтом. Войдите под аккаунтом, который принимал приглашение, или запросите новую ссылку.</p>
          {signedIn ? <CodexButton type="button" variant="secondary" disabled={switchingAccount} onClick={useAnotherAccount}><LogOut size={16} /><span>Сменить аккаунт</span></CodexButton> : null}
        </section>
      ) : null}

      {accepted ? (
        <section className="codex-card workspace-status-card">
          <CheckCircle2 size={22} />
          <span className="kicker">Invitation accepted</span>
          <p>Membership активен. Можно перейти в {targetRoute(role) === "/gm" ? "GM Portal" : "Player Portal"}.</p>
          <CodexButton type="button" onClick={() => navigate(targetRoute(role), { replace: true })}>Открыть кампанию</CodexButton>
        </section>
      ) : null}
    </div>
  );
}
