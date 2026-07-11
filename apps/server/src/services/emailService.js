import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "../repositories/collections.js";
import { logger } from "../utils/logger.js";

let workerTimer = null;
let workerRunning = false;

function outbox() {
  return getDb().collection(collections.emailOutbox);
}

function idString(value) {
  return String(value?._id || value || "");
}

function publicDelivery(item) {
  if (!item) return null;
  return {
    id: idString(item),
    campaignId: idString(item.campaignId),
    to: item.to,
    from: item.from,
    subject: item.subject,
    status: item.status,
    deliveryMode: item.deliveryMode,
    attempts: item.attempts || 0,
    providerMessageId: item.providerMessageId || "",
    lastError: item.lastError || "",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    sentAt: item.sentAt || "",
    nextAttemptAt: item.nextAttemptAt || ""
  };
}

function deliveryKey(id) {
  if (id instanceof ObjectId) return id;
  return ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : null;
}

function safeDeliveryError(error) {
  const message = String(error?.message || error || "Email delivery failed.");
  return message.replace(/Bearer\s+\S+/gi, "Bearer <redacted>").slice(0, 500);
}

function retryAt(attempts) {
  const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function emailDeliveryReadiness() {
  const webhookReady = Boolean(config.emailWebhookUrl && config.emailWebhookToken.length >= 16);
  return {
    mode: config.emailMode,
    ready: config.emailMode === "outbox" ? !config.isProduction : webhookReady,
    automaticDelivery: config.emailMode === "webhook" && webhookReady
  };
}

export async function ensureEmailOutboxIndexes() {
  if (!mongoStatus().connected) return [];
  await outbox().createIndex({ status: 1, nextAttemptAt: 1, createdAt: 1 });
  await outbox().createIndex({ campaignId: 1, createdAt: -1 });
  await outbox().createIndex({ to: 1, createdAt: -1 });
  await outbox().createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 });
  return ["emailOutbox.status_nextAttemptAt_createdAt", "emailOutbox.campaignId_createdAt", "emailOutbox.to_createdAt", "emailOutbox.purgeAt_ttl"];
}

export async function emailOutboxCounts() {
  if (!mongoStatus().connected) return { queued: 0, retry: 0, sent: 0, failed: 0 };
  const rows = await outbox().aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray();
  const counts = { queued: 0, retry: 0, sent: 0, failed: 0 };
  for (const row of rows) counts[row._id] = row.count;
  return counts;
}

