import crypto from "crypto";
import { promisify } from "util";
import {
  bootstrapMembershipForNewUser,
  identityContextForCampaign,
  identityContextForUser,
  isMongoIdentityEnabled,
  mongoFindUserByEmail,
  mongoFindUserById,
  mongoHasUsers,
  mongoInsertUser,
  mongoListUsers,
  mongoUpdateUser,
  normalizeEmail
} from "../repositories/identityRepository.js";
import { readJson, writeJson } from "./jsonDb.js";

const scrypt = promisify(crypto.scrypt);
const USERS_FILE = "users.json";
const VERIFY_TTL_MS = Number(process.env.EMAIL_VERIFY_TTL_MS || 1000 * 60 * 60 * 24);

function idString(user) {
  return String(user?._id || user?.id || "");
}

function legacyRole(user) {
  return user?.role || "player";
}

export async function publicUser(user, { campaignId = "" } = {}) {
  if (!user) return null;
  let context = { activeWorkspace: null, activeCampaign: null, activeMembership: null, membership: null, role: legacyRole(user) };
  try {
    context = campaignId
      ? await identityContextForCampaign(user, campaignId)
      : await identityContextForUser(user);
  } catch (error) {
    if (!isMongoUnavailableError(error)) throw error;
  }
  const role = context.role || legacyRole(user);
  return {
    id: idString(user),
    email: user.email,
    name: user.name,
    role,
    emailVerified: Boolean(user.emailVerified),
    status: user.status || "active",
    activeWorkspace: context.activeWorkspace,
    activeCampaign: context.activeCampaign,
    activeMembership: context.activeMembership || context.membership,
    membership: context.membership || context.activeMembership,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function legacyPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    status: user.status || "active",
    activeWorkspace: null,
    activeCampaign: null,
    activeMembership: null,
    membership: null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
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
  if (existingUsers.some((user) => user.email === normalizedEmail)) {
    const error = new Error("This email is already registered.");
    error.status = 409;
    throw error;
  }
  return normalizedEmail;
}

function isMongoUnavailableError(error) {
  return error?.status === 503 || /MongoDB is not connected/i.test(String(error?.message || error || ""));
}

async function fallbackOnMongoUnavailable(mongoOperation, legacyOperation) {
  if (!isMongoIdentityEnabled()) return legacyOperation();
  try {
    return await mongoOperation();
  } catch (error) {
    if (isMongoUnavailableError(error)) return legacyOperation();
    throw error;
  }
}

export async function listUsers() {
  return fallbackOnMongoUnavailable(
    () => mongoListUsers(),
    () => readJson(USERS_FILE, [])
  );
}

export async function hasUsers() {
  return fallbackOnMongoUnavailable(
    () => mongoHasUsers(),
    async () => (await readJson(USERS_FILE, [])).length > 0
  );
}

export async function findUserById(id) {
  return fallbackOnMongoUnavailable(
    () => mongoFindUserById(id),
    async () => {
      const users = await readJson(USERS_FILE, []);
      return users.find((user) => user.id === id) || null;
    }
  );
}

export async function findUserByEmail(email) {
  return fallbackOnMongoUnavailable(
    () => mongoFindUserByEmail(email),
    async () => {
      const users = await readJson(USERS_FILE, []);
      return users.find((user) => user.email === normalizeEmail(email)) || null;
    }
  );
}

export async function createUser(input) {
  const verifyToken = crypto.randomBytes(32).toString("base64url");
  const password = await hashPassword(input.password);
  const now = new Date().toISOString();

  if (isMongoIdentityEnabled()) {
    try {
      const existing = await mongoFindUserByEmail(input.email);
      const normalizedEmail = validateNewUser(input, existing ? [existing] : []);
      const user = await mongoInsertUser({
        email: normalizedEmail,
        passwordHash: password.hash,
        passwordSalt: password.salt,
        name: String(input.name || "").trim() || normalizedEmail.split("@")[0],
        emailVerified: false,
        emailVerifiedAt: "",
        emailVerifyTokenHash: hashToken(verifyToken),
        emailVerifyTokenExpiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
        status: "active",
        createdAt: now,
        updatedAt: now
      });
      await bootstrapMembershipForNewUser(user);
      return { user: await publicUser(user), verifyToken };
    } catch (error) {
      if (!isMongoUnavailableError(error)) throw error;
    }
  }

  const users = await readJson(USERS_FILE, []);
  const normalizedEmail = validateNewUser(input, users);
  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: String(input.name || "").trim() || normalizedEmail.split("@")[0],
    passwordHash: password.hash,
    passwordSalt: password.salt,
    role: users.length === 0 ? "gm" : "player",
    status: "active",
    emailVerified: false,
    emailVerifiedAt: "",
    emailVerifyTokenHash: hashToken(verifyToken),
    emailVerifyTokenExpiresAt: new Date(Date.now() + VERIFY_TTL_MS).toISOString(),
    createdAt: now,
    updatedAt: now
  };
  await writeJson(USERS_FILE, [...users, user]);
  return { user: legacyPublicUser(user), verifyToken };
}

export async function verifyPassword(user, password) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const attempt = await hashPassword(password, user.passwordSalt);
  const left = Buffer.from(attempt.hash, "hex");
  const right = Buffer.from(user.passwordHash, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function verifyEmailToken(token = "") {
  const tokenHash = hashToken(String(token));

  if (isMongoIdentityEnabled()) {
    try {
      const users = await mongoListUsers();
      const user = users.find((item) => item.emailVerifyTokenHash === tokenHash);
      if (!user) return null;
      if (new Date(user.emailVerifyTokenExpiresAt || 0).getTime() < Date.now()) return null;
      const updated = await mongoUpdateUser(idString(user), {
        emailVerified: true,
        emailVerifiedAt: new Date().toISOString(),
        emailVerifyTokenHash: "",
        emailVerifyTokenExpiresAt: ""
      });
      return publicUser(updated);
    } catch (error) {
      if (!isMongoUnavailableError(error)) throw error;
    }
  }

  const users = await readJson(USERS_FILE, []);
  const index = users.findIndex((user) => user.emailVerifyTokenHash === tokenHash);
  if (index === -1) return null;
  const user = users[index];
  if (new Date(user.emailVerifyTokenExpiresAt || 0).getTime() < Date.now()) return null;
  users[index] = {
    ...user,
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    emailVerifyTokenHash: "",
    emailVerifyTokenExpiresAt: "",
    updatedAt: new Date().toISOString()
  };
  await writeJson(USERS_FILE, users);
  return legacyPublicUser(users[index]);
}

export async function toPublicUser(user, options = {}) {
  if (isMongoIdentityEnabled()) return publicUser(user, options);
  return legacyPublicUser(user);
}
