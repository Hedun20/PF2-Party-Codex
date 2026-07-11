import { useEffect, useState } from "react";
import { CreditCard, Database, Mail, Settings, ShieldCheck, UsersRound } from "lucide-react";
import { api } from "../api/client.js";

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
    </div>
  );
}
