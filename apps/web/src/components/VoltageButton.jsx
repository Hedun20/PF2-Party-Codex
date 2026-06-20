import CodexButton from "./ui/CodexButton.jsx";

// Compatibility wrapper: old VoltageButton usages now render the unified Codex button.
// Keep this file so older imports do not break while the UI is migrated.
export default function VoltageButton({ variant = "primary", size = "md", className = "", innerClassName = "", ...props }) {
  return <CodexButton variant={variant === "danger" ? "danger" : variant === "gm" ? "primary" : variant} size={size} className={[className, innerClassName].filter(Boolean).join(" ")} {...props} />;
}
