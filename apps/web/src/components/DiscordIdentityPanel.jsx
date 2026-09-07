import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Copy, Link2, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import { api } from "../api/client.js";
import { CodexButton, CodexCard, StatusMessage } from "./ui/index.js";

function campaignIdFromSession(session) {
  return session?.activeCampaign?.id || session?.activeMembership?.campaignId || "";
}

function maskDiscordUserId(value = "") {
  const text = String(value || "");
  if (!text) return "Discord account";
  return text.length <= 6 ? text : `••••${text.slice(-6)}`;
}

function expiryLabel(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { timeStyle: "short" }).format(date);
}

export default function DiscordIdentityPanel({ session }) {
  const campaignId = useMemo(() => campaignIdFromSession(session), [session]);
  const [state, setState] = useState({
    loading: false,
    working: false,
    error: "",
    link: null,
    challenge: null,
    pairingAvailable: false,
    help: ""
  });
  const [pairingCode, setPairingCode] = useState("");
  const [instruction, setInstruction] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  async function refresh({ quiet = false } = {}) {
    if (!campaignId) return;
    if (!quiet) setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api.discordIdentity(campaignId);
      setState((current) => ({
        ...current,
        loading: false,
        error: "",
        link: data.link || null,
        challenge: data.challenge || null,
        pairingAvailable: Boolean(data.pairingAvailable),
        help: data.help || ""
      }));
      if (data.link) {
        setPairingCode("");
        setInstruction("");
        setCopied(false);
        setConfirmUnlink(false);
      }
    } catch (error) {
      if (!quiet) {
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || "Не удалось проверить Discord-привязку."
        }));
      }
    }
  }

  useEffect(() => {
    setPairingCode("");
    setInstruction("");
    setCopied(false);
    setConfirmUnlink(false);
    if (!campaignId) return undefined;
    refresh();
    return undefined;
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || state.link || state.challenge?.status !== "pending") return undefined;
    const expiresAt = Date.parse(state.challenge.expiresAt || "");
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return undefined;
    const timer = window.setInterval(() => refresh({ quiet: true }), 4000);
    return () => window.clearInterval(timer);
  }, [campaignId, state.link?.id, state.challenge?.id, state.challenge?.status, state.challenge?.expiresAt]);

  async function createChallenge() {
    if (!campaignId || state.working || !state.pairingAvailable) return;
    setState((current) => ({ ...current, working: true, error: "" }));
    setCopied(false);
    setConfirmUnlink(false);
    try {
      const data = await api.createDiscordIdentityChallenge(campaignId);
      setPairingCode(data.challenge?.pairingCode || "");
      setInstruction(data.instruction || "");
      setState((current) => ({
        ...current,
        working: false,
        error: "",
        challenge: data.challenge || null,
        pairingAvailable: Boolean(data.pairingAvailable)
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        working: false,
        error: error.message || "Не удалось создать одноразовый Discord-код."
      }));
    }
  }

  async function copyCode() {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setCopied(true);
    } catch {
      setState((current) => ({ ...current, error: "Не удалось скопировать код автоматически. Скопируйте его вручную." }));
    }
  }

  async function unlink() {
    if (!campaignId || state.working) return;
    setState((current) => ({ ...current, working: true, error: "" }));
    try {
      await api.unlinkDiscordIdentity(campaignId);
      setPairingCode("");
      setInstruction("");
      setCopied(false);
      setConfirmUnlink(false);
      await refresh({ quiet: true });
      setState((current) => ({ ...current, working: false }));
    } catch (error) {
      setState((current) => ({
        ...current,
        working: false,
        error: error.message || "Не удалось отключить Discord-привязку."
      }));
    }
  }

  if (!campaignId) return null;

  return (
    <CodexCard as="section" className="workspace-status-card" aria-labelledby="discord-identity-heading">
      <Link2 size={22} aria-hidden="true" />
      <span className="kicker">Связанный аккаунт</span>
      <h2 id="discord-identity-heading">Discord</h2>
      <p>
        Discord используется только как подтверждённая внешняя идентичность. Права доступа всегда определяет membership этой кампании.
      </p>

      {state.error ? <StatusMessage tone="danger" role="alert">{state.error}</StatusMessage> : null}
      {state.loading ? <StatusMessage tone="neutral">Проверяем Discord-привязку…</StatusMessage> : null}

      {state.link ? (
        <>
          <StatusMessage tone="success">
            <CheckCircle2 size={17} aria-hidden="true" />
            Discord подключён: {maskDiscordUserId(state.link.discordUserId)}. Привязка подтверждена сервером.
          </StatusMessage>
          {!confirmUnlink ? (
            <CodexButton type="button" variant="secondary" onClick={() => setConfirmUnlink(true)} disabled={state.working}>
              <Unlink size={16} aria-hidden="true" /> Отключить Discord
            </CodexButton>
          ) : (
            <div className="campaign-leave-confirm" role="group" aria-label="Подтверждение отключения Discord">
              <StatusMessage tone="warning">
                Отключение отзовёт только Discord-привязку. Доступ к кампании и ваш аккаунт Party Codex сохранятся.
              </StatusMessage>
              <div className="campaign-leave-actions">
                <CodexButton type="button" variant="danger" onClick={unlink} disabled={state.working}>
                  {state.working ? "Отключаем…" : "Да, отключить"}
                </CodexButton>
                <CodexButton type="button" variant="secondary" onClick={() => setConfirmUnlink(false)} disabled={state.working}>
                  Отмена
                </CodexButton>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {!state.pairingAvailable && !state.loading ? (
            <StatusMessage tone="warning">
              <ShieldCheck size={17} aria-hidden="true" />
              {state.help || "Discord-привязка пока не настроена на этом сервере."}
            </StatusMessage>
          ) : null}

          {state.challenge?.status === "pending" ? (
            <StatusMessage tone="neutral">
              <Clock3 size={17} aria-hidden="true" />
              Одноразовый код активен{state.challenge.expiresAt ? ` до ${expiryLabel(state.challenge.expiresAt)}` : ""}. После подтверждения в Discord эта карточка обновится автоматически.
            </StatusMessage>
          ) : null}

          {pairingCode ? (
            <div className="codex-field">
              <label htmlFor="discord-pairing-code">Одноразовый код</label>
              <div className="workspace-identity-strip">
                <code id="discord-pairing-code">{pairingCode}</code>
                <CodexButton type="button" size="sm" variant="secondary" onClick={copyCode} disabled={state.working}>
                  <Copy size={15} aria-hidden="true" /> {copied ? "Скопировано" : "Копировать"}
                </CodexButton>
              </div>
              {instruction ? <p>{instruction}</p> : null}
              <p>Код показывается только сейчас. Если он потерян или истёк, создайте новый.</p>
            </div>
          ) : null}

          <div className="editor-actions">
            <CodexButton type="button" onClick={createChallenge} disabled={!state.pairingAvailable || state.loading || state.working}>
              <Link2 size={16} aria-hidden="true" />
              {state.working ? "Создаём код…" : state.challenge?.status === "pending" ? "Создать новый код" : "Связать Discord"}
            </CodexButton>
            <CodexButton type="button" variant="secondary" onClick={() => refresh()} disabled={state.loading || state.working}>
              <RefreshCw size={16} aria-hidden="true" /> Обновить статус
            </CodexButton>
          </div>
        </>
      )}
    </CodexCard>
  );
}
