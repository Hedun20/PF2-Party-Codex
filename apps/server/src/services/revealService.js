import { getDb, mongoStatus } from "../db/mongo.js";
import { collections } from "../repositories/collections.js";
import { objectIdFrom } from "../repositories/worldSystemsRepository.js";
import { slugify } from "../utils/slugify.js";
import { findCampaignPage } from "./campaignContentService.js";

const REVEAL_SOURCE = "playerReveal";

function campaignKey(campaignId) {
  return objectIdFrom(campaignId) || campaignId;
}

function assertMongoReveal() {
  if (mongoStatus().connected) return;
  const error = new Error("Mongo campaign storage is not connected. Player reveal is unavailable until the database connection is restored.");
  error.status = 503;
  throw error;
}

function worldKey(world = "") {
  return slugify(world || "world");
}

function imageForPage(page = {}) {
  return page.handoutImage
    || page.frontmatter?.handoutImage
    || page.avatarImage
    || page.frontmatter?.avatarImage
    || page.mapImage
    || page.frontmatter?.mapImage
    || page.image
    || page.frontmatter?.image
    || page.tokenImage
    || page.frontmatter?.tokenImage
    || "";
}

function compactContent(content = "") {
  const text = String(content || "").trim();
  if (!text) return "";
  return text.length > 2400 ? `${text.slice(0, 2400).trim()}\n\n...` : text;
}

function publicReveal(document = {}) {
  return {
    id: String(document._id || ""),
    world: document.source?.world || "",
    path: document.source?.path || "",
    title: document.title || "Untitled handout",
    category: document.source?.category || "",
    type: document.source?.type || "",
    summary: document.source?.summary || "",
    tags: document.source?.tags || [],
    image: document.source?.image || "",
    content: document.body || "",
    note: document.note || "",
    revealedAt: document.releasedAt || document.createdAt || ""
  };
}

function revealQuery(campaignId, world = "") {
  const query = {
    campaignId: campaignKey(campaignId),
    "source.kind": REVEAL_SOURCE
  };
  if (world) query["source.worldKey"] = worldKey(world);
  return query;
}

export async function getRevealState({ campaignId = "", world = "" } = {}) {
  assertMongoReveal();
  const query = revealQuery(campaignId, world);
  const documents = await getDb().collection(collections.handouts)
    .find(query)
    .sort({ releasedAt: -1, createdAt: -1 })
    .limit(8)
    .toArray();
  const activeDocument = documents.find((item) => item.source?.active === true) || null;
  return {
    campaignId,
    world: activeDocument?.source?.world || documents[0]?.source?.world || world,
    active: activeDocument ? publicReveal(activeDocument) : null,
    history: documents.map(publicReveal)
  };
}

export async function revealPageToPlayers({ campaignId = "", userId = "", world = "", path = "", note = "" } = {}) {
  assertMongoReveal();
  const page = await findCampaignPage({ campaignId, path, role: "player" });
  if (!page) {
    const error = new Error("Эту статью нельзя показать игрокам: она не найдена или не является public/player-safe.");
    error.status = 404;
    throw error;
  }

  const resolvedWorld = world || page.world || page.frontmatter?.world || "world";
  const stamp = new Date().toISOString();
  const collection = getDb().collection(collections.handouts);
  const actorId = objectIdFrom(userId) || userId || null;
  await collection.updateMany(revealQuery(campaignId, resolvedWorld), {
    $set: { "source.active": false, updatedAt: stamp, updatedBy: actorId }
  });

  const document = {
    campaignId: campaignKey(campaignId),
    title: page.title,
    body: compactContent(page.content),
    note: String(note || "").trim().slice(0, 2000),
    assetIds: [],
    linkedEntryIds: page.entryId ? [objectIdFrom(page.entryId) || page.entryId] : [],
    linkedSessionId: null,
    visibility: "partyVisible",
    visibleToUserIds: [],
    releasedBy: actorId,
    releasedAt: stamp,
    source: {
      kind: REVEAL_SOURCE,
      active: true,
      world: resolvedWorld,
      worldKey: worldKey(resolvedWorld),
      path: page.path,
      category: page.category,
      type: page.type,
      summary: page.summary || "",
      tags: page.tags || [],
      image: imageForPage(page)
    },
    createdBy: actorId,
    updatedBy: actorId,
    createdAt: stamp,
    updatedAt: stamp
  };
  const result = await collection.insertOne(document);
  const active = publicReveal({ ...document, _id: result.insertedId });
  const state = await getRevealState({ campaignId, world: resolvedWorld });
  return { ...state, active };
}

export async function clearRevealState({ campaignId = "", userId = "", world = "" } = {}) {
  assertMongoReveal();
  const stamp = new Date().toISOString();
  await getDb().collection(collections.handouts).updateMany(revealQuery(campaignId, world), {
    $set: {
      "source.active": false,
      updatedAt: stamp,
      updatedBy: objectIdFrom(userId) || userId || null
    }
  });
  return getRevealState({ campaignId, world });
}
