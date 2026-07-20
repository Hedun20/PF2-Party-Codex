import { PageHeader } from "./Silverleaf.jsx";

export default function PageHero({ kicker, eyebrow, title, description, children, className = "", actions = null, meta = null }) {
  return (
    <PageHeader
      eyebrow={eyebrow || kicker}
      title={title}
      description={description}
      actions={actions}
      meta={meta}
      className={className}
    >
      {children}
    </PageHeader>
  );
}
