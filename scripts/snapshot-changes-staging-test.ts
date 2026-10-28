import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { applySnapshotChanges, planSnapshotChanges } from "../server/database/snapshotChanges";

let client: MongoClient | undefined;
let created = false;
const collectionName = `anmx_snapshot_test_${randomUUID().replaceAll("-", "")}`;
try {
  assert.ok(process.argv.includes("--environment=staging") && process.argv.includes("--execute"));
  assert.match(process.env.MONGODB_DATABASE ?? "", /stag(?:ing|ging)/i);
  assert.ok(process.env.MONGODB_URI);
  client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  await db.createCollection(collectionName);
  created = true;
  const collection = db.collection(collectionName);
  const original = { recordId: "a", title: "Original" };
  await collection.insertMany([original, { recordId: "b", title: "Unrelated" }]);
  const change = { collectionName, idField: "recordId", id: "a", before: original, after: { ...original, title: "Edited" } };
  await collection.updateOne({ recordId: "b" }, { $set: { title: "Concurrent edit" } });
  await collection.insertOne({ recordId: "new", title: "Concurrent insert" });
  const session = client.startSession();
  try {
    await session.withTransaction(() => applySnapshotChanges(db, session, [change]));
    assert.equal((await collection.findOne({ recordId: "a" }))?.title, "Edited");
    const legacy = { entityType: "release", entityId: "legacy-fixture", publicationOperationId: "old-operation", status: "pending" };
    await collection.insertOne(legacy);
    const syncChanges = planSnapshotChanges({ publishedContentSyncStatuses: [legacy] }, { publishedContentSyncStatuses: [{ ...legacy, status: "synced" }] }).map((item) => ({ ...item, collectionName }));
    await session.withTransaction(() => applySnapshotChanges(db, session, syncChanges));
    assert.equal(await collection.countDocuments({ entityId: "legacy-fixture" }), 1);
    assert.equal((await collection.findOne({ entityId: "legacy-fixture" }))?.status, "synced");
    assert.ok((await collection.findOne({ entityId: "legacy-fixture" }))?.syncStatusId);
    assert.equal((await collection.findOne({ recordId: "b" }))?.title, "Concurrent edit");
    assert.ok(await collection.findOne({ recordId: "new" }));
    await assert.rejects(() => session.withTransaction(() => applySnapshotChanges(db, session, [change])), /conflict/);
    const current = await collection.findOne({ recordId: "a" });
    await assert.rejects(() => session.withTransaction(async () => {
      await applySnapshotChanges(db, session, [{ ...change, before: current!, after: { ...original, title: "Must roll back" } }]);
      throw new Error("Intentional rollback");
    }), /Intentional rollback/);
    assert.equal((await collection.findOne({ recordId: "a" }))?.title, "Edited");
  } finally { await session.endSession(); }
  console.log(JSON.stringify({ environment: "staging", release: process.env.RENDER_GIT_COMMIT ?? "operator-local", targetedWrite: true, unrelatedChangesPreserved: true, staleEditRejected: true, transactionRollback: true, legacySyncCompatibility: true, applicationRecordsModified: false }));
} catch {
  console.error("Staging snapshot test failed; no application records were modified.");
  process.exitCode = 1;
} finally {
  try { if (created) await client!.db(process.env.MONGODB_DATABASE).collection(collectionName).drop(); }
  catch { console.error("Disposable staging test collection cleanup failed; operator inspection required."); process.exitCode = 1; }
  await client?.close();
}
