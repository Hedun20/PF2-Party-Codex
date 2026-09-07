import { useEffect, useState } from "react";
import { CreditCard, Database, DoorOpen, Mail, Settings, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import { api } from "../api/client.js";
import CodexButton from "../components/ui/CodexButton.jsx";

function activeRole(session) {
  const role = session?.activeMembership?.role || "user";
  if (role === "owner") return "Владелец";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return "Без кампании";
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

  const campaignId = session?.activeCampaign?.id || "";
  const campaignName = session?.activeCampaign?.name || "текущей кампании";
  const role = String(session?.activeMembership?.role || "").toLowerCase();
  const canLeave = Boolean(campaignId && session?.activeMembership?.id && role && role !== "owner");

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

  useEffect(() => {
    setLeaveConfirming(false);
    setLeaving(false);
    setLeaveError("");
    setLeaveCommitted(false);
  }, [campaignId]);

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
            <div className="status-message warning-message" role="status">
              <TriangleAlert size={18} aria-hidden="true" />
              <div>
                <strong>Владелец не может просто покинуть кампанию.</strong>
                <p>Сначала необходимо передать владение другому активному участнику. Это защищает кампанию от состояния без владельца.</p>
              </div>
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