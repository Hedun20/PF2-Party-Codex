import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Crown, Database, DoorOpen, Mail, RefreshCw, Settings, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

function activeRole(session) {
  const role = session?.activeMembership?.role || "user";
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return "Без кампании";
}

function roleName(role = "player") {
  if (role === "gm") return "GM";
  if (role === "owner") return "Владелец";
  return "Игрок";
}

function limitLabel(value) {
  return value === null || value === undefined ? "без лимита" : String(value);
}

function bytesLabel(value) {
  if (value === null || value === undefined) return "не измерено";
  if (value < 1_000_000) return `${Math.round(value / 1_000)} KB`;
  if (value < 1_000_000_000) return `${(value / 1_000_000).toFixed(1)} MB`;
  return `${(value / 1_000_000_000).toFixed(1)} GB`;
}

function byteLimitLabel(value) {
  return value === null || value === undefined ? "без лимита" : bytesLabel(value);
}

export default function SettingsPage({ session }) {
  const [subscription, setSubscription] = useState(null);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [leaveConfirming, setLeaveConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [leaveCommitted, setLeaveCommitted] = useState(false);
  const [memberships, setMemberships] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [targetMembershipId, setTargetMembershipId] = useState("");
  const [transferConfirming, setTransferConfirming] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferCommitted, setTransferCommitted] = useState(false);

  const campaignId = session?.activeCampaign?.id || "";
  const campaignName = session?.activeCampaign?.name || "текущей кампании";
  const currentMembershipId = session?.activeMembership?.id || "";
  const role = String(session?.activeMembership?.role || "").toLowerCase();
  const canLeave = Boolean(campaignId && currentMembershipId && role && role !== "owner");
  const eligibleTransferTargets = useMemo(
    () => memberships.filter((membership) => membership.status === "active" && membership.userId && membership.id !== currentMembershipId && membership.role !== "owner"),
    [memberships, currentMembershipId]
  );
  const selectedTransferTarget = eligibleTransferTargets.find((membership) => membership.id === targetMembershipId) || null;

  useEffect(() => {
    let active = true;
    setSubscription(null);
    setSubscriptionError("");
    api.subscription()
      .then((data) => {
        if (active) setSubscription(data.subscription || null);
      })
      .catch((error) => {
        if (active) setSubscriptionError(error.message || "Не удалось загрузить границы workspace.");
      });
    return () => { active = false; };
  }, [session?.activeWorkspace?.id]);

  async function loadMemberships() {
    if (!campaignId || role !== "owner") return;
    setMembersLoading(true);
    setMembersError("");
    try {
      const data = await api.campaignMemberships(campaignId);
      const nextMemberships = Array.isArray(data.memberships) ? data.memberships : [];
      setMemberships(nextMemberships);
      setTargetMembershipId((current) => nextMemberships.some((item) => item.id === current && item.status === "active") ? current : "");
    } catch (error) {
      setMembersError(error.message || "Не удалось загрузить участников кампании.");
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    setLeaveConfirming(false);
    setLeaving(false);
    setLeaveError("");
    setLeaveCommitted(false);
    setMemberships([]);
    setMembersError("");
    setTargetMembershipId("");
    setTransferConfirming(false);
    setTransferring(false);
    setTransferError("");
    setTransferCommitted(false);
    if (campaignId && role === "owner") loadMemberships();
  }, [campaignId, role]);

  async function transferOwnership() {
    if (!campaignId || role !== "owner" || !targetMembershipId || transferring || transferCommitted) return;
    setTransferring(true);
    setTransferError("");
    try {
      await api.transferCampaignOwnership(campaignId, targetMembershipId);
      setTransferCommitted(true);
      setTransferConfirming(false);
      // Rebuild authorization-sensitive session state. The former owner becomes GM.
      window.location.assign("/settings");
    } catch (error) {
      setTransferError(error.message || "Не удалось передать владение. Обновите список участников и повторите попытку.");
      if ([403, 409].includes(Number(error?.status || 0))) await loadMemberships();
    } finally {
      setTransferring(false);
    }
  }

  async function leaveCampaign() {
    if (!canLeave || leaving || leaveCommitted) return;
    setLeaving(true);
    setLeaveError("");
    try {
      const result = await api.leaveCampaign(campaignId);
      setLeaveCommitted(true);
      setLeaveConfirming(false);
      // A hard navigation deliberately rebuilds every campaign-scoped client state after
      // authorization has been revoked. It also recovers cleanly from stale in-memory data.
      window.location.assign(result.activeCampaign?.id ? "/" : "/campaigns");
    } catch (error) {
      setLeaveError(error.message || "Не удалось выйти из кампании. Обновите страницу и повторите попытку.");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="page-stack settings-page">
      <section className="hero-panel">
        <span className="kicker">Настройки</span>
        <h1>Настройки workspace и кампании</h1>
        <p>Сводка активной кампании, роли, хранения данных, плана workspace и системных уведомлений.</p>
      </section>

      <section className="workspace-grid settings-grid">
        <article className="codex-card workspace-card">
          <Settings size={22} />
          <div>
            <strong>Кампания</strong>
            <span>{session?.activeCampaign?.name || "Кампания не выбрана"}</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <UsersRound size={22} />
          <div>
            <strong>Роль</strong>
            <span>{activeRole(session)}</span>
          </div>
        </article>
        <article className="codex-card workspace-card" id="mongo">
          <Database size={22} />
          <div>
            <strong>Хранилище кампании</strong>
            <span>Единый защищённый источник статей, ролей и игровых данных.</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <Mail size={22} />
          <div>
            <strong>Email</strong>
            <span>Подтверждение аккаунта и приглашения проходят через отслеживаемую очередь доставки.</span>
          </div>
        </article>
        <article className="codex-card workspace-card">
          <CreditCard size={22} />
          <div>
            <strong>План workspace</strong>
            <span>{subscription ? `${subscription.plan} · ${subscription.status}` : subscriptionError || "Загрузка…"}</span>
          </div>
        </article>
      </section>

      {subscription ? (
        <section className="codex-card workspace-status-card">
          <ShieldCheck size={20} />
          <p>
            Кампании: {subscription.usage.campaigns} / {limitLabel(subscription.entitlements.maxCampaigns)} · Участники: {subscription.usage.memberSeats} / {limitLabel(subscription.entitlements.maxMemberSeats)} · Assets: {bytesLabel(subscription.usage.assetBytes)} / {byteLimitLabel(subscription.entitlements.maxAssetBytes)} · Ожидают приглашения: {subscription.usage.pendingInvitations}. Оплата не имитируется; режим управления планом: {subscription.billing.mode}.
          </p>
        </section>
      ) : null}

      {campaignId ? (
        <section className="codex-card workspace-status-card campaign-access-card" aria-labelledby="campaign-access-heading">
          <DoorOpen size={20} />
          <span className="kicker">Доступ к кампании</span>
          <h2 id="campaign-access-heading">Выйти из кампании</h2>
          {role === "owner" ? (
            <div className="campaign-ownership-transfer">
              <div className="status-message warning-message" role="status">
                <TriangleAlert size={18} aria-hidden="true" />
                <div>
                  <strong>Владелец не может просто покинуть кампанию.</strong>
                  <p>Сначала передайте владение другому активному участнику. После успешной передачи ваша роль станет GM, и обычный выход из кампании станет доступен.</p>
                </div>
              </div>

              <div className="codex-field">
                <label htmlFor="campaign-new-owner">Новый владелец</label>
                <select
                  id="campaign-new-owner"
                  value={targetMembershipId}
                  disabled={membersLoading || transferring || transferCommitted || eligibleTransferTargets.length === 0}
                  onChange={(event) => {
                    setTargetMembershipId(event.target.value);
                    setTransferConfirming(false);
                    setTransferError("");
                  }}
                >
                  <option value="">Выберите активного участника</option>
                  {eligibleTransferTargets.map((membership) => (
                    <option key={membership.id} value={membership.id}>
                      {membership.displayName || "Участник кампании"} · {roleName(membership.role)}
                    </option>
                  ))}
                </select>
              </div>

              {membersLoading ? <p className="save-message" role="status">Загружаем участников…</p> : null}
              {membersError ? (
                <div className="status-message danger-message" role="alert">
                  <TriangleAlert size={18} aria-hidden="true" />
                  <div>
                    <strong>Список участников недоступен</strong>
                    <p>{membersError}</p>
                    <CodexButton type="button" size="sm" variant="secondary" onClick={loadMemberships} disabled={membersLoading || transferring}>
                      <RefreshCw size={15} /> Повторить
                    </CodexButton>
                  </div>
                </div>
              ) : null}

              {!membersLoading && !membersError && eligibleTransferTargets.length === 0 ? (
                <div className="status-message" role="status">
                  <UsersRound size={18} aria-hidden="true" />
                  <div>
                    <strong>Некому передать владение</strong>
                    <p>Сначала пригласите другого пользователя и дождитесь, пока его membership станет активным.</p>
                    <CodexButton as={Link} to="/players" size="sm" variant="secondary">Открыть участников</CodexButton>
                  </div>
                </div>
              ) : null}

              {eligibleTransferTargets.length > 0 && !transferConfirming ? (
                <CodexButton
                  type="button"
                  variant="secondary"
                  disabled={!selectedTransferTarget || transferring || transferCommitted}
                  onClick={() => { setTransferConfirming(true); setTransferError(""); }}
                >
                  <Crown size={16} /> Передать владение
                </CodexButton>
              ) : null}

              {transferConfirming && selectedTransferTarget ? (
                <div className="campaign-leave-confirm" role="group" aria-label="Подтверждение передачи владения кампанией">
                  <div className="status-message warning-message" role="status">
                    <Crown size={18} aria-hidden="true" />
                    <div>
                      <strong>Передать кампанию пользователю {selectedTransferTarget.displayName || "выбранному участнику"}?</strong>
                      <p>Новый владелец получит owner-права этой кампании. Ваша роль станет GM. Это изменение записывается в аудит и не выполняется по одному случайному клику.</p>
                    </div>
                  </div>
                  <div className="campaign-leave-actions">
                    <CodexButton type="button" variant="danger" onClick={transferOwnership} disabled={transferring || transferCommitted}>
                      {transferring ? "Передаём…" : "Да, передать владение"}
                    </CodexButton>
                    <CodexButton type="button" variant="secondary" onClick={() => { setTransferConfirming(false); setTransferError(""); }} disabled={transferring || transferCommitted}>
                      Отмена
                    </CodexButton>
                  </div>
                </div>
              ) : null}

              {transferError ? (
                <div className="status-message danger-message" role="alert" aria-live="assertive">
                  <TriangleAlert size={18} aria-hidden="true" />
                  <div>
                    <strong>Передача не завершена</strong>
                    <p>{transferError}</p>
                    <p>Не повторяйте действие вслепую: список участников обновлён. Проверьте выбранного пользователя и повторите подтверждение.</p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <p>
                Выход отзывает ваш доступ к «{campaignName}». Аккаунт и другие кампании сохранятся. Если доступна другая кампания, Party Codex переключится на неё; иначе откроется выбор кампаний.
              </p>

              {!leaveConfirming ? (
                <CodexButton variant="danger" onClick={() => { setLeaveConfirming(true); setLeaveError(""); }} disabled={!canLeave || leaveCommitted}>
                  <DoorOpen size={16} /> Выйти из кампании
                </CodexButton>
              ) : (
                <div className="campaign-leave-confirm" role="group" aria-label="Подтверждение выхода из кампании">
                  <div className="status-message warning-message" role="status">
                    <TriangleAlert size={18} aria-hidden="true" />
                    <div>
                      <strong>Подтвердите выход</strong>
                      <p>После подтверждения доступ к этой кампании будет отозван сразу. Для возврата потребуется новое приглашение или восстановление доступа владельцем.</p>
                    </div>
                  </div>
                  <div className="campaign-leave-actions">
                    <CodexButton variant="danger" onClick={leaveCampaign} disabled={leaving || leaveCommitted}>
                      {leaving ? "Выходим…" : "Да, выйти"}
                    </CodexButton>
                    <CodexButton variant="secondary" onClick={() => { setLeaveConfirming(false); setLeaveError(""); }} disabled={leaving || leaveCommitted}>
                      Отмена
                    </CodexButton>
                  </div>
                </div>
              )}

              {leaveError ? (
                <div className="status-message danger-message" role="alert" aria-live="assertive">
                  <TriangleAlert size={18} aria-hidden="true" />
                  <div>
                    <strong>Выход не завершён</strong>
                    <p>{leaveError}</p>
                    <p>Ваш доступ считается сохранённым, пока сервер не подтвердит выход. Обновите страницу и повторите действие.</p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}