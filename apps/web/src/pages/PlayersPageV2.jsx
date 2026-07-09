import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, MailPlus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

function getId(entity) {
  return entity?.id || entity?._id || "";
}

function campaignId(session) {
  return getId(session?.activeCampaign) || session?.activeMembership?.campaignId || "";
}

function activeRole(session) {
  return String(session?.activeMembership?.role || "player").toLowerCase();
}

function canManage(session) {
  return ["owner", "gm"].includes(activeRole(session));
}

function validEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function dateLabel(value = "") {
  if (!value) return "нет данных";
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function roleLabel(role = "player") {
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  return "Игрок";
}

function statusLabel(status = "active") {
  const value = String(status || "active").toLowerCase();
  if (value === "pending") return "Ожидает";
  if (value === "accepted") return "Принято";
  if (value === "expired") return "Истекло";
  if (value === "revoked") return "Отозвано";
  if (value === "removed") return "Удалён";
  return "Активен";
}

function statusTone(status = "active") {
  const value = String(status || "active").toLowerCase();
  if (["active", "accepted"].includes(value)) return "success";
  if (value === "pending") return "warning";
  if (["expired", "revoked", "removed"].includes(value)) return "danger";
  return "neutral";
}

function StatusCard({ icon: Icon = AlertTriangle, kicker, children }) {
  return (
    <section className="codex-card workspace-status-card">
      <Icon size={22} />
      <span className="kicker">{kicker}</span>
      <p>{children}</p>
    </section>
  );
}

function Pill({ children, tone = "neutral" }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}

function MemberCard({ member }) {
  return (
    <article className="roster-card roster-card--member">
      <div className="roster-card-main">
        <strong>{member.displayName || member.name || member.email || "Участник кампании"}</strong>
        <span>{member.email || member.userId || "email не указан"}</span>
      </div>
      <div className="roster-card-meta">
        <Pill>{roleLabel(member.role || "player")}</Pill>
        <Pill tone={statusTone(member.status)}>{statusLabel(member.status)}</Pill>
        <small>С нами: {dateLabel(member.joinedAt || member.createdAt)}</small>
      </div>
    </article>
  );
}

function InvitationCard({ invite, copied, onCopy }) {
  const inviteUrl = invite.inviteUrl || "";
  return (
    <article className="invite-log-card">
      <div className="invite-log-card-top">
        <div>
          <span className="kicker">Invitation Log</span>
          <strong>{invite.email}</strong>
        </div>
        <Pill tone={statusTone(invite.status || "pending")}>{statusLabel(invite.status || "pending")}</Pill>
      </div>
      <div className="invite-log-card-grid">
        <span><b>Роль</b>{roleLabel(invite.role || "player")}</span>
        <span><b>Создано</b>{dateLabel(invite.createdAt)}</span>
        <span><b>Истекает</b>{dateLabel(invite.expiresAt)}</span>
      </div>
      {inviteUrl ? (
        <div className="invite-log-copy-row">
          <code>{inviteUrl}</code>
          <CodexButton type="button" variant="secondary" size="sm" onClick={() => onCopy(inviteUrl)}><Copy size={15} /> <span>{copied === inviteUrl ? "Скопировано" : "Копировать"}</span></CodexButton>
        </div>
      ) : null}
    </article>
  );
}

export default function PlayersPageV2({ session }) {
  const activeCampaignId = useMemo(() => campaignId(session), [session]);
  const manager = canManage(session);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState("");
  const [members, setMembers] = useState({ loading: false, error: "", items: [] });
  const [invites, setInvites] = useState({ loading: false, error: "", items: [] });
  const [submit, setSubmit] = useState({ loading: false, error: "", success: "", link: "" });

  async function load() {
    if (!activeCampaignId || !manager) return;
    setMembers((state) => ({ ...state, loading: true, error: "" }));
    setInvites((state) => ({ ...state, loading: true, error: "" }));
    try {
      const data = await api.campaignMemberships(activeCampaignId);
      setMembers({ loading: false, error: "", items: Array.isArray(data.memberships) ? data.memberships : [] });
    } catch (error) {
      setMembers({ loading: false, error: error.message || "Не удалось загрузить участников.", items: [] });
    }
    try {
      const data = await api.campaignInvitations(activeCampaignId);
      setInvites({ loading: false, error: "", items: Array.isArray(data.invitations) ? data.invitations : [] });
    } catch (error) {
      setInvites({ loading: false, error: error.message || "Не удалось загрузить приглашения.", items: [] });
    }
  }

  useEffect(() => {
    load();
  }, [activeCampaignId, manager]);

  async function copy(value = "") {
    if (!value || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(value);
  }

  async function createInvite(event) {
    event.preventDefault();
    const normalized = email.trim();
    setCopied("");
    setSubmit({ loading: false, error: "", success: "", link: "" });
    if (!validEmail(normalized)) {
      setSubmit({ loading: false, error: "Введите корректный email игрока.", success: "", link: "" });
      return;
    }
    setSubmit({ loading: true, error: "", success: "", link: "" });
    try {
      const data = await api.createCampaignInvitation(activeCampaignId, { email: normalized, role: "player" });
      const link = data.invitation?.inviteUrl || "";
      setSubmit({ loading: false, error: "", success: "Приглашение создано. Его можно отправить email или скопировать ссылкой.", link });
      setEmail("");
      await load();
    } catch (error) {
      setSubmit({ loading: false, error: error.message || "Не удалось создать приглашение.", success: "", link: "" });
    }
  }

  return (
    <div className="page-stack players-page players-page-v2 players-page-polished">
      <section className="hero-panel players-hero-panel">
        <span className="kicker">Management · Campaign Access</span>
        <h1>Игроки и приглашения</h1>
        <p>GM управляет участниками кампании и приглашает новых игроков. GM-роль через приглашение не выдаётся.</p>
        <div className="workspace-identity-strip">
          <span>{session?.activeWorkspace?.name || "Workspace"}</span>
          <span>{session?.activeCampaign?.name || "Активная кампания"}</span>
          <span>Ваша роль: {roleLabel(activeRole(session))}</span>
        </div>
      </section>

      {!activeCampaignId ? <StatusCard kicker="Нет активной кампании">Создайте или выберите кампанию перед управлением игроками.</StatusCard> : null}
      {!manager ? <StatusCard icon={ShieldCheck} kicker="Доступ закрыт">Эта страница доступна только владельцу или GM кампании.</StatusCard> : null}

      {manager && activeCampaignId ? (
        <>
          <section className="codex-card players-invite-card players-invite-card-v2">
            <div className="players-card-head">
              <div>
                <span className="kicker">Пригласить игрока</span>
                <h2>Создать приглашение</h2>
                <p>Ссылка создаётся отдельно: её можно скопировать и отправить вручную.</p>
              </div>
              <MailPlus size={24} />
            </div>
            <form className="players-invite-form" onSubmit={createInvite}>
              <label>Email игрока
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@example.com" autoComplete="email" />
              </label>
              <CodexButton type="submit" disabled={submit.loading}><UserPlus size={16} /> <span>{submit.loading ? "Создаю..." : "Создать приглашение"}</span></CodexButton>
            </form>
            {submit.error ? <div className="status-message danger-message"><AlertTriangle size={16} /> {submit.error}</div> : null}
            {submit.success ? <div className="status-message success-message"><CheckCircle2 size={16} /> {submit.success}</div> : null}
            {submit.link ? (
              <div className="invite-log-copy-row invite-log-copy-row--fresh">
                <code>{submit.link}</code>
                <CodexButton type="button" variant="secondary" size="sm" onClick={() => copy(submit.link)}><Copy size={16} /> <span>{copied === submit.link ? "Скопировано" : "Копировать ссылку"}</span></CodexButton>
              </div>
            ) : null}
          </section>

          {members.error ? <StatusCard kicker="Ошибка участников">{members.error}</StatusCard> : null}
          {invites.error ? <StatusCard kicker="Ошибка приглашений">{invites.error}</StatusCard> : null}

          <section className="players-access-grid">
            <article className="codex-card players-roster-panel">
              <div className="players-card-head">
                <div>
                  <span className="kicker">Участники</span>
                  <h2>{members.items.length} в кампании</h2>
                </div>
                <UsersRound size={22} />
              </div>
              {members.loading ? <p className="empty-copy">Загружаю участников кампании...</p> : null}
              {members.items.length ? (
                <div className="roster-card-list">
                  {members.items.map((member) => <MemberCard key={member.id || `${member.userId}-${member.role}`} member={member} />)}
                </div>
              ) : !members.loading && !members.error ? <p className="empty-copy">Пока нет участников кампании.</p> : null}
            </article>

            <article className="codex-card players-roster-panel players-invites-panel">
              <div className="players-card-head">
                <div>
                  <span className="kicker">Активные приглашения</span>
                  <h2>{invites.items.length} invitation logs</h2>
                </div>
                <MailPlus size={22} />
              </div>
              {invites.loading ? <p className="empty-copy">Загружаю приглашения...</p> : null}
              {invites.items.length ? (
                <div className="invite-log-list">
                  {invites.items.map((invite) => <InvitationCard key={invite.id || invite.email} invite={invite} copied={copied} onCopy={copy} />)}
                </div>
              ) : !invites.loading && !invites.error ? <p className="empty-copy">Нет активных приглашений.</p> : null}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
