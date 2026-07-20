import { Notice } from "./Silverleaf.jsx";

export default function StatusMessage({ children, tone = "info", className = "", role = "status", title }) {
  if (!children && !title) return null;
  return <Notice tone={tone} title={title} className={`status-message ${className}`.trim()} role={role}>{children}</Notice>;
}
