import crypto from "crypto";
import { logger } from "../utils/logger.js";
import { readJson, writeJson } from "./jsonDb.js";

const OUTBOX_FILE = "mail-outbox.json";

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
  <title>PF2 Party Codex</title>
</head>
<body style="margin:0;padding:28px 0;background:#09070d;color:#eadff0;font-family:Arial,Helvetica,sans-serif;line-height:1.55;">
  <div style="max-width:680px;margin:0 auto;padding:0 18px;">
    <div style="overflow:hidden;border:1px solid rgba(227,182,95,.34);border-radius:18px;background:linear-gradient(145deg,#181224,#0d0a14);box-shadow:0 24px 80px rgba(0,0,0,.35);">
      <div style="height:7px;background:linear-gradient(90deg,#e3b65f,#4dd4a1,#a855f7);"></div>
      <div style="padding:30px 30px 10px;">
        <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#e3b65f;font-weight:800;">Pathfinder 2e campaign archive</div>
        <h1 style="margin:8px 0 18px;font-size:28px;line-height:1.1;color:#fff6df;">PF2 Party Codex</h1>
        ${content}
      </div>
      <div style="padding:18px 30px 24px;border-top:1px solid rgba(227,182,95,.18);background:rgba(0,0,0,.18);">
        <p style="margin:0;color:#a99ab0;font-size:12px;">This local-first campaign platform protects GM notes from player view. Never forward verification links to other players.</p>
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
    <p style="margin:0 0 18px;color:#cfc1d8;">Confirm this email to activate your PF2 Party Codex account and join the campaign archive with the right player/GM access.</p>
    <p style="margin:0 0 18px;"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:linear-gradient(135deg,#f0ce7a,#c28a34);color:#17100d;text-decoration:none;font-weight:800;">Confirm email</a></p>
    <p style="margin:0;color:#9e8fab;font-size:12px;word-break:break-all;">Or copy this link: ${escapeHtml(verifyUrl)}</p>
  `);
  const text = `${greeting}\n\nConfirm your PF2 Party Codex email:\n${verifyUrl}\n`;
  return { html, text };
}

export async function sendEmail(args) {
  const outbox = await readJson(OUTBOX_FILE, []);
  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    from: args.from || process.env.EMAIL_FROM || "PF2 Party Codex <noreply@localhost>",
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text
  };
  outbox.push(item);
  await writeJson(OUTBOX_FILE, outbox.slice(-500));
  logger.info("Email queued in local outbox", { to: item.to, subject: item.subject });
  if (String(process.env.MAIL_DEBUG || "").toLowerCase() === "true") {
    logger.debug("Mail debug payload", { item });
  }
  return item;
}