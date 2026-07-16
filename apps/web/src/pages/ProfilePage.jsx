import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Languages, Mail, Palette, Save, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { api } from "../api/client.js";
import { CodexButton, CodexCard, PageHero, PageShell, StatusMessage } from "../components/ui/index.js";

function roleLabel(role = "user") {
  if (role === "owner") return "Владелец кампании";
  if (role === "gm") return "GM";
  if (role === "player") return "Игрок";
  return "Без кампании";
}

function displayName(user = {}, profile = {}) {
  return profile.displayName || user.displayName || user.name || user.email || "Пользователь";
}

export default function ProfilePage({ session, campaigns = [], onProfileChanged }) {
  const user = session?.user || {};
  const membership = session?.activeMembership || {};
  const campaign = session?.activeCampaign || {};
  const workspace = session?.activeWorkspace || {};
  const hasCampaign = Boolean(membership?.id);
  const [state, setState] = useState({ loading: true, saving: false, error: "", success: "", profile: null });
  const [form, setForm] = useState({ displayName: "", language: "ru", theme: "system" });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "", success: "" }));
    api.profile()
      .then((data) => {
        if (!active) return;
        const profile = data.profile || {};
        setForm({
          displayName: profile.displayName || user.name || "",
          language: profile.language || "ru",
          theme: profile.theme || "system"
        });
        setState({ loading: false, saving: false, error: "", success: "", profile });
      })
      .catch((error) => {
        if (active) setState({ loading: false, saving: false, error: error.message || "Не удалось загрузить профиль.", success: "", profile: null });
      });
    return () => { active = false; };
  }, [user.id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: "", success: "" }));
    try {
      const data = await api.updateProfile(form);
      const profile = data.profile || {};
      setForm({ displayName: profile.displayName || "", language: profile.language || "ru", theme: profile.theme || "system" });
      setState({ loading: false, saving: false, error: "", success: "Профиль сохранён.", profile });
      await onProfileChanged?.();
    } catch (error) {
      setState((current) => ({ ...current, saving: false, error: error.message || "Не удалось сохранить профиль.", success: "" }));
    }
  }

  return (
    <PageShell className="profile-page profile-page-editable">
      <PageHero
        kicker="Профиль аккаунта"
        title={displayName(user, state.profile || {})}
        description="Личные данные и интерфейсные предпочтения принадлежат аккаунту, а роль определяется отдельно в каждой кампании."
      >
        <div className="workspace-identity-strip">
          {user.email ? <span><Mail size={15} /> {user.email}</span> : null}
          <span><ShieldCheck size={15} /> {roleLabel(membership.role || "user")}</span>
          {campaign.name ? <span><Crown size={15} /> {campaign.name}</span> : null}
        </div>
      </PageHero>

      {state.error ? <StatusMessage tone="danger" role="alert">{state.error}</StatusMessage> : null}
      {state.success ? <StatusMessage tone="success">{state.success}</StatusMessage> : null}

      <section className="profile-workspace-grid">
        <CodexCard as="form" className="profile-editor-card" onSubmit={saveProfile}>
          <div className="profile-card-head">
            <div>
              <span className="kicker">Личные настройки</span>
              <h2>Как вас видит Party Codex</h2>
              <p>Имя синхронизируется с участниками кампаний. Язык и тема сохраняются на уровне аккаунта.</p>
            </div>
            <UserRound size={24} aria-hidden="true" />
          </div>

          <label className="profile-field">
            <span><UserRound size={16} aria-hidden="true" /> Отображаемое имя</span>
            <input
              value={form.displayName}
              onChange={(event) => update("displayName", event.target.value)}
              maxLength={120}
              autoComplete="name"
              disabled={state.loading || state.saving}
              required
            />
          </label>

          <div className="profile-field-grid">
            <label className="profile-field">
              <span><Languages size={16} aria-hidden="true" /> Язык интерфейса</span>
              <select value={form.language} onChange={(event) => update("language", event.target.value)} disabled={state.loading || state.saving}>
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="uk">Українська</option>
              </select>
            </label>
            <label className="profile-field">
              <span><Palette size={16} aria-hidden="true" /> Тема</span>
              <select value={form.theme} onChange={(event) => update("theme", event.target.value)} disabled={state.loading || state.saving}>
                <option value="system">Как в системе</option>
                <option value="dark">Тёмная</option>
                <option value="light">Светлая</option>
              </select>
            </label>
          </div>

          <div className="profile-editor-actions">
            <CodexButton type="submit" disabled={state.loading || state.saving || !form.displayName.trim()}>
              <Save size={16} aria-hidden="true" />
              {state.saving ? "Сохраняю..." : "Сохранить профиль"}
            </CodexButton>
          </div>
        </CodexCard>

        <div className="profile-context-stack">
          <CodexCard className="workspace-card profile-context-card">
            <UsersRound size={22} aria-hidden="true" />
            <div><strong>Workspace</strong><span>{workspace.name || "Workspace не выбран"}</span></div>
          </CodexCard>
          <CodexCard className="workspace-card profile-context-card">
            <Crown size={22} aria-hidden="true" />
            <div><strong>Кампания</strong><span>{campaign.name || "Кампания не выбрана"}</span></div>
          </CodexCard>
          <CodexCard className="workspace-card profile-context-card">
            <ShieldCheck size={22} aria-hidden="true" />
            <div><strong>Текущая роль</strong><span>{roleLabel(membership.role || "user")}</span></div>
          </CodexCard>
        </div>
      </section>

      <CodexCard as="section" className="workspace-status-card profile-quick-actions">
        <span className="kicker">Быстрые действия</span>
        <div className="workspace-stats-row">
          <Link className="codex-button codex-button--primary codex-button--sm" to="/campaigns">{hasCampaign ? `Кампании (${campaigns.length || 1})` : "Создать или выбрать кампанию"}</Link>
          {hasCampaign ? <Link className="codex-button codex-button--secondary codex-button--sm" to="/my">Открыть workspace</Link> : null}
          {hasCampaign ? <Link className="codex-button codex-button--ghost codex-button--sm" to="/settings">Настройки кампании</Link> : null}
          {hasCampaign ? <Link className="codex-button codex-button--ghost codex-button--sm" to="/archive">Архив кампании</Link> : null}
        </div>
      </CodexCard>
    </PageShell>
  );
}
