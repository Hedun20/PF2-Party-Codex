import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

function toPage(path) {
  return `/page/${encodeURIComponent(path)}`;
}

export default function PageMap({ page }) {
  if (!page?.mapImage) return null;
  const imagePath = page.mapImage.startsWith("/api/assets/")
    ? page.mapImage
    : `/api/assets/${page.mapImage.replace(/^images\//, "")}`;

  return (
    <section className="page-map-panel">
      <div className="panel-heading">
        <span className="kicker">Интерактивная PNG-карта</span>
        <h2>Пины мастера</h2>
      </div>
      <div className="page-map-stage">
        <img src={imagePath} alt={`Карта: ${page.title}`} />
        {page.pins.map((pin) => (
          <Link
            key={`${pin.label}-${pin.path}`}
            className="page-map-pin"
            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            to={toPage(pin.path)}
            title={pin.label}
          >
            <MapPin size={15} />
            <span>{pin.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
