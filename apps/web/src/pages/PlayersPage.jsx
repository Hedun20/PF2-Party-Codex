import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  Layers3,
  Link2,
  LoaderCircle,
  Mail,
  MailPlus,
  ShieldCheck,
  UserPlus,
  UsersRound
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
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState("");
  const [copyError, setCopyError] = useState("");
  const [members, setMembers] = useState({ loading: false, error: "", items: [] });
  const [invites, setInvites] = useState({ loading: false, error: "", items: [] });
  const [submit, setSubmit] = useState({ loading: false, error: "", success: "", link: "" });

  async function load() {
    if (!activeCampaignId || !manager) return;
    setMembers((state) => ({ ...state, loading: true, error: "" }));
    setInvites((state) => ({ ...state, loading: true, error: "" }));

    const [memberResult, inviteResult] = await Promise.allSettled([
      api.campaignMemberships(activeCampaignId),
      api.campaignInvitations(activeCampaignId)
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
  }

  useEffect(() => {
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

    setSubmit({ loading: true, error: "", success: "", link: "" });
    try {
      const data = await api.createCampaignInvitation(activeCampaignId, { email: normalized, role: "player" });
      const link = data.invitation?.inviteUrl || "";
      setSubmit({
        loading: false,
        error: "",
        success: `Приглашение для ${normalized} создано.`,
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

  const memberCount = members.items.length;
  const inviteCount = invites.items.length;

  return (
    <PageShell className="players-page players-page-polished">
      <PageHero
        className="players-hero-panel"
        kicker="Кампания · Управление доступом"
        title="Игроки и приглашения"
        description="Приглашайте игроков в активную кампанию и проверяйте, у кого уже есть доступ. Роль GM через эту форму не выдаётся."
      >
        <div className="workspace-identity-strip">
          <span><Layers3 size={15} aria-hidden="true" /> {session?.activeWorkspace?.name || "Workspace"}</span>
          <span><UsersRound size={15} aria-hidden="true" /> {session?.activeCampaign?.name || "Активная кампания"}</span>
          <span><ShieldCheck size={15} aria-hidden="true" /> Ваша роль: {roleLabel(activeRole(session))}</span>
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
                <p>Введите email — мы создадим письмо и ссылку, которую при необходимости можно отправить вручную.</p>
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
                <small id="player-invite-help">Приглашение действует 7 дней и создаёт только роль игрока.</small>
              </label>
              <CodexButton className="players-invite-submit" type="submit" disabled={submit.loading}>
                {submit.loading ? <LoaderCircle className="players-spinner" size={17} aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}
                {submit.loading ? "Создаю..." : "Создать приглашение"}
              </CodexButton>
            </form>

            <StatusMessage tone="danger" className="players-status-message" role="alert">
              {submit.error ? <><AlertTriangle size={17} aria-hidden="true" /> {submit.error}</> : null}
            </StatusMessage>
            <StatusMessage tone="success" className="players-status-message">
              {submit.success ? <><CheckCircle2 size={17} aria-hidden="true" /> {submit.success}</> : null}
            </StatusMessage>

            {submit.link ? (
              <div className="invite-copy-card">
                <Link2 size={19} aria-hidden="true" />
                <div>
                  <strong>Ссылка готова</strong>
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

          {members.error ? <StatusCard kicker="Ошибка участников">{members.error}</StatusCard> : null}
          {invites.error ? <StatusCard kicker="Ошибка приглашений">{invites.error}</StatusCard> : null}

          <section className="players-management-grid" aria-label="Участники и приглашения кампании">
            <CodexCard className="players-card-premium players-table-card">
              <div className="players-card-head">
                <div>
                  <span className="kicker">Участники</span>
                  <h2>{memberCount} {plural(memberCount, "участник", "участника", "участников")}</h2>
                  <p>Активные роли в выбранной кампании.</p>
                </div>
                <span className="players-card-icon" aria-hidden="true"><UsersRound size={21} /></span>
              </div>

              {members.loading ? <LoadingState>Загружаю участников кампании...</LoadingState> : null}
              {memberCount ? (
                <div className="players-row-list">
                  {members.items.map((member) => (
                    <div className="players-row" key={member.id || `${member.userId}-${member.role}`}>
                      <div className="players-person">
                        <span className="players-avatar" aria-hidden="true">{memberInitial(member)}</span>
                        <div className="players-row-copy">
                          <strong>{memberName(member)}</strong>
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
                      </div>
                    </div>
                  ))}
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
                  <p>Ссылки, которые ещё можно принять.</p>
                </div>
                <span className="players-card-icon" aria-hidden="true"><MailPlus size={21} /></span>
              </div>

              {invites.loading ? <LoadingState>Загружаю приглашения...</LoadingState> : null}
              {inviteCount ? (
                <div className="players-row-list">
                  {invites.items.map((invite) => (
                    <div className="players-row invite-row" key={invite.id || `${invite.email}-${invite.createdAt || ""}`}>
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
                          <Badge tone={statusTone(invite.status || "pending")}>
                            {statusLabel(invite.status || "pending")}
                          </Badge>
                        </div>
                        <small className="players-row-date">
                          <Clock3 size={14} aria-hidden="true" />
                          Создано {dateLabel(invite.createdAt)}
                        </small>
                        {invite.inviteUrl ? (
                          <CodexButton
                            className="players-copy-button"
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => copy(invite.inviteUrl)}
                          >
                            <Copy size={15} aria-hidden="true" />
                            {copied === invite.inviteUrl ? "Скопировано" : "Копировать ссылку"}
                          </CodexButton>
                        ) : null}
                      </div>
                    </div>
                  ))}
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
