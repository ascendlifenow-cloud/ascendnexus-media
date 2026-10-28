import { MongoClient } from "mongodb";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isKnownTestMediaFixture, referencesAny } from "../server/services/media/TestMediaFixturePolicy";

const apply = process.argv.includes("--apply");
const backupPath = process.argv.find((arg) => arg.startsWith("--backup="))?.slice(9);
if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "") || !/stag(?:ing|ging)/i.test(process.env.MEDIA_STORAGE_BUCKET ?? "") || !backupPath?.startsWith("/private/tmp/")) throw new Error("Explicit staging database, bucket and private cleanup backup required.");
if (apply && !process.argv.includes("--confirm-delete-test-media")) throw new Error("Explicit test deletion confirmation required.");
process.env.NODE_ENV = "staging";
process.env.MEDIA_STORAGE_PROVIDER = "r2";
process.env.MEDIA_STORAGE_FORCE_PATH_STYLE = "true";
const { S3CompatibleStorageAdapter } = await import("../server/storage/S3CompatibleStorageAdapter");
const adapter = new S3CompatibleStorageAdapter({ providerName: "r2" });
const client = new MongoClient(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 10000 });
const runId = randomUUID();
try {
  const backup = JSON.parse(await readFile(backupPath, "utf8"));
  if (backup.environment !== "staging" || !Array.isArray(backup.media_assets) || !backup.media_assets.every(isKnownTestMediaFixture)) throw new Error("Invalid fixture backup.");
  const paths = new Map<string, Set<string>>();
  for (const asset of backup.media_assets) for (const value of [asset.url, asset.thumbnailUrl, asset.largeUrl]) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.hostname !== "staging-media.ascendnexusmedia.com" || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/public/")) continue;
      const path = decodeURIComponent(url.pathname.slice(1));
      if (path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) continue;
      const references = paths.get(path) ?? new Set<string>([path]);
      references.add(value);
      paths.set(path, references);
    } catch { /* Relative mock URLs do not authorize bucket deletion. */ }
  }
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name).filter((name) => !/audit|history|events|logs/i.test(name));
  let present = 0, deleted = 0, absent = 0, blocked = 0;
  for (const [path, identifiers] of paths) {
    if (!(await adapter.fileExists(path)).exists) { absent++; continue; }
    let referenced = false;
    for (const name of names) {
      for await (const record of db.collection(name).find({})) if (referencesAny(record, identifiers)) { referenced = true; break; }
      if (referenced) break;
    }
    if (referenced) { blocked++; continue; }
    present++;
    if (apply) {
      await adapter.delete(path);
      if ((await adapter.fileExists(path)).exists) throw new Error("Deletion verification failed.");
      deleted++;
      await db.collection("admin_audit_events").insertOne({ auditEventId: randomUUID(), action: "staging_test_object_deleted", entityType: "media", actorId: "operator:codex-user-request", summary: "User-approved deletion of an unreferenced test object, verified absent from R2.", createdAt: new Date().toISOString(), metadata: { runId, backupRunId: backup.runId, objectReferenceHash: createHash("sha256").update(path).digest("hex") } });
    }
  }
  console.log(JSON.stringify({ environment: "staging", runId, apply, publicObjectReferences: paths.size, present, absent, deleted, blocked, note: "Only exact staging public object references from the verified fixture backup were inspected; relative mock paths were not inferred." }, null, 2));
} catch {
  console.error(JSON.stringify({ environment: "staging", runId, error: "Test object cleanup stopped. Inspect audit history; no storage paths or tokens logged." }));
  process.exitCode = 1;
} finally { await client.close(); }
