import { api } from "./client.js";

async function request(path, payload = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = api.getToken();
  const campaignId = api.getActiveCampaignId();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (campaignId) headers["X-Campaign-Id"] = campaignId;

  const response = await fetch(`/api${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload)
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : {};
  if (!response.ok) {
    const error = new Error(body.error || "Character assignment failed.");
    error.status = response.status;
    error.code = body.code || "";
    throw error;
  }
  return body;
}

export function assignCharacterMembership(characterId, membershipId = "") {
  return request(`/characters/${encodeURIComponent(characterId)}/assignment`, { membershipId });
}
