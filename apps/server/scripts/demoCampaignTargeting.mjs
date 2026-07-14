const MANAGER_ROLES = new Set(["owner", "gm"]);

export function idString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return idString(value._id);
  return String(value);
}

export function managerCampaignIdsForUser(memberships = [], userId = "") {
  const expectedUserId = idString(userId);
  const result = [];
  const seen = new Set();

  for (const membership of memberships) {
    const campaignId = idString(membership?.campaignId);
    const membershipUserId = idString(membership?.userId);
    const role = String(membership?.role || "").toLowerCase();
    const status = String(membership?.status || "").toLowerCase();

    if (!campaignId || membershipUserId !== expectedUserId) continue;
    if (status !== "active" || !MANAGER_ROLES.has(role)) continue;
    if (seen.has(campaignId)) continue;

    seen.add(campaignId);
    result.push(campaignId);
  }

  return result;
}

export function mergeCampaignCandidates(...groups) {
  const result = [];
  const seen = new Set();

  for (const campaigns of groups) {
    for (const campaign of campaigns || []) {
      const campaignId = idString(campaign?._id || campaign?.id);
      if (!campaignId || seen.has(campaignId)) continue;
      seen.add(campaignId);
      result.push(campaign);
    }
  }

  return result;
}
