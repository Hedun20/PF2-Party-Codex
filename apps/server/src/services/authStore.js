import crypto from "crypto";
import { promisify } from "util";
import { readJson, writeJson } from "./jsonDb.js";

const scrypt = promisify(crypto.scrypt);
const USERS_FILE = "users.json";
const VERIFY_TTL_MS = Number(process.env.EMAIL_VERIFY_TTL_MS || 1000 * 60 * 60 * 24);

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
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

export async function listUsers() {
  return readJson(USERS_FILE, []);
}

export async function hasUsers() {
  return (await listUsers()).length > 0;
}

export async function findUserById(id) {
  const users = await listUsers();
  return users.find((user) => user.id === id) || null;
}

export async function findUserByEmail(email) {
  const users = await listUsers();
  return users.find((user) => user.email === normalizeEmail(email)) || null;
}

export async function createUser(input) {
  const users = await listUsers();
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
  if (users.some((user) => user.email === normalizedEmail)) {
    const error = new Error("This email is already registered.");
    error.status = 409;
    throw error;
  }

  const verifyToken = crypto.randomBytes(32).toString("base64url");
  const password = await hashPassword(input.password);
  const now = new Date().toISOString();
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
  return { user: publicUser(user), verifyToken };
}

export async function verifyPassword(user, password) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const attempt = await hashPassword(password, user.passwordSalt);
  const left = Buffer.from(attempt.hash, "hex");
  const right = Buffer.from(user.passwordHash, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function verifyEmailToken(token = "") {
  const users = await listUsers();
  const tokenHash = hashToken(String(token));
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
  return publicUser(users[index]);
}

export function toPublicUser(user) {
  return publicUser(user);
}