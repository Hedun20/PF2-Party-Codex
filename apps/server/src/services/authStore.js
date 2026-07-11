import crypto from "crypto";
import { promisify } from "util";
import {
  bootstrapMembershipForNewUser,
  identityContextForCampaign,
  identityContextForUser,
  isMongoIdentityEnabled,
  mongoFindUserByEmail,
  mongoFindUserById,
  mongoFindUserByVerificationTokenHash,
  mongoHasUsers,
  mongoInsertUser,
  mongoListUsers,
  mongoUpdateUser,
  normalizeEmail
} from "../repositories/identityRepository.js";
import { platformAccessForUser } from "./platformAccessService.js";

const scrypt = promisify(crypto.scrypt);
const VERIFY_TTL_MS = Number(process.env.EMAIL_VERIFY_TTL_MS || 1000 * 60 * 60 * 24);

function idString(user) {
  return String(user?._id || user?.id || "");
}

function requireMongoIdentity() {
  if (isMongoIdentityEnabled()) return;
  const error = new Error("Mongo identity storage is not connected. Authentication is unavailable until the database connection is restored.");
  error.status = 503;
  throw error;
}

export async function publicUser(user, { campaignId = "" } = {}) {
  if (!user) return null;
  requireMongoIdentity();
  const context = campaignId
    ? await identityContextForCampaign(user, campaignId)
    : await identityContextForUser(user);
  const role = context.role || "user";
  return {
    id: idString(user),
    email: user.email,
    name: user.name,
    role,
    emailVerified: Boolean(user.emailVerified),
    status: user.status || "active",
    platformAccess: platformAccessForUser(user),
    activeWorkspace: context.activeWorkspace,
    activeCampaign: context.activeCampaign,
    activeMembership: context.activeMembership || context.membership,
    membership: context.membership || context.activeMembership,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createEmailVerification() {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString()
  };
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = await scrypt(String(password), salt, 64);
  return { salt, hash: hash.toString("hex") };
}

function validateNewUser(input, existingUsers = []) {
  const normalizedEmail = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    const error = new Error("Enter a valid email address.");
    error.status = 400;
    throw error;
  }
  if (String(input.password || "").length < 8) {
    const error = new Error("Password must be at least 8 characters.");
    error.status = 400;
    throw error;
  }
  if (String(input.password || "").length > 256) {
    const error = new Error("Password is too long.");
    error.status = 400;
    throw error;
  }
  if (existingUsers.some((user) => user.email === normalizedEmail)) {
    const error = new Error("This email is already registered.");
    error.status = 409;
    throw error;
  }
  return normalizedEmail;
}

export async function listUsers() {
  requireMongoIdentity();
  return mongoListUsers();
}

export async function hasUsers() {
  if (!isMongoIdentityEnabled()) return false;
  return mongoHasUsers();
}

export async function findUserById(id) {
  requireMongoIdentity();
  return mongoFindUserById(id);
}

export async function findUserByEmail(email) {
  requireMongoIdentity();
  return mongoFindUserByEmail(email);
}

export async function createUser(input) {
  requireMongoIdentity();
  const verification = createEmailVerification();
  const now = new Date().toISOString();
  const existing = await mongoFindUserByEmail(input.email);
  const normalizedEmail = validateNewUser(input, existing ? [existing] : []);
  const password = await hashPassword(input.password);
  let user;
  try {
    user = await mongoInsertUser({
      email: normalizedEmail,
      passwordHash: password.hash,
      passwordSalt: password.salt,
      name: (String(input.name || "").trim() || normalizedEmail.split("@")[0]).slice(0, 120),
      emailVerified: false,
      emailVerifiedAt: "",
      emailVerifyTokenHash: verification.tokenHash,
      emailVerifyTokenExpiresAt: verification.expiresAt,
      status: "active",
      sessionVersion: 1,
      createdAt: now,
      updatedAt: now
    });
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error("This email is already registered.");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
  await bootstrapMembershipForNewUser(user);
  return { user: await publicUser(user), verifyToken: verification.token };
}

export async function renewEmailVerification(user) {
  requireMongoIdentity();
  if (!user || user.emailVerified || user.status !== "active") return null;
  const verification = createEmailVerification();
  const updated = await mongoUpdateUser(idString(user), {
    emailVerifyTokenHash: verification.tokenHash,
    emailVerifyTokenExpiresAt: verification.expiresAt
  });
  return { user: updated, verifyToken: verification.token };
}

export async function revokeUserSessions(user) {
  requireMongoIdentity();
  if (!user) return null;
  return mongoUpdateUser(idString(user), { sessionVersion: Number(user.sessionVersion || 1) + 1 });
}

export async function verifyPassword(user, password) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  if (String(password || "").length > 256) return false;
  const attempt = await hashPassword(password, user.passwordSalt);
  const left = Buffer.from(attempt.hash, "hex");
  const right = Buffer.from(user.passwordHash, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function verifyEmailToken(token = "") {
  requireMongoIdentity();
  const tokenHash = hashToken(String(token));
  const user = await mongoFindUserByVerificationTokenHash(tokenHash);
  if (!user) return null;
  if (new Date(user.emailVerifyTokenExpiresAt || 0).getTime() < Date.now()) return null;
  const updated = await mongoUpdateUser(idString(user), {
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    emailVerifyTokenHash: "",
    emailVerifyTokenExpiresAt: ""
  });
  return publicUser(updated);
}

export async function toPublicUser(user, options = {}) {
  if (!user) return null;
  requireMongoIdentity();
  return publicUser(user, options);
}
