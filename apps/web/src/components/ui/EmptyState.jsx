import { StatePanel } from "./Silverleaf.jsx";
import CodexButton from "./CodexButton.jsx";

export default function EmptyState({
  icon: Icon,
  kicker = "Empty",
  eyebrow,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  action,
  tone = "neutral",
  className = ""
}) {
  const resolvedAction = action || (actionLabel && (actionTo || onAction)
    ? <CodexButton to={actionTo} onClick={onAction} variant="secondary" size="sm">{actionLabel}</CodexButton>
    : null);

  return (
    <div className="empty-state-card workspace-status-card">
      {eyebrow || kicker ? <p className="sl-eyebrow empty-state-card__eyebrow">{eyebrow || kicker}</p> : null}
      <StatePanel
        icon={Icon}
        title={title}
        description={description}
        action={resolvedAction}
        tone={tone}
        className={className}
      />
    </div>
  );
}
