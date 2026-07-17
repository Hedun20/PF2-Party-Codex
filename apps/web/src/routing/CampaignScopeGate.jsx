import { useEffect, useRef } from "react";
import RouteLoading from "../components/RouteLoading.jsx";

function campaignIdFromCampaignList(item) {
  return item?.campaign?.id || item?.campaignId || item?.membership?.campaignId || "";
}

export default function CampaignScopeGate({ requestedCampaignId, activeCampaignId, campaigns = [], onActivate, children, denied }) {
  const activationRef = useRef("");
  const hasRequestedCampaign = campaigns.some((item) => campaignIdFromCampaignList(item) === requestedCampaignId)
    || requestedCampaignId === activeCampaignId;

  useEffect(() => {
    if (!requestedCampaignId || requestedCampaignId === activeCampaignId || !hasRequestedCampaign) return;
    if (activationRef.current === requestedCampaignId) return;
    activationRef.current = requestedCampaignId;
    Promise.resolve(onActivate?.(requestedCampaignId, { preserveLocation: true })).catch(() => {
      activationRef.current = "";
    });
  }, [requestedCampaignId, activeCampaignId, hasRequestedCampaign, onActivate]);

  if (!requestedCampaignId || !hasRequestedCampaign) return denied;
  if (requestedCampaignId !== activeCampaignId) return <RouteLoading />;
  return children;
}
