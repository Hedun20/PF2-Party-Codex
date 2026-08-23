import { evaluatePlayerArchiveRead } from "@pf2-party-codex/core";

export default function HomePage() {
  const boundaryProbe = evaluatePlayerArchiveRead({ status: "active", visibility: "public" });

  return (
    <main className="shell">
      <p className="eyebrow">HED-16 · target runtime scaffold</p>
      <h1>PF2 Party Codex</h1>
      <p>
        The Next.js App Router boundary is buildable and consumes the same framework-free policy
        core as workers and connector adapters.
      </p>
      <dl>
        <div>
          <dt>Runtime</dt>
          <dd>Next.js server</dd>
        </div>
        <div>
          <dt>Policy probe</dt>
          <dd>{boundaryProbe.allowed ? "available" : "closed"}</dd>
        </div>
        <div>
          <dt>Traffic</dt>
          <dd>not cut over</dd>
        </div>
      </dl>
    </main>
  );
}
