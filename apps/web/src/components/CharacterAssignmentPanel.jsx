import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck, UserCog, X } from "lucide-react";
import { api } from "../api/client.js";
import { assignCharacterMembership } from "../api/characterAssignments.js";
import { CodexButton, CodexCard, StatusMessage } from "./ui/index.js";

function membershipId(character) {
  return character?.assignedMembershipId || character?.assignment?.membershipId || "";
}

function memberLabel(member = {}) {
  const name = member.displayName || member.email || member.userId || "Участник кампании";
  const role = member.role === "owner" ? "владелец" : member.role === "gm" ? "GM" : "игрок";
  return `${name} · ${role}`;
}

export default function CharacterAssignmentPanel({ character, campaignId, onAssigned }) {
  const [members, setMembers] = useState({ loading: true, error: "", items: [] });
  const [selectedMembershipId, setSelectedMembershipId] = useState(() => membershipId(character));
  const [action, setAction] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    setSelectedMembershipId(membershipId(character));
    setAction({ loading: false, error: "", success: "" });
  }, [character?.id, character?.assignedMembershipId, character?.assignment?.membershipId]);

  useEffect(() => {
    let active = true;
    if (!campaignId) {
      setMembers({ loading: false, error: "Активная кампания не выбрана.", items: [] });
      return () => { active = false; };
    }
    setMembers({ loading: true, error: "", items: [] });
    api.campaignMemberships(campaignId).then((data) => {
      if (!active) return;
      const items = Array.isArray(data.memberships) ? data.memberships.filter((item) => item.status === "active") : [];
      setMembers({ loading: false, error: "", items });
    }).catch((error) => {
      if (!active) return;
      setMembers({ loading: false, error: error.message || "Не удалось загрузить участников кампании.", items: [] });
    });
    return () => { active = false; };
  }, [campaignId]);

  const currentMembershipId = membershipId(character);
  const changed = selectedMembershipId !== currentMembershipId;
  const selectedMember = useMemo(() => members.items.find((item) => item.id === selectedMembershipId) || null, [members.items, selectedMembershipId]);

  async function saveAssignment(event) {
    event?.preventDefault();
    if (!character?.id || !changed || action.loading) return;
    setAction({ loading: true, error: "", success: "" });
    try {
      const data = await assignCharacterMembership(character.id, selectedMembershipId);
      const label = selectedMember ? selectedMember.displayName || selectedMember.email || "участнику" : "никому";
      setAction({ loading: false, error: "", success: selectedMembershipId ? `Персонаж назначен: ${label}.` : "Персонаж больше не назначен участнику." });
      await onAssigned?.(data.character);
    } catch (error) {
      setAction({ loading: false, error: error.message || "Не удалось изменить назначение персонажа.", success: "" });
    }
  }

  return (
    <CodexCard as="section" className="players-card-premium" aria-label="Назначение персонажа участнику">
      <div className="players-card-head">
        <div>
          <span className="kicker">Доступ персонажа</span>
          <h2>{character?.assignment?.displayName || "Не назначен"}</h2>
          <p>{character?.assignment?.email || "Выберите активного участника кампании. Игрок увидит только назначенных ему персонажей."}</p>
        </div>
        <span className="players-card-icon" aria-hidden="true"><ShieldCheck size={21} /></span>
      </div>

      <form className="players-invite-form" onSubmit={saveAssignment}>
        <label className="players-role-control">
          <span><UserCog size={14} aria-hidden="true" /> Участник</span>
          <select className="players-role-select" value={selectedMembershipId} disabled={members.loading || action.loading} onChange={(event) => setSelectedMembershipId(event.target.value)}>
            <option value="">Не назначать</option>
            {members.items.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}
          </select>
        </label>
        <CodexButton type="submit" size="sm" disabled={!changed || members.loading || action.loading}>
          {action.loading ? <LoaderCircle className="players-spinner" size={15} aria-hidden="true" /> : selectedMembershipId ? <CheckCircle2 size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
          {action.loading ? "Сохраняю..." : "Применить"}
        </CodexButton>
      </form>

      {members.loading ? <StatusMessage className="players-status-message">Загружаю участников...</StatusMessage> : null}
      {members.error ? <StatusMessage tone="danger" className="players-status-message" role="alert">{members.error}</StatusMessage> : null}
      {action.error ? <StatusMessage tone="danger" className="players-status-message" role="alert">{action.error}</StatusMessage> : null}
      {action.success ? <StatusMessage tone="success" className="players-status-message">{action.success}</StatusMessage> : null}
    </CodexCard>
  );
}
