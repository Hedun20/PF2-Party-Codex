import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Gauge,
  Layers3,
  Link2,
  LoaderCircle,
  Mail,
  MailPlus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  UsersRound,
  X
} from "lucide-react";
import { api } from "../api/client.js";
import { CodexButton, CodexCard, PageHero, PageShell, StatusMessage } from "../components/ui/index.js";

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

function deliveryLabel(delivery) {
  const status = String(delivery?.status || "").toLowerCase();
  if (status === "sent") return "Письмо отправлено";
  if (status === "delivering") return "Письмо отправляется";
  if (status === "retry") return "Повторная доставка";
  if (status === "failed") return "Ошибка доставки";
  if (status === "queued") return "Письмо в очереди";
  return "Статус письма неизвестен";
}

function deliveryTone(delivery) {
  const status = String(delivery?.status || "").toLowerCase();
  if (status === "sent") return "success";
  if (["queued", "delivering", "retry"].includes(status)) return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

function plural(count, one, few, many) {
  const value = Math.abs(Number(count) || 0);
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function memberName(member = {}) {
  return member.displayName || member.name || member.email || "Участник кампании";
}

function memberInitial(member = {}) {
  return memberName(member).trim().charAt(0).toLocaleUpperCase("ru-RU") || "?";
}

function StatusCard({ icon: Icon = AlertTriangle, kicker, children }) {
  return (
    <CodexCard as="section" className="workspace-status-card">
      <Icon size={22} aria-hidden="true" />
      <span className="kicker">{kicker}</span>
      <p>{children}</p>
    </CodexCard>
  );
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`codex-pill codex-pill--${tone}`}>{children}</span>;
}

function LoadingState({ children }) {
  return (
    <div className="players-loading-state" role="status">
      <LoaderCircle size={18} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function EmptyList({ icon: Icon, title, children }) {
  return (
    <div className="players-empty-state">
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
    </div>
  );
}

export default function PlayersPage({ session }) {
  const activeCampaignId = useMemo(() => campaignId(session), [session]);
  const manager = canManage(session);
  const managerRole = activeRole(session);
  const actorUserId = getId(session?.user);
  const actorMembershipId = getId(session?.activeMembership);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [members, setMembers] = useState({ loading: false, error: "", items: [] });
  const [invites, setInvites] = useState({ loading: false, error: "", items: [] });
  const [subscription, setSubscription] = useState({ loading: false, error: "", data: null });
  const [submit, setSubmit] = useState({ loading: false, error: "", success: "", link: "" });
  const [managementAction, setManagementAction] = useState({ key: "", loading: false, error: "", success: "" });
  const [confirmAction, setConfirmAction] = useState("");

  async function load() {
    if (!activeCampaignId || !manager) return;
    setMembers((state) => ({ ...state, loading: true, error: "" }));
    setInvites((state) => ({ ...state, loading: true, error: "" }));
    setSubscription((state) => ({ ...state, loading: true, error: "" }));

    const [memberResult, inviteResult, subscriptionResult] = await Promise.allSettled([
      api.campaignMemberships(activeCampaignId),
      api.campaignInvitations(activeCampaignId),
      api.subscription()
    ]);

    if (memberResult.status === "fulfilled") {
      const items = Array.isArray(memberResult.value.memberships) ? memberResult.value.memberships : [];
      setMembers({ loading: false, error: "", items });
    } else {
      setMembers({
        loading: false,
        error: memberResult.reason?.message || "Не удалось загрузить участников.",
        items: []
      });
    }

    if (inviteResult.status === "fulfilled") {
      const items = Array.isArray(inviteResult.value.invitations) ? inviteResult.value.invitations : [];
      setInvites({ loading: false, error: "", items });
    } else {
      setInvites({
        loading: false,
        error: inviteResult.reason?.message || "Не удалось загрузить приглашения.",
        items: []
      });
    }

    if (subscriptionResult.status === "fulfilled") {
      setSubscription({ loading: false, error: "", data: subscriptionResult.value.subscription || null });
    } else {
      setSubscription({
        loading: false,
        error: subscriptionResult.reason?.message || "Не удалось загрузить лимиты workspace.",
        data: null
      });
    }
  }

  useEffect(() => {
    setConfirmAction("");
    setManagementAction({ key: "", loading: false, error: "", success: "" });
    load();
  }, [activeCampaignId, manager]);

  async function copy(value = "") {
    if (!value) return;
    setCopyError("");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setCopied(value);
    } catch {
      setCopied("");
      setCopyError("Не удалось скопировать ссылку автоматически. Выделите её и скопируйте вручную.");
    }
  }

  async function createInvite(event) {
    event.preventDefault();
    const normalized = email.trim().toLowerCase();
    setCopied("");
    setCopyError("");
    setSubmit({ loading: false, error: "", success: "", link: "" });
    if (!validEmail(normalized)) {
      setSubmit({ loading: false, error: "Введите корректный email игрока.", success: "", link: "" });
      return;
    }
    if (seatLimitReached) {
      setSubmit({ loading: false, error: "Лимит мест workspace исчерпан. Освободите место или смените тариф.", success: "", link: "" });
      return;
    }

    setSubmit({ loading: true, error: "", success: "", link: "" });
    try {
      const data = await api.createCampaignInvitation(activeCampaignId, { email: normalized, role: "player" });
      const link = data.invitation?.inviteUrl || "";
      const delivery = data.invitation?.delivery || data.emailDelivery || null;
      setSubmit({
        loading: false,
        error: "",
        success: `Приглашение для ${normalized} создано. ${deliveryLabel(delivery)}.`,
        link
      });
      setEmail("");
      await load();
    } catch (error) {
      setSubmit({
        loading: false,
        error: error.message || "Не удалось создать приглашение.",
        success: "",
        link: ""
      });
    }
  }

  async function runManagementAction(key, work, success) {
    setManagementAction({ key, loading: true, error: "", success: "" });
    try {
      await work();
      setConfirmAction("");
      await load();
      setManagementAction({ key: "", loading: false, error: "", success });
    } catch (error) {
      setManagementAction({ key: "", loading: false, error: error.message || "Не удалось выполнить действие.", success: "" });
    }
  }

  async function changeMemberRole(member, role) {
    const membershipId = getId(member);
    if (!membershipId || role === member.role) return;
    await runManagementAction(
      `role:${membershipId}`,
      () => api.updateCampaignMembership(activeCampaignId, membershipId, { role }),
      `${memberName(member)}: роль изменена на «${roleLabel(role)}».`
    );
  }

  async function removeMember(member) {
    const membershipId = getId(member);
    const key = `remove-member:${membershipId}`;
    if (confirmAction !== key) {
      setConfirmAction(key);
      return;
    }
    await runManagementAction(
      key,
      () => api.removeCampaignMembership(activeCampaignId, membershipId),
      `${memberName(member)} удалён из кампании.`
    );
  }

  async function resendInvite(invite) {
    const invitationId = getId(invite);
    const key = `resend-invite:${invitationId}`;
    setCopied("");
    setCopyError("");
    setManagementAction({ key, loading: true, error: "", success: "" });
    try {
      const data = await api.resendCampaignInvitation(activeCampaignId, invitationId);
      const link = data.invitation?.inviteUrl || "";
      setSubmit({
        loading: false,
        error: "",
        success: `Новая ссылка для ${invite.email || "игрока"} создана. Предыдущая ссылка больше не действует.`,
        link
      });
      await load();
      setManagementAction({ key: "", loading: false, error: "", success: `Письмо для ${invite.email || "игрока"} поставлено в очередь повторно.` });
    } catch (error) {
      setManagementAction({ key: "", loading: false, error: error.message || "Не удалось отправить приглашение повторно.", success: "" });
    }
  }

  async function revokeInvite(invite) {
    const invitationId = getId(invite);
    const key = `revoke-invite:${invitationId}`;
    if (confirmAction !== key) {
      setConfirmAction(key);
      return;
    }
    await runManagementAction(
      key,
      () => api.revokeCampaignInvitation(activeCampaignId, invitationId),
      `Приглашение для ${invite.email || "игрока"} отозвано.`
    );
  }

  function isSelf(member) {
    return (actorMembershipId && getId(member) === actorMembershipId)
      || (actorUserId && String(member.userId || "") === actorUserId);
  }

  function canChangeRole(member) {
    return managerRole === "owner" && member.role !== "owner";
  }

  function canRemove(member) {
    if (member.role === "owner" || isSelf(member)) return false;
    if (managerRole === "owner") return true;
    return managerRole === "gm" && member.role === "player";
  }

  const memberCount = members.items.length;
  const inviteCount = invites.items.length;
  const plan = subscription.data;
  const seatLimit = plan?.entitlements?.maxMemberSeats;
  const seatUsage = Number(plan?.usage?.memberSeats || 0) + Number(plan?.usage?.pendingInvitations || 0);
  const finiteSeatLimit = seatLimit === null || seatLimit === undefined
    ? null
    : Number.isFinite(Number(seatLimit))
      ? Number(seatLimit)
      : null;
  const seatLimitReached = finiteSeatLimit !== null && seatUsage >= finiteSeatLimit;
  const seatSummary = subscription.loading
    ? "Лимиты загружаются"
    : subscription.error
      ? "Лимит недоступен"
      : finiteSeatLimit === null
        ? `${seatUsage} мест занято · без лимита`
        : `${seatUsage} из ${finiteSeatLimit} мест занято`;

  return (
    <PageShell className="players-page players-page-polished">
      <PageHero
        className="players-hero-panel"
        kicker="Кампания · Управление доступом"
        title="Игроки и приглашения"
        description="Приглашайте игроков, назначайте со-GM и управляйте доступом строго внутри активной кампании."
      >
        <div className="workspace-identity-strip">
          <span><Layers3 size={15} aria-hidden="true" /> {session?.activeWorkspace?.name || "Workspace"}</span>
          <span><UsersRound size={15} aria-hidden="true" /> {session?.activeCampaign?.name || "Активная кампания"}</span>
          <span><ShieldCheck size={15} aria-hidden="true" /> Ваша роль: {roleLabel(managerRole)}</span>
          <span><Gauge size={15} aria-hidden="true" /> {seatSummary}</span>
        </div>
      </PageHero>

      {!activeCampaignId ? (
        <StatusCard kicker="Нет активной кампании">
          Создайте или выберите кампанию перед управлением игроками.
        </StatusCard>
      ) : null}
      {!manager ? (
        <StatusCard icon={ShieldCheck} kicker="Доступ закрыт">
          Эта страница доступна только владельцу или GM кампании.
        </StatusCard>
      ) : null}

      {manager && activeCampaignId ? (
        <>
          <CodexCard as="section" className="players-invite-card players-card-premium">
            <div className="players-card-head">
              <div>
                <span className="kicker">Новое приглашение</span>
                <h2>Пригласить игрока</h2>
                <p>Введите email — мы создадим письмо и одноразово покажем ссылку для ручной отправки.</p>
              </div>
              <span className="players-card-icon" aria-hidden="true"><MailPlus size={22} /></span>
            </div>

            <form className="players-invite-form" onSubmit={createInvite} noValidate>
              <label htmlFor="player-invite-email">
                <span>Email игрока</span>
                <span className="players-input-shell">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="player-invite-email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="player@example.com"
                    autoComplete="email"
                    aria-describedby="player-invite-help"
                    required
                  />
                </span>
                <small id="player-invite-help">
                  Приглашение действует 7 дней и занимает место workspace до принятия или отзыва. {seatSummary}.
                </small>
              </label>
              <CodexButton className="players-invite-submit" type="submit" disabled={submit.loading || seatLimitReached}>
                {submit.loading ? <LoaderCircle className="players-spinner" size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
                {submit.loading ? "Создаю..." : seatLimitReached ? "Лимит мест исчерпан" : "Создать приглашение"}
              </CodexButton>
            </form>

            {submit.error ? (
              <StatusMessage tone="danger" className="players-status-message" role="alert">
                <AlertTriangle size={17} aria-hidden="true" /> {submit.error}
              </StatusMessage>
            ) : null}
            {submit.success ? (
              <StatusMessage tone="success" className="players-status-message">
                <CheckCircle2 size={17} aria-hidden="true" /> {submit.success}
              </StatusMessage>
            ) : null}

            {submit.link ? (
              <div className="invite-copy-card">
                <Link2 size={19} aria-hidden="true" />
                <div>
                  <strong>Новая ссылка готова</strong>
                  <span title={submit.link}>{submit.link}</span>
                </div>
                <CodexButton type="button" variant="secondary" size="sm" onClick={() => copy(submit.link)}>
                  <Copy size={16} aria-hidden="true" />
                  {copied === submit.link ? "Скопировано" : "Копировать"}
                </CodexButton>
              </div>
            ) : null}

            {copyError ? (
              <StatusMessage tone="danger" className="players-status-message" role="alert">
                <AlertTriangle size={17} aria-hidden="true" /> {copyError}
              </StatusMessage>
            ) : null}
            <span className="players-copy-announcement" aria-live="polite">
              {copied ? "Ссылка приглашения скопирована." : ""}
            </span>
          </CodexCard>

          {managementAction.error ? (
            <StatusMessage tone="danger" className="players-status-message players-management-message" role="alert">
              <AlertTriangle size={17} aria-hidden="true" /> {managementAction.error}
            </StatusMessage>
          ) : null}
          {managementAction.success ? (
            <StatusMessage tone="success" className="players-status-message players-management-message">
              <CheckCircle2 size={17} aria-hidden="true" /> {managementAction.success}
            </StatusMessage>
          ) : null}
          {members.error ? <StatusCard kicker="Ошибка участников">{members.error}</StatusCard> : null}
          {invites.error ? <StatusCard kicker="Ошибка приглашений">{invites.error}</StatusCard> : null}
          {subscription.error ? <StatusCard kicker="Ошибка лимитов">{subscription.error}</StatusCard> : null}

          <section className="players-management-grid" aria-label="Участники и приглашения кампании">
            <CodexCard className="players-card-premium players-table-card">
              <div className="players-card-head">
                <div>
                  <span className="kicker">Участники</span>
                  <h2>{memberCount} {plural(memberCount, "участник", "участника", "участников")}</h2>
                  <p>{managerRole === "owner" ? "Назначайте игроков и со-GM, не затрагивая защищённую роль владельца." : "GM может удалить игрока, но не изменять роли и не управлять другими GM."}</p>
                </div>
                <span className="players-card-icon" aria-hidden="true"><UsersRound size={21} /></span>
              </div>

              {members.loading ? <LoadingState>Загружаю участников кампании...</LoadingState> : null}
              {memberCount ? (
                <div className="players-row-list">
                  {members.items.map((member) => {
                    const membershipId = getId(member);
                    const roleActionKey = `role:${membershipId}`;
                    const removeActionKey = `remove-member:${membershipId}`;
                    const roleBusy = managementAction.loading && managementAction.key === roleActionKey;
                    const removeBusy = managementAction.loading && managementAction.key === removeActionKey;
                    const confirmingRemoval = confirmAction === removeActionKey;
                    return (
                      <div className="players-row players-member-row" key={membershipId || `${member.userId}-${member.role}`}>
                        <div className="players-person">
                          <span className="players-avatar" aria-hidden="true">{memberInitial(member)}</span>
                          <div className="players-row-copy">
                            <strong>{memberName(member)} {isSelf(member) ? <small className="players-self-label">это вы</small> : null}</strong>
                            <span>{member.email || member.userId || "Email не указан"}</span>
                          </div>
                        </div>
                        <div className="players-row-meta">
                          <div className="players-badges">
                            <Badge>{roleLabel(member.role || "player")}</Badge>
                            <Badge tone={statusTone(member.status)}>{statusLabel(member.status)}</Badge>
                          </div>
                          <small className="players-row-date">
                            <Clock3 size={14} aria-hidden="true" />
                            С нами с {dateLabel(member.joinedAt || member.createdAt)}
                          </small>
                          <div className="players-member-actions">
                            {canChangeRole(member) ? (
                              <label className="players-role-control">
                                <span><UserCog size={14} aria-hidden="true" /> Роль</span>
                                <select
                                  className="players-role-select"
                                  value={member.role || "player"}
                                  disabled={roleBusy || removeBusy}
                                  onChange={(event) => changeMemberRole(member, event.target.value)}
                                  aria-label={`Роль участника ${memberName(member)}`}
                                >
                                  <option value="player">Игрок</option>
                                  <option value="gm">GM</option>
                                </select>
                              </label>
                            ) : (
                              <span className="players-action-note">
                                {member.role === "owner" ? "Владелец защищён" : isSelf(member) ? "Собственная роль" : "Роль меняет владелец"}
                              </span>
                            )}
                            {canRemove(member) ? (
                              <div className="players-destructive-actions">
                                {confirmingRemoval ? (
                                  <CodexButton type="button" variant="ghost" size="sm" onClick={() => setConfirmAction("")} disabled={removeBusy}>
                                    <X size={14} aria-hidden="true" /> Отмена
                                  </CodexButton>
                                ) : null}
                                <CodexButton
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className={confirmingRemoval ? "players-danger-action is-confirming" : "players-danger-action"}
                                  onClick={() => removeMember(member)}
                                  disabled={roleBusy || removeBusy}
                                >
                                  {removeBusy ? <LoaderCircle className="players-spinner" size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                                  {removeBusy ? "Удаляю..." : confirmingRemoval ? "Подтвердить" : "Удалить"}
                                </CodexButton>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !members.loading && !members.error ? (
                <EmptyList icon={UsersRound} title="Пока никого нет">
                  Создайте первое приглашение, чтобы добавить игрока.
                </EmptyList>
              ) : null}
            </CodexCard>

            <CodexCard className="players-card-premium players-table-card">
              <div className="players-card-head">
                <div>
                  <span className="kicker">Ожидают ответа</span>
                  <h2>{inviteCount} {plural(inviteCount, "приглашение", "приглашения", "приглашений")}</h2>
                  <p>Повторная отправка создаёт новый токен и сразу отключает предыдущую ссылку.</p>
                </div>
                <span className="players-card-icon" aria-hidden="true"><MailPlus size={21} /></span>
              </div>

              {invites.loading ? <LoadingState>Загружаю приглашения...</LoadingState> : null}
              {inviteCount ? (
                <div className="players-row-list">
                  {invites.items.map((invite) => {
                    const invitationId = getId(invite);
                    const resendActionKey = `resend-invite:${invitationId}`;
                    const revokeActionKey = `revoke-invite:${invitationId}`;
                    const resendBusy = managementAction.loading && managementAction.key === resendActionKey;
                    const revokeBusy = managementAction.loading && managementAction.key === revokeActionKey;
                    const actionBusy = resendBusy || revokeBusy;
                    const confirmingRevoke = confirmAction === revokeActionKey;
                    return (
                      <div className="players-row invite-row" key={invitationId || `${invite.email}-${invite.createdAt || ""}`}>
                        <div className="players-person">
                          <span className="players-avatar players-avatar--invite" aria-hidden="true"><Mail size={17} /></span>
                          <div className="players-row-copy">
                            <strong>{invite.email || "Email не указан"}</strong>
                            <span>Действует до {dateLabel(invite.expiresAt)}</span>
                          </div>
                        </div>
                        <div className="players-row-meta">
                          <div className="players-badges">
                            <Badge>{roleLabel(invite.role || "player")}</Badge>
                            <Badge tone={statusTone(invite.status || "pending")}>{statusLabel(invite.status || "pending")}</Badge>
                            <Badge tone={deliveryTone(invite.delivery)}>{deliveryLabel(invite.delivery)}</Badge>
                          </div>
                          <small className="players-row-date">
                            <Clock3 size={14} aria-hidden="true" />
                            {invite.lastResentAt ? `Повторно отправлено ${dateLabel(invite.lastResentAt)}` : `Создано ${dateLabel(invite.createdAt)}`}
                          </small>
                          {invite.delivery?.lastError ? <small className="players-action-note">{invite.delivery.lastError}</small> : null}
                          <div className="players-invite-actions">
                            <CodexButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => resendInvite(invite)}
                              disabled={actionBusy}
                            >
                              {resendBusy ? <LoaderCircle className="players-spinner" size={14} aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
                              {resendBusy ? "Отправляю..." : "Отправить снова"}
                            </CodexButton>
                            {confirmingRevoke ? (
                              <CodexButton type="button" variant="ghost" size="sm" onClick={() => setConfirmAction("")} disabled={actionBusy}>
                                <X size={14} aria-hidden="true" /> Отмена
                              </CodexButton>
                            ) : null}
                            <CodexButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              className={confirmingRevoke ? "players-danger-action is-confirming" : "players-danger-action"}
                              onClick={() => revokeInvite(invite)}
                              disabled={actionBusy}
                            >
                              {revokeBusy ? <LoaderCircle className="players-spinner" size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                              {revokeBusy ? "Отзываю..." : confirmingRevoke ? "Подтвердить" : "Отозвать"}
                            </CodexButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !invites.loading && !invites.error ? (
                <EmptyList icon={MailPlus} title="Нет ожидающих приглашений">
                  Новое приглашение появится здесь сразу после создания.
                </EmptyList>
              ) : null}
            </CodexCard>
          </section>
        </>
      ) : null}
    </PageShell>
  );
}
