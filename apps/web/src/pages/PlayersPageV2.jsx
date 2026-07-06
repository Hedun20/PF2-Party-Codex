import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, MailPlus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { api } from "../api/client.js";

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
    return new Intl.DateTimeFormat("ru", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function roleLabel(role = "player") {
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  return "Игрок";
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
    <div className="page-stack players-page players-page-v2">
      <section className="hero-panel">
        <span className="kicker">GM Portal</span>
        <h1>Игроки и приглашения</h1>
        <p>Здесь GM управляет участниками кампании и приглашает новых игроков. GM-роль через приглашение не выдаётся.</p>
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
          <section className="codex-card workspace-status-card players-invite-card">
            <MailPlus size={22} />
            <span className="kicker">Пригласить игрока</span>
            <p>Введите email. Система создаст письмо в outbox и отдельную ссылку, которую можно отправить вручную.</p>
            <form className="character-import-grid" onSubmit={createInvite}>
              <label>Email игрока
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="player@example.com" autoComplete="email" />
              </label>
              <button type="submit" className="codex-button codex-button--primary codex-button--md" disabled={submit.loading}>{submit.loading ? "Создаю..." : "Создать приглашение"}</button>
            </form>
            {submit.error ? <div className="status-message danger-message"><AlertTriangle size={16} /> {submit.error}</div> : null}
            {submit.success ? <div className="status-message success-message"><CheckCircle2 size={16} /> {submit.success}</div> : null}
            {submit.link ? (
              <div className="notes-linked-card">
                <span>{submit.link}</span>
                <button type="button" className="codex-button codex-button--secondary codex-button--sm" onClick={() => copy(submit.link)}><Copy size={16} /> {copied === submit.link ? "Скопировано" : "Копировать ссылку"}</button>
              </div>
            ) : null}
          </section>

          {members.loading ? <StatusCard icon={UsersRound} kicker="Загрузка">Загружаю участников кампании.</StatusCard> : null}
          {members.error ? <StatusCard kicker="Ошибка участников">{members.error}</StatusCard> : null}
          {invites.error ? <StatusCard kicker="Ошибка приглашений">{invites.error}</StatusCard> : null}

          <section className="archive-recent-grid">
            <article className="codex-card archive-recent-card">
              <span className="kicker">Участники</span>
              {members.items.length ? (
                <ul>
                  {members.items.map((member) => (
                    <li key={member.id || `${member.userId}-${member.role}`}>
                      <strong>{member.displayName || member.email || "Участник кампании"}</strong>
                      {member.email ? <span> · {member.email}</span> : null}
                      <span> · {roleLabel(member.role || "player")}</span>
                      <small> · С нами: {dateLabel(member.joinedAt || member.createdAt)}</small>
                    </li>
                  ))}
                </ul>
              ) : !members.loading && !members.error ? <p>Пока нет участников кампании.</p> : null}
            </article>

            <article className="codex-card archive-recent-card">
              <span className="kicker">Активные приглашения</span>
              {invites.loading ? <p>Загружаю приглашения...</p> : null}
              {invites.items.length ? (
                <ul>
                  {invites.items.map((invite) => (
                    <li key={invite.id || invite.email}>
                      <strong>{invite.email}</strong>
                      <span> · Игрок</span>
                      <span> · {invite.status || "pending"}</span>
                      <small> · Истекает: {dateLabel(invite.expiresAt)}</small>
                      {invite.inviteUrl ? <button type="button" className="codex-button codex-button--ghost codex-button--sm" onClick={() => copy(invite.inviteUrl)}><Copy size={15} /> {copied === invite.inviteUrl ? "Скопировано" : "Копировать ссылку"}</button> : null}
                    </li>
                  ))}
                </ul>
              ) : !invites.loading && !invites.error ? <p>Нет активных приглашений.</p> : null}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