export async function listEmailOutbox({ status = "", limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const query = status ? { status: String(status) } : {};
  const items = await outbox().find(query).sort({ createdAt: -1 }).limit(safeLimit).toArray();
  return items.map(publicDelivery);
}

async function deliverWebhook(item) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.emailWebhookTimeoutMs);
  try {
    const response = await fetch(config.emailWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.emailWebhookToken}`,
        "idempotency-key": idString(item)
      },
      body: JSON.stringify({
        event: "party-codex.email.send",
        message: {
          id: idString(item),
          from: item.from,
          to: item.to,
          subject: item.subject,
          html: item.html,
          text: item.text
        }
      }),
      signal: controller.signal
    });
    const responseText = (await response.text()).slice(0, 2_000);
    if (!response.ok) throw new Error(`Email webhook returned HTTP ${response.status}.`);
    let providerMessageId = "";
    try {
      providerMessageId = String(JSON.parse(responseText || "{}").id || "");
    } catch {
      providerMessageId = "";
    }
    return { providerMessageId };
  } finally {
    clearTimeout(timeout);
  }
}

export async function deliverQueuedEmail(id) {
  const key = deliveryKey(id);
  if (!key) {
    const error = new Error("Email outbox item was not found.");
    error.status = 404;
    throw error;
  }
  const item = await outbox().findOne({ _id: key });
  if (!item) {
    const error = new Error("Email outbox item was not found.");
    error.status = 404;
    throw error;
  }
  if (item.status === "sent") return publicDelivery(item);
  if (config.emailMode !== "webhook" || !emailDeliveryReadiness().automaticDelivery) {
    return publicDelivery(item);
  }

  const attempt = (item.attempts || 0) + 1;
  const stamp = new Date().toISOString();
  const claimed = await outbox().updateOne(
    { _id: key, status: { $in: ["queued", "retry", "failed"] } },
    { $set: { status: "delivering", attempts: attempt, lastAttemptAt: stamp, updatedAt: stamp, lastError: "" } }
  );
  if (!claimed.modifiedCount) return publicDelivery(await outbox().findOne({ _id: key }));
  try {
    const delivered = await deliverWebhook({ ...item, attempts: attempt });
    const sentAt = new Date().toISOString();
    const patch = {
      status: "sent",
      attempts: attempt,
      providerMessageId: delivered.providerMessageId,
      sentAt,
      purgeAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: sentAt,
      nextAttemptAt: "",
      lastError: ""
    };
    await outbox().updateOne({ _id: key }, { $set: patch, $unset: { html: "", text: "" } });
    logger.info("Email delivered", { outboxId: idString(item), to: item.to, subject: item.subject });
    return publicDelivery({ ...item, ...patch });
  } catch (error) {
    const lastError = safeDeliveryError(error);
    const updatedAt = new Date().toISOString();
    const status = attempt >= 8 ? "failed" : "retry";
    const patch = {
      status,
      attempts: attempt,
      lastError,
      updatedAt,
      nextAttemptAt: status === "retry" ? retryAt(attempt) : ""
    };
    await outbox().updateOne({ _id: key }, { $set: patch });
    logger.error("Email delivery failed", { outboxId: idString(item), status, attempts: attempt, error: lastError });
    return publicDelivery({ ...item, ...patch });
  }
}

export async function sendEmail(args) {
  if (!mongoStatus().connected) {
    const error = new Error("MongoDB is required to queue email safely.");
    error.status = 503;
    throw error;
  }
  const to = String(args.to || "").trim().toLowerCase();
  const subject = String(args.subject || "").trim();
  if (!to || !subject) {
    const error = new Error("Email recipient and subject are required.");
    error.status = 400;
    throw error;
  }
  const stamp = new Date().toISOString();
  const item = {
    messageKey: crypto.randomUUID(),
    campaignId: args.campaignId || null,
    createdByUserId: args.createdByUserId || null,
    createdAt: stamp,
    updatedAt: stamp,
    from: args.from || config.emailFrom,
    to,
    subject,
    html: String(args.html || ""),
    text: String(args.text || ""),
    deliveryMode: config.emailMode,
    status: "queued",
    attempts: 0,
    lastAttemptAt: "",
    nextAttemptAt: "",
    lastError: "",
    providerMessageId: "",
    sentAt: ""
  };
  const result = await outbox().insertOne(item);
  const saved = { ...item, _id: result.insertedId };
  logger.info("Email queued", { outboxId: idString(saved), mode: config.emailMode, to, subject });
  if (config.emailMode === "webhook") {
    setTimeout(() => {
      deliverQueuedEmail(saved._id).catch((error) => {
        logger.error("Scheduled email delivery failed", { outboxId: idString(saved), error: safeDeliveryError(error) });
      });
    }, 0).unref();
  }
  return publicDelivery(saved);
}

export async function processDueEmailOutbox({ limit = 25 } = {}) {
  if (!mongoStatus().connected || !emailDeliveryReadiness().automaticDelivery) return { processed: 0 };
  const stamp = new Date().toISOString();
  const items = await outbox().find({
    status: { $in: ["queued", "retry"] },
    $or: [
      { nextAttemptAt: "" },
      { nextAttemptAt: { $exists: false } },
      { nextAttemptAt: { $lte: stamp } }
    ]
  }).sort({ createdAt: 1 }).limit(Math.max(1, Math.min(Number(limit) || 25, 100))).toArray();
  for (const item of items) await deliverQueuedEmail(item._id);
  return { processed: items.length };
}

export function startEmailOutboxWorker({ intervalMs = 60_000 } = {}) {
  if (workerTimer || !mongoStatus().connected || !emailDeliveryReadiness().automaticDelivery) return;
  const run = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await processDueEmailOutbox();
    } catch (error) {
      logger.error("Email outbox worker failed", { error: safeDeliveryError(error) });
    } finally {
      workerRunning = false;
    }
  };
  workerTimer = setInterval(run, Math.max(10_000, Number(intervalMs) || 60_000));
  workerTimer.unref();
  setTimeout(run, 0).unref();
  logger.info("Email outbox worker started", { mode: config.emailMode });
}

export function stopEmailOutboxWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function baseHtml(content) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Party Codex</title>
</head>
<body style="margin:0;padding:28px 0;background:#09070d;color:#eadff0;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
  <div style="max-width:680px;margin:0 auto;padding:0 18px;">
    <div style="overflow:hidden;border:1px solid rgba(227,182,95,.34);border-radius:18px;background:linear-gradient(145deg,#181224,#0d0a14);box-shadow:0 24px 80px rgba(0,0,0,.35);">
      <div style="height:7px;background:linear-gradient(90deg,#e3b65f,#4dd4a1,#a855f7);"></div>
      <div style="padding:30px 30px 10px;">
        <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#e3b65f;font-weight:800;">Collaborative campaign workspace</div>
        <h1 style="margin:8px 0 18px;font-size:28px;line-height:1.1;color:#fff6df;">Party Codex</h1>
        ${content}
      </div>
      <div style="padding:18px 30px 24px;border-top:1px solid rgba(227,182,95,.18);background:rgba(0,0,0,.18);">
        <p style="margin:0;color:#a99ab0;font-size:12px;">Party Codex protects GM notes from player view. Never forward verification links to other players.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function verifyEmailTemplate({ verifyUrl, name }) {
  const greeting = name ? `Hello ${escapeHtml(name)},` : "Hello,";
  const html = baseHtml(`
    <p style="margin:0 0 14px;color:#eadff0;">${greeting}</p>
    <p style="margin:0 0 18px;color:#cfc1d8;">Confirm this email to activate your Party Codex account. Campaign access is granted through workspace creation or an invitation.</p>
    <p style="margin:0 0 18px;"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,#f0ce7a,#c28a34);color:#17100d;text-decoration:none;font-weight:800;">Confirm email</a></p>
    <p style="margin:0;color:#9e8fab;font-size:12px;word-break:break-all;">Or copy this link: ${escapeHtml(verifyUrl)}</p>
  `);
  const text = `${greeting}\n\nConfirm your Party Codex email:\n${verifyUrl}\n`;
  return { html, text };
}
