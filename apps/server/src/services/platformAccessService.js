import { config } from "../config.js";

function normalizedEmail(user) {
  return String(user?.email || "").trim().toLowerCase();
}

function normalizedRoles(user) {
  return Array.isArray(user?.platformRoles)
    ? user.platformRoles.map((role) => String(role).trim().toLowerCase())
    : [];
}

export function platformAccessForUser(user, { adminEmails = config.platformAdminEmails } = {}) {
  const email = normalizedEmail(user);
  const verified = Boolean(user?.emailVerified);
  const allowlisted = Boolean(email && adminEmails.map((item) => String(item).toLowerCase()).includes(email));
  const storedAdminRole = normalizedRoles(user).includes("admin");
  return {
    isAdmin: Boolean(user && user.status !== "disabled" && verified && (allowlisted || storedAdminRole))
  };
}

export function platformAdminConfigured({ adminEmails = config.platformAdminEmails } = {}) {
  return adminEmails.length > 0;
}
