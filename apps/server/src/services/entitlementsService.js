import { config } from "../config.js";

const PLAN_CATALOG = Object.freeze({
  free: Object.freeze({
    maxCampaigns: 3,
    maxMemberSeats: 12,
    maxAssetBytes: 1_000_000_000,
    foundryImportExport: true,
    markdownImportExport: true
  }),
  supporter: Object.freeze({
    maxCampaigns: 10,
    maxMemberSeats: 50,
    maxAssetBytes: 10_000_000_000,
    foundryImportExport: true,
    markdownImportExport: true
  }),
  studio: Object.freeze({
    maxCampaigns: 100,
    maxMemberSeats: 500,
    maxAssetBytes: 100_000_000_000,
    foundryImportExport: true,
    markdownImportExport: true
  }),
  development: Object.freeze({
    maxCampaigns: null,
    maxMemberSeats: null,
    maxAssetBytes: null,
    foundryImportExport: true,
    markdownImportExport: true
  })
});

const RESOURCE_LIMITS = Object.freeze({
  campaigns: "maxCampaigns",
  memberSeats: "maxMemberSeats",
  assetBytes: "maxAssetBytes"
});

export function normalizeWorkspacePlan(value = "free") {
  const plan = String(value || "free").trim().toLowerCase();
  if (plan === "local-dev") return "development";
  return Object.hasOwn(PLAN_CATALOG, plan) ? plan : "free";
}

export function entitlementsForWorkspace(workspace) {
  const plan = normalizeWorkspacePlan(workspace?.plan);
  return { plan, ...PLAN_CATALOG[plan] };
}

export function assertPlanCapacity({ workspace, resource, current = 0, increase = 1 } = {}) {
  const limitKey = RESOURCE_LIMITS[resource];
  if (!limitKey) throw new Error(`Unknown entitlement resource: ${resource}`);
  const entitlements = entitlementsForWorkspace(workspace);
  const limit = entitlements[limitKey];
  if (limit === null || Number(current) + Number(increase) <= limit) return entitlements;
  const error = new Error(`The ${entitlements.plan} workspace plan allows ${limit} ${resource}.`);
  error.status = 409;
  error.code = "ENTITLEMENT_LIMIT";
  throw error;
}

export function subscriptionForWorkspace(workspace, usage = {}) {
  const entitlements = entitlementsForWorkspace(workspace);
  return {
    workspaceId: String(workspace?.id || workspace?._id || ""),
    plan: entitlements.plan,
    status: workspace?.subscriptionStatus || "active",
    entitlements: {
      maxCampaigns: entitlements.maxCampaigns,
      maxMemberSeats: entitlements.maxMemberSeats,
      maxAssetBytes: entitlements.maxAssetBytes,
      foundryImportExport: entitlements.foundryImportExport,
      markdownImportExport: entitlements.markdownImportExport
    },
    usage: {
      campaigns: Number(usage.campaigns || 0),
      memberSeats: Number(usage.memberSeats || 0),
      pendingInvitations: Number(usage.pendingInvitations || 0),
      assetBytes: Number.isFinite(Number(usage.assetBytes)) ? Number(usage.assetBytes) : null
    },
    billing: {
      mode: config.billingMode,
      selfService: false,
      managedExternally: config.billingMode === "manual"
    }
  };
}

export function availableWorkspacePlans() {
  return Object.keys(PLAN_CATALOG);
}
