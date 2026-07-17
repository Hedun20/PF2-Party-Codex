import { Navigate, useLocation, useParams } from "react-router-dom";
import { legacyTargetPath } from "./appRoutes.js";

export default function LegacyRouteRedirect({ spec, campaignId = "", canManage = false }) {
  const params = useParams();
  const location = useLocation();
  const target = legacyTargetPath(spec, {
    params,
    campaignId,
    canManage,
    search: location.search
  });
  return <Navigate to={target} replace />;
}
