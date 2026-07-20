import { StatePanel } from "./Silverleaf.jsx";
import CodexButton from "./CodexButton.jsx";

export default function EmptyState({
  icon: Icon,
  kicker,
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
    <StatePanel
      icon={Icon}
      title={title || eyebrow || kicker || "Пока пусто"}
      description={description}
      action={resolvedAction}
      tone={tone}
      className={`empty-state-card workspace-status-card ${className}`.trim()}
    />
  );
}
