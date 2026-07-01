import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(serverDir, "../..");

for (const envPath of [path.join(rootDir, ".env"), path.join(serverDir, ".env")]) {
  dotenv.config({ path: envPath, quiet: true });
}

const database = process.env.MONGO_DB_NAME || "pf2_party_codex";
const mongoUri = process.env.MONGO_URI || "";

function sanitizeMongoError(error) {
  const message = String(error?.message || error || "MongoDB smoke test failed.");
  return message
    .replace(/mongodb(?:\+srv)?:\/\/([^:@/]+):([^@/]+)@/gi, "mongodb://$1:<redacted>@")
    .replace(/(password=)[^&\s]+/gi, "$1<redacted>");
}

async function main() {
  console.log("Mongo smoke test started");
  console.log(`Database: ${database}`);

  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured.");
  }

  const client = new MongoClient(mongoUri, {
    appName: "pf2-party-codex-smoke-test",
    serverSelectionTimeoutMS: 10000
  });

  const marker = `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const document = {
    marker,
    kind: "mongo-smoke-test",
    createdAt: new Date().toISOString()
  };

  try {
    await client.connect();
    const db = client.db(database);
    const collection = db.collection("system_smoke_tests");

    const insert = await collection.insertOne(document);
    if (!insert.acknowledged) throw new Error("Insert was not acknowledged.");
    console.log("Insert: ok");

    const found = await collection.findOne({ _id: insert.insertedId, marker });
    if (!found) throw new Error("Inserted document could not be read back.");
    console.log("Read: ok");

    const deleted = await collection.deleteOne({ _id: insert.insertedId, marker });
    if (deleted.deletedCount !== 1) throw new Error("Temporary smoke document was not deleted.");
    console.log("Delete: ok");

    console.log("Mongo smoke test passed");
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(`Mongo smoke test failed: ${sanitizeMongoError(error)}`);
  process.exit(1);
});
