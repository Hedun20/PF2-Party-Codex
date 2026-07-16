import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { api } from "../api/client.js";
import { assignCharacterMembership } from "../api/characterAssignments.js";
import CodexButton from "./ui/CodexButton.jsx";

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

  async function saveAssignment() {
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
    <section className="character-assignment-panel" aria-label="Назначение персонажа участнику">
      <div className="character-assignment-panel__copy">
        <span className="kicker"><ShieldCheck size={14} /> Доступ персонажа</span>
        <strong>{character?.assignment?.displayName || "Не назначен"}</strong>
        <small>{character?.assignment?.email || "Выберите активного участника кампании. Игрок увидит только назначенных ему персонажей."}</small>
      </div>
      <div className="character-assignment-panel__controls">
        <label>
          <span>Участник</span>
          <select value={selectedMembershipId} disabled={members.loading || action.loading} onChange={(event) => setSelectedMembershipId(event.target.value)}>
            <option value="">Не назначать</option>
            {members.items.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}
          </select>
        </label>
        <CodexButton type="button" size="sm" disabled={!changed || members.loading || action.loading} onClick={saveAssignment}>
          {action.loading ? <LoaderCircle className="character-assignment-spinner" size={15} /> : selectedMembershipId ? <UserRoundCheck size={15} /> : <UserRoundX size={15} />}
          {action.loading ? "Сохраняю..." : "Применить"}
        </CodexButton>
      </div>
      {members.loading ? <small className="character-assignment-state">Загружаю участников...</small> : null}
      {members.error ? <small className="character-assignment-state is-error">{members.error}</small> : null}
      {action.error ? <small className="character-assignment-state is-error">{action.error}</small> : null}
      {action.success ? <small className="character-assignment-state is-success">{action.success}</small> : null}
    </section>
  );
}
