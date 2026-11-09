import assert from "node:assert/strict";
import { MemberApiError } from "../src/services/member/MemberApiError";

Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_WORKERS_ENABLED: "false" });
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { memberIdentityService } = await import("../server/services/members/MemberIdentityService");
const originalPatch = jsonDatabase.patchCollectionRecord;
const originalUpdate = jsonDatabase.update;
let session: Record<string, unknown> | null = {
  sessionId: "test-session", status: "active", tokenHash: "unchanged",
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  absoluteExpiresAt: new Date(Date.now() + 120000).toISOString(),
};
let writes = 0;
try {
  jsonDatabase.update = async () => { throw new Error("Session activity must not rewrite snapshots"); };
  jsonDatabase.patchCollectionRecord = (async (collection: string, filter: Record<string, unknown>, patch: Record<string, unknown>) => {
    assert.equal(collection, "memberSessions");
    assert.deepEqual(filter, { sessionId: "test-session", status: "active" });
    assert.deepEqual(Object.keys(patch), ["lastActiveAt"]);
    writes++;
    return session?.status === "active" ? { ...session, ...patch } : null;
  }) as typeof originalPatch;
  const touch = () => (memberIdentityService as unknown as { touchSession(id: string): Promise<void> }).touchSession("test-session");
  await Promise.all(Array.from({ length: 20 }, touch));
  assert.equal(writes, 20);
  assert.equal(session.tokenHash, "unchanged");
  session.status = "revoked";
  await assert.rejects(touch(), /invalid or expired/);
  session.status = "active";
  session.expiresAt = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(touch(), /invalid or expired/);
  session = null;
  await assert.rejects(touch(), /invalid or expired/);
  assert.equal(new MemberApiError("Signed out", 401).status, 401);
  assert.notEqual(new MemberApiError("Conflict", 409).status, 401);
  console.log("Passed: parallel atomic session activity, no snapshot replacements, revoked/expired/missing denial and preserved HTTP error status. No live data accessed.");
} finally {
  jsonDatabase.patchCollectionRecord = originalPatch;
  jsonDatabase.update = originalUpdate;
}
