import CodexCard from "./CodexCard.jsx";
import CodexButton from "./CodexButton.jsx";

export default function EmptyState({ icon: Icon, kicker = "Empty", title, description, actionLabel, actionTo, onAction }) {
  return (
    <CodexCard className="empty-state-card workspace-status-card">
      {Icon ? <Icon size={24} /> : null}
      <div>
        <span className="kicker">{kicker}</span>
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </div>
      {actionLabel && (actionTo || onAction) ? (
        <CodexButton to={actionTo} onClick={onAction} variant="ghost" size="sm">{actionLabel}</CodexButton>
      ) : null}
    </CodexCard>
  );
}
