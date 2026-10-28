import assert from "node:assert/strict";
import { applySnapshotChanges, planSnapshotChanges } from "../server/database/snapshotChanges";
import { JsonDatabase } from "../server/services/media/JsonDatabase";
import { databaseConnectionService } from "../server/database/DatabaseConnectionService";
import { publicationSyncId } from "../server/database/publicationSyncIdentity";

const before = {
  releaseRecords: [{ releaseId: "release-a", title: "Original", metadata: { revision: 1 } }, { releaseId: "release-b", title: "Keep" }],
  adminSessions: [{ sessionId: "session-a", status: "active" }],
};
const after = structuredClone(before);
after.releaseRecords[0].title = "Edited";
const changes = planSnapshotChanges(before, after);
assert.equal(changes.length, 1);
assert.equal(changes[0].collectionName, "song_releases");
assert.equal(changes[0].id, "release-a");
assert.equal(planSnapshotChanges(before, structuredClone(before)).length, 0);
assert.throws(() => planSnapshotChanges({}, { releaseRecords: [{ releaseId: "a" }, { releaseId: "a" }] }), /duplicate/);
assert.throws(() => planSnapshotChanges({}, { releaseRecords: [{ title: "No ID" }] }), /missing/);
const deletion = planSnapshotChanges(before, { ...before, releaseRecords: [before.releaseRecords[1]] });
assert.equal(deletion.length, 1);
assert.equal(deletion[0].after, undefined);
const legacyStatus = { entityType: "release", entityId: "a", publicationOperationId: "op-1", status: "pending", cacheInvalidated: true, assetSyncVerified: false, errors: [], warnings: [] };
const syncChanges = planSnapshotChanges({ publishedContentSyncStatuses: [legacyStatus] }, { publishedContentSyncStatuses: [{ ...legacyStatus, syncStatusId: publicationSyncId("release", "a"), status: "synced" }] });
assert.equal(syncChanges.length, 1);
assert.deepEqual(syncChanges[0].legacyFilter, { entityType: "release", entityId: "a", syncStatusId: { $exists: false } });
assert.equal(syncChanges[0].after?.syncStatusId, publicationSyncId("release", "a"));
assert.equal(planSnapshotChanges({ publishedContentSyncStatuses: [legacyStatus] }, { publishedContentSyncStatuses: [{ ...legacyStatus, status: "synced" }] })[0].after?.syncStatusId, publicationSyncId("release", "a"));

const records = new Map<string, Record<string, unknown>>([
  ["release-a", { ...before.releaseRecords[0], _id: "mongo-internal" }],
  ["release-b", { releaseId: "release-b", title: "Concurrent unrelated edit" }],
  ["release-new", { releaseId: "release-new", title: "Concurrent insert" }],
]);
const session = {};
const calls: string[] = [];
const db = { collection(name: string) {
  assert.equal(name, "song_releases");
  return {
    async findOne(filter: Record<string, string>, options: { session: unknown }) { assert.equal(options.session, session); return records.get(filter.releaseId) ?? null; },
    async replaceOne(filter: Record<string, string>, value: Record<string, unknown>, options: { session: unknown }) { assert.equal(options.session, session); calls.push("replace"); records.set(filter.releaseId, value); },
    async deleteOne(filter: Record<string, string>, options: { session: unknown }) { assert.equal(options.session, session); calls.push("delete"); records.delete(filter.releaseId); },
    async insertOne(value: Record<string, unknown>, options: { session: unknown }) { assert.equal(options.session, session); calls.push("insert"); records.set(String(value.releaseId), value); },
  };
} };
await applySnapshotChanges(db as never, session as never, changes);
assert.deepEqual(calls, ["replace"]);
assert.equal(records.get("release-b")?.title, "Concurrent unrelated edit");
assert.ok(records.has("release-new"));
await assert.rejects(() => applySnapshotChanges(db as never, session as never, changes), /conflict/);
assert.equal(calls.length, 1);
await applySnapshotChanges(db as never, session as never, deletion.map((change) => ({ ...change, before: records.get(change.id) } )));
assert.equal(records.has("release-a"), false);
const insertion = planSnapshotChanges({}, { releaseRecords: [{ releaseId: "new", title: "New" }] });
await applySnapshotChanges(db as never, session as never, insertion);
await assert.rejects(() => applySnapshotChanges(db as never, session as never, insertion), /conflict/);

