export default function SimplePlaceholderPage({ title, kicker, children }) {
  return (
    <div className="page-stack placeholder-page">
      <section className="hero-panel">
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{children}</p>
      </section>
    </div>
  );
}