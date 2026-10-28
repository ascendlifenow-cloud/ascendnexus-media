import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { createServer } from "node:http";

const execute = process.argv.includes("--execute-isolated-staging-tests");
const cleanupRun = process.argv.find(arg => arg.startsWith("--cleanup-run="))?.slice(14);
if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "") || !process.env.MONGODB_URI || !/stag(?:ing|ging)/i.test(process.env.MEDIA_STORAGE_BUCKET ?? "")) throw new Error("Explicit staging database and bucket required.");
const targetFingerprint = createHash("sha256").update(JSON.stringify([process.env.MONGODB_URI.replace(/\/\/[^@]+@/, "//"), process.env.MEDIA_STORAGE_ENDPOINT, process.env.MONGODB_DATABASE, process.env.MEDIA_STORAGE_BUCKET])).digest("hex");
if (targetFingerprint !== "5c869a9ee027a5466c47c2e38f5980ac975f1b98b202da8d42d9c8bd3d4a65fb") throw new Error("Only the approved staging storage and database targets are permitted.");
if (!execute && !cleanupRun) throw new Error("Explicit isolated test execution or cleanup required.");
if (cleanupRun && !/^[a-f0-9-]{36}$/.test(cleanupRun)) throw new Error("Invalid test run.");
Object.assign(process.env, { NODE_ENV: "staging", MEDIA_STORAGE_PROVIDER: "r2", MEDIA_STORAGE_FORCE_PATH_STYLE: "true" });
const runId = cleanupRun ?? randomUUID();
const prefix = `staging-song-test-${runId}`;
const releaseId = `${prefix}-release`;
const assetId = `${prefix}-audio`;
const policyId = `${prefix}-policy`;
const entitlementKey = `staging.fixture.${runId}`;
const tiers = ["free", "premium", "supporter", "vip"] as const;
const memberIds = tiers.map(tier => `${prefix}-${tier}`);
const storagePath = `private/staging-permission-fixtures/${runId}/silence.wav`;
const api = "https://api-staging.ascendnexusmedia.com";
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
const checks: Array<{ name: string; passed: boolean }> = [];
const observations: Record<string, unknown> = {};
let phase = "preflight";
let cleanupComplete = false;
let failed = false;
let failedPhase: string | undefined;
const cleanupFailures: string[] = [];
const cookies = new Map<string, string>();
const check = (name: string, passed: boolean) => { checks.push({ name, passed }); assert.ok(passed, "Acceptance check failed."); };
const reportPath = `production/anmx-003/song-acceptance-${runId}${cleanupRun ? "-cleanup" : ""}.json`;
const save = async () => {
  await mkdir("production/anmx-003", { recursive: true, mode: 0o700 });
  await writeFile(reportPath, JSON.stringify({ runId, environment: "staging", phase, failedPhase, checks, observations, cleanupComplete, cleanupFailures, retainedEvidence: ["administrative_audit", "security_events", "member_access_history"], syntheticAudioOnly: true, existingMembersChanged: false, publicPublication: false, checkedAt: new Date().toISOString() }, null, 2), { mode: 0o600 });
};
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const { CloudflareR2StorageAdapter } = await import("../server/storage/adapters/CloudflareR2StorageAdapter");
  const adapter = new CloudflareR2StorageAdapter();
  const cleanup = async () => {
    phase = "cleanup";
    const attempt = async (name: string, operation: () => Promise<unknown>) => { try { await operation(); } catch { cleanupFailures.push(name); } };
    await attempt("revoke_sessions", () => db.collection("member_sessions").updateMany({ memberId: { $in: memberIds } }, { $set: { status: "revoked", revokedAt: new Date().toISOString(), revocationReason: "isolated_staging_test_completed" } }));
    await attempt("revoke_authorizations", () => db.collection("protected_media_authorizations").updateMany({ memberId: { $in: memberIds } }, { $set: { status: "revoked", revokedAt: new Date().toISOString() } }));
    // Generated IDs and private fixture prefix constrain cleanup, including after a crash.
    const filters: Array<[string, Record<string, unknown>]> = [
      ["song_releases", { releaseId, "metadata.testRunId": runId }], ["media_assets", { assetId, "metadata.testRunId": runId }],
      ["media_storage_objects", { assetId, "metadata.testRunId": runId }], ["content_access_policies", { policyId, "metadata.testRunId": runId }],
      ["content_entitlement_requirements", { contentId: releaseId, "metadata.testRunId": runId }], ["entitlement_definitions", { entitlementKey, "metadata.testRunId": runId }],
      ["member_entitlement_grants", { memberId: { $in: memberIds }, "metadata.testRunId": runId }], ["member_membership_assignments", { memberId: { $in: memberIds }, "metadata.testRunId": runId }],
      ["member_accounts", { memberId: { $in: memberIds }, "metadata.testRunId": runId }], ["member_sessions", { memberId: { $in: memberIds } }],
      ["member_song_usage", { memberId: { $in: memberIds }, releaseId }], ["protected_media_authorizations", { memberId: { $in: memberIds }, resourceId: releaseId }],
      ["protected_playback_sessions", { memberId: { $in: memberIds }, contentId: releaseId }], ["protected_media_resources", { mediaAssetId: assetId, contentId: releaseId }],
    ];
    for (const [collection, filter] of filters) await attempt(collection, async () => {
      await db.collection(collection).deleteMany(filter);
      assert.equal(await db.collection(collection).countDocuments(filter), 0);
    });
    await attempt("private_fixture_object", async () => { await adapter.delete(storagePath); assert.equal((await adapter.fileExists(storagePath)).exists, false); });
    cleanupComplete = cleanupFailures.length === 0;
  };
  if (cleanupRun) { await cleanup(); await save(); }
  else try {
    await save();
    const health = await fetch(`${api}/health/ready`, { redirect: "error", signal: AbortSignal.timeout(30000) }).then(r => r.json());
    check("staging_api_ready", health.data?.environment === "staging" && health.data?.ready === true);
    const publicObject = await db.collection("media_storage_objects").findOne({ provider: "r2", bucket: "anm-media-staging", accessLevel: "public", publicUrl: /^https:\/\/staging-media\.ascendnexusmedia\.com\/public\//, mediaCategory: "image", status: "ready" });
    if (!publicObject) throw new Error("Cannot verify public media mapping.");
    const mappingUrl = new URL(publicObject.publicUrl);
    const originObject = await adapter.fileExists(decodeURIComponent(mappingUrl.pathname.slice(1)));
    const deliveredObject = await fetch(mappingUrl, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000) });
    check("configured_bucket_matches_public_delivery", originObject.exists && Boolean(originObject.metadata?.etag) && deliveredObject.status === 200 && originObject.metadata?.etag === deliveredObject.headers.get("etag")?.replace(/"/g, "") && String(originObject.metadata?.contentLength) === deliveredObject.headers.get("content-length"));
    const artist = await db.collection("artists").findOne({ status: "active", publicationState: "published", publicVisibility: true });
    if (!artist) throw new Error("No existing active artist available for fixture linkage.");
    const now = new Date().toISOString();
    const endsAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const metadata = { testRunId: runId, syntheticFixture: true, expiresAt: endsAt };
    const { passwordService } = await import("../server/services/auth/PasswordService");
    const { defaultMemberPreferences } = await import("../server/models/members/MemberModels");
    const password = randomBytes(32).toString("base64url");
    phase = "create_private_fixtures";
    const audio = Buffer.alloc(16044);
    audio.write("RIFF", 0); audio.writeUInt32LE(audio.length - 8, 4); audio.write("WAVEfmt ", 8); audio.writeUInt32LE(16, 16); audio.writeUInt16LE(1, 20); audio.writeUInt16LE(1, 22); audio.writeUInt32LE(8000, 24); audio.writeUInt32LE(16000, 28); audio.writeUInt16LE(2, 32); audio.writeUInt16LE(16, 34); audio.write("data", 36); audio.writeUInt32LE(16000, 40);
    const storage = await adapter.upload({ storagePath, checksum: createHash("sha256").update(audio).digest("hex"), file: { fieldName: "file", fileName: "synthetic-silence.wav", mimeType: "audio/wav", size: audio.length, buffer: audio }, target: { targetType: "release", targetId: releaseId, assetType: "full_song", intendedUse: "isolated_staging_acceptance", accessLevel: "private", metadata } });
    const signedProbe = await adapter.getSignedUrl(storage, 60, "stream");
    if (!signedProbe) throw new Error("Signed fixture read unavailable.");
    const originRange = await fetch(signedProbe, { redirect: "error", headers: { Range: "bytes=0-43", "Accept-Encoding": "identity" }, signal: AbortSignal.timeout(15000) });
    const originBytes = Buffer.from(await originRange.arrayBuffer());
    observations.originRange = { status: originRange.status, byteLength: originBytes.length, matchesFixtureBytes: originBytes.equals(audio.subarray(0, 44)) };
    check("provider_signed_range_read", originRange.status === 206 && originBytes.equals(audio.subarray(0, 44)));
    const session = client.startSession();
    try { await session.withTransaction(async () => {
      for (const tierKey of tiers) {
        const tier = await db.collection("membership_tiers").findOne({ tierKey, status: "active" }, { session });
        if (!tier) throw new Error("Missing active fixture tier.");
        const memberId = `${prefix}-${tierKey}`;
        await db.collection("member_accounts").insertOne({ memberId, email: `${memberId}@example.invalid`, normalizedEmail: `${memberId}@example.invalid`, displayName: `Isolated staging ${tierKey} test`, membershipTier: "Free Member", status: "Active", emailVerified: true, passwordHash: passwordService.hashPassword(password), preferences: defaultMemberPreferences(), failedLoginCount: 0, metadata: { ...metadata, authorizationVersion: 1 }, createdAt: now, updatedAt: now, schemaVersion: 1 }, { session });
        await db.collection("member_membership_assignments").insertOne({ assignmentId: `${memberId}-assignment`, memberId, tierId: tier.tierId, source: "system", status: "active", startsAt: now, endsAt, metadata, createdAt: now, updatedAt: now, schemaVersion: 1 }, { session });
        await db.collection("member_entitlement_grants").insertOne({ grantId: `${memberId}-fixture-grant`, memberId, entitlementKey, effect: "allow", source: "system", resourceType: "release", resourceId: releaseId, status: "active", startsAt: now, endsAt, reason: "Owner-approved isolated staging acceptance", metadata, createdAt: now, updatedAt: now, schemaVersion: 1 }, { session });
      }
      await db.collection("entitlement_definitions").insertOne({ entitlementId: `${prefix}-entitlement`, entitlementKey, name: "Isolated staging fixture", category: "audio", resourceTypes: ["release"], actions: ["stream", "download"], status: "active", defaultDeny: true, metadata, createdAt: now, updatedAt: now, schemaVersion: 1 }, { session });
      await db.collection("media_storage_objects").insertOne({ ...storage, assetId, metadata: { ...storage.metadata, ...metadata } }, { session });
      await db.collection("media_assets").insertOne({ assetId, ownerType: "release", ownerId: releaseId, assetType: "full_song", title: "Private synthetic silence", status: "draft", assignmentStatus: "assigned", metadata, createdAt: now, updatedAt: now }, { session });
      await db.collection("song_releases").insertOne({ releaseId, songId: `${prefix}-song`, slug: releaseId, title: "Private synthetic staging acceptance", artistId: artist.artistId, status: "published", publicationState: "published", publicVisibility: false, releaseDate: "2026-01-01", metadata: { ...metadata, fullSongAssetId: assetId }, createdAt: now, updatedAt: now }, { session });
      await db.collection("content_access_policies").insertOne({ policyId, policyKey: policyId, name: "Private staging fixture only", version: 1, status: "published", defaultEffect: "deny", rules: [{ ruleId: `${prefix}-allow`, enabled: true, effect: "allow", priority: 1, requiredEntitlements: [entitlementKey] }], downloadPolicy: { enabled: true }, metadata, createdAt: now, updatedAt: now, schemaVersion: 1 }, { session });
      await db.collection("content_entitlement_requirements").insertOne({ requirementId: `${prefix}-requirement`, contentType: "release", contentId: releaseId, policyId, requiredEntitlementKeys: [entitlementKey], accessClassification: "registered_member", teaserEnabled: false, teaserFields: [], streamAssetId: assetId, downloadAssetId: assetId, startsAt: now, endsAt, status: "active", metadata, createdAt: now, updatedAt: now, schemaVersion: 1 }, { session });
    }); } finally { await session.endSession(); }
    async function request(path: string, tier?: string, options: RequestInit = {}) {
      assert.ok(path.startsWith("/api/") && !path.startsWith("//") && !path.includes("://"));
      return fetch(`${api}${path}`, { ...options, redirect: "error", signal: AbortSignal.timeout(60000), headers: { Origin: "https://staging.ascendnexusmedia.com", "X-Auth-Scope": "member", ...(tier ? { Cookie: cookies.get(tier)! } : {}), ...options.headers } });
    }
    const post = (path: string, tier?: string, body: unknown = {}) => request(path, tier, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const streamPath = `/api/member/releases/${releaseId}/stream-authorize`;
    const downloadPath = `/api/member/media/${assetId}/download-authorize`;
    const usage = async (tier: string) => (await (await request(`/api/member/releases/${releaseId}/usage`, tier)).json()).data;
    const authorize = async (tier: string) => { const response = await post(streamPath, tier); return { status: response.status, data: (await response.json()).data }; };
    phase = "privacy_and_authentication";
    check("private_fixture_absent_from_public_detail", (await request(`/api/public/releases/${releaseId}`)).status === 404);
    check("guest_stream_requires_session", (await post(streamPath)).status === 401);
    const privateProbe = await fetch(`https://staging-media.ascendnexusmedia.com/${storagePath}`, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000) });
    check("unsigned_private_object_denied", [403, 404].includes(privateProbe.status));
    for (const tier of tiers) {
      const login = await post("/api/auth/login", undefined, { email: `${prefix}-${tier}@example.invalid`, password });
      check(`${tier}_real_login`, login.status === 200);
      const cookie = login.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
      check(`${tier}_session_cookie`, Boolean(cookie)); cookies.set(tier, cookie);
      await db.collection("member_sessions").updateMany({ memberId: `${prefix}-${tier}`, status: "active" }, { $set: { expiresAt: endsAt, absoluteExpiresAt: endsAt } });
    }
    phase = "free_allowance_and_ranges";
    const free = await authorize("free");
    check("free_initial_authorization", free.status === 200 && free.data?.authorized === true);
    check("issuance_does_not_debit_play", (await usage("free")).streamStarts === 0);
    check("cross_member_token_denied", (await request(free.data.streamEndpoint, "premium")).status === 403);
    const head = await request(free.data.streamEndpoint, "free", { method: "HEAD" });
    check("protected_head_supported", head.status === 200 && head.headers.get("cache-control") === "private, no-store");
    check("head_does_not_debit_play", (await usage("free")).streamStarts === 0);
    const range = await request(free.data.streamEndpoint, "free", { headers: { Range: "bytes=0-43" } });
    const bytes = Buffer.from(await range.arrayBuffer());
    let rangeErrorCode: string | undefined;
    try { const code = JSON.parse(bytes.toString()).code; if (typeof code === "string" && /^[A-Z_]+$/.test(code)) rangeErrorCode = code; } catch { /* Audio responses are not JSON. */ }
    observations.range = { status: range.status, byteLength: bytes.length, expectedByteLength: 44, contentRangeCorrect: range.headers.get("content-range") === `bytes 0-43/${audio.length}`, matchesFixtureBytes: bytes.equals(audio.subarray(0, 44)), rangeErrorCode };
    if (range.status !== 206) {
      const { protectedMediaGatewayService } = await import("../server/services/protectedContent/ProtectedMediaGatewayService");
      const { databaseConnectionService } = await import("../server/database/DatabaseConnectionService");
      const reference = free.data.streamEndpoint.split("/").at(-1)!;
      const diagnostic = createServer((req, res) => { void protectedMediaGatewayService.stream(req, res, reference).catch(() => { if (!res.headersSent) res.writeHead(503); res.end(); }); });
      try {
        await new Promise<void>((resolve, reject) => { diagnostic.once("error", reject); diagnostic.listen(0, "127.0.0.1", resolve); });
        const local = await fetch(`http://127.0.0.1:${(diagnostic.address() as { port: number }).port}/`, { headers: { Cookie: cookies.get("free")!, Range: "bytes=0-43" }, signal: AbortSignal.timeout(60000) });
        const localBytes = Buffer.from(await local.arrayBuffer());
        let code: string | undefined;
        try { const value = JSON.parse(localBytes.toString()).code; if (typeof value === "string" && /^[A-Z_]+$/.test(value)) code = value; } catch { /* Expected audio is not JSON. */ }
        observations.localGatewayComparison = { status: local.status, byteLength: localBytes.length, matchesFixtureBytes: localBytes.equals(audio.subarray(0, 44)), code };
      } finally {
        await new Promise<void>(resolve => diagnostic.close(() => resolve()));
        await databaseConnectionService.disconnect();
      }
    }
    check("range_bytes_and_headers", range.status === 206 && range.headers.get("content-range") === `bytes 0-43/${audio.length}` && bytes.equals(audio.subarray(0, 44)));
    const continuation = await request(free.data.streamEndpoint, "free", { headers: { Range: "bytes=44-99" } });
    await continuation.arrayBuffer();
    check("range_continuation_allowed", continuation.status === 206);
    const freeUsage = await usage("free");
    check("single_debit_and_continuation_summary", freeUsage.streamStarts === 1 && freeUsage.remainingFullPlays === 0 && freeUsage.canContinue === true && freeUsage.canStream === false);
    check("second_free_play_denied", (await authorize("free")).status === 403);
    phase = "paid_tiers_and_downloads";
    const authorized = new Map<string, string>();
    for (const tier of ["premium", "supporter", "vip"]) {
      const value = await authorize(tier);
      check(`${tier}_stream_authorized`, value.status === 200 && value.data?.authorized === true);
      authorized.set(tier, value.data.streamEndpoint);
    }
    check("stream_right_does_not_imply_download", (await post(downloadPath, "premium")).status === 403);
    const download = await post(downloadPath, "vip");
    const downloadData = (await download.json()).data;
    check("vip_separate_download_authorized", download.status === 200 && downloadData?.authorized === true);
    const downloaded = await request(downloadData.downloadEndpoint, "vip");
    const downloadedBytes = Buffer.from(await downloaded.arrayBuffer());
    check("download_bytes_and_cache", downloaded.status === 200 && downloaded.headers.get("cache-control") === "private, no-store" && downloadedBytes.equals(audio) && Boolean(downloaded.headers.get("content-disposition")?.startsWith("attachment;")));
    check("single_use_download_replay_denied", (await request(downloadData.downloadEndpoint, "vip")).status === 403);
    phase = "revocation";
    const freeTier = await db.collection("membership_tiers").findOne({ tierKey: "free", status: "active" });
    await db.collection("member_membership_assignments").updateOne({ memberId: `${prefix}-premium`, "metadata.testRunId": runId }, { $set: { tierId: freeTier!.tierId, updatedAt: new Date().toISOString() } });
    await db.collection("member_accounts").updateOne({ memberId: `${prefix}-premium`, "metadata.testRunId": runId }, { $inc: { "metadata.authorizationVersion": 1 } });
    check("downgrade_rejects_old_stream", (await request(authorized.get("premium")!, "premium")).status === 403);
    await db.collection("member_accounts").updateOne({ memberId: `${prefix}-vip`, "metadata.testRunId": runId }, { $set: { status: "Suspended" } });
    check("suspension_rejects_old_stream", (await request(authorized.get("vip")!, "vip")).status === 403);
    await db.collection("member_membership_assignments").updateOne({ memberId: `${prefix}-supporter`, "metadata.testRunId": runId }, { $set: { endsAt: new Date(Date.now() - 1000).toISOString() } });
    check("expired_membership_rejects_old_full_token", (await request(authorized.get("supporter")!, "supporter")).status === 403);
    await post("/api/auth/logout", "free");
    check("logout_invalidates_session", (await request(`/api/member/releases/${releaseId}/usage`, "free")).status === 401);
    await save();
  } catch { failed = true; failedPhase = phase; }
  finally {
    try { await cleanup(); } catch { failed = true; }
    await save();
    await db.collection("admin_audit_events").insertOne({ auditEventId: `${prefix}-audit`, action: "isolated_staging_song_acceptance", actorId: "approved-maintenance", entityType: "test_run", entityId: runId, summary: failed ? "Isolated staging song acceptance requires review." : "Isolated staging song acceptance completed.", metadata: { environment: "staging", passedChecks: checks.filter(c => c.passed).length, failedChecks: checks.filter(c => !c.passed).length, cleanupComplete, syntheticAudioOnly: true }, createdAt: new Date().toISOString() });
  }
} catch { failed = true; }
finally { await client.close(); }
console.log(JSON.stringify({ environment: "staging", runId, overallStatus: failed || !cleanupComplete ? "blocked" : "pass", phase, failedPhase, checks, observations, cleanupComplete, cleanupFailures, reportPath, realSongPlaysConsumed: false, existingMembershipsChanged: false }));
if (failed || !cleanupComplete) process.exitCode = 1;