// Exercise the real update wrapper against a transactional in-memory test double.
const originalConfigured = databaseConnectionService.isConfigured;
const originalDb = databaseConnectionService.getDb;
const originalSession = databaseConnectionService.withSession;
let stored = new Map<string, Record<string, unknown>[]>([
  ["song_releases", [{ releaseId: "a", title: "Original" }, { releaseId: "b", title: "Unrelated" }]],
  ["admin_sessions", [{ sessionId: "s", status: "active" }]],
]);
let transactionCount = 0;
let failOnReplace = false;
let failOnInsert = false;
const fakeDb = { collection(name: string) {
  return {
    find() { return { async toArray() { return structuredClone(stored.get(name) ?? []); } }; },
    async findOne(filter: Record<string, unknown>) { return structuredClone((stored.get(name) ?? []).find((record) => Object.entries(filter).every(([key, value]) => value && typeof value === "object" && "$exists" in value ? record[key] === undefined : record[key] === value)) ?? null); },
    async replaceOne(filter: Record<string, unknown>, value: Record<string, unknown>) {
      if (failOnReplace) throw new Error("Injected write failure");
      const rows = stored.get(name)!;
      const i = rows.findIndex((record) => Object.entries(filter).every(([key, expected]) => expected && typeof expected === "object" && "$exists" in expected ? record[key] === undefined : record[key] === expected));
      rows[i] = structuredClone(value);
    },
    async insertOne(value: Record<string, unknown>) { if (failOnInsert) throw new Error("Injected insert failure"); stored.set(name, [...(stored.get(name) ?? []), structuredClone(value)]); },
  };
} };
try {
  databaseConnectionService.isConfigured = () => true;
  databaseConnectionService.getDb = async () => fakeDb as never;
  databaseConnectionService.withSession = async (callback) => callback({ async withTransaction(work: () => Promise<void>) {
    transactionCount++;
    const rollback = structuredClone(stored);
    try { await work(); } catch (error) { stored = rollback; throw error; }
  } } as never);
  const database = new JsonDatabase();
  await database.update((data) => {
    data.releaseRecords[0].title = "Edited";
    stored.get("song_releases")![1].title = "Concurrent edit";
    stored.get("admin_sessions")![0].status = "revoked";
  });
  assert.equal(stored.get("song_releases")![0].title, "Edited");
  assert.equal(stored.get("song_releases")![1].title, "Concurrent edit");
  assert.equal(stored.get("admin_sessions")![0].status, "revoked");
  const count = transactionCount;
  await database.update(() => {});
  assert.equal(transactionCount, count, "No-op updates must not start a write transaction");
  await assert.rejects(() => database.update((data) => {
    data.releaseRecords[0].title = "Stale edit";
    stored.get("song_releases")![0].title = "Newer edit";
  }), /conflict/);
  assert.equal(stored.get("song_releases")![0].title, "Newer edit");
  const unchanged = structuredClone(stored);
  failOnReplace = true;
  await assert.rejects(() => database.update((data) => {
    data.adminAuditEvents.push({ auditEventId: "rollback-test", action: "test", summary: "Test", createdAt: "2026-10-27" });
    data.releaseRecords[0].title = "Must not persist";
  }), /Injected write failure/);
  assert.deepEqual(stored, unchanged);
  failOnReplace = false;
  failOnInsert = true;
  await assert.rejects(() => database.update((data) => {
    data.releaseRecords[0].title = "Must roll back";
    data.adminAuditEvents.push({ auditEventId: "rollback-test", action: "test", summary: "Test", createdAt: "2026-10-27" });
  }), /Injected insert failure/);
  assert.deepEqual(stored, unchanged, "The earlier release write must roll back with the failed audit insert");
  await assert.rejects(() => database.update(() => { throw new Error("Mutator failure"); }), /Mutator failure/);
  assert.deepEqual(stored, unchanged);
  failOnInsert = false;
  stored.set("published_content_sync_statuses", [legacyStatus]);
  await database.update((data) => { data.publishedContentSyncStatuses[0].status = "synced"; });
  assert.equal(stored.get("published_content_sync_statuses")![0].syncStatusId, publicationSyncId("release", "a"));
} finally {
  databaseConnectionService.isConfigured = originalConfigured;
  databaseConnectionService.getDb = originalDb;
  databaseConnectionService.withSession = originalSession;
}
console.log("Snapshot change tests passed: targeted writes, concurrent data preserved, stale edits rejected, transaction propagation, no-op and rollback behavior (test double).");
