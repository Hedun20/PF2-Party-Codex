import { LoaderCircle } from "lucide-react";

export default function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <LoaderCircle size={28} aria-hidden="true" />
      <strong>Loading campaign workspace…</strong>
      <span>Preparing the selected view.</span>
    </div>
  );
}
