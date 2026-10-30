import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-song-permissions-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { membershipCatalogService } = await import("../server/services/membership/MembershipCatalogService");
const { membershipAssignmentService } = await import("../server/services/membership/MembershipAssignmentService");
const { evaluateSongAction, songUsageService } = await import("../server/services/access/SongUsageService");
const { resolveMemberEntitlements } = await import("../server/services/access/EffectiveEntitlementService");
const { protectedContentDeliveryAuthorizationService: delivery } = await import("../server/services/protectedContent/ProtectedContentDeliveryAuthorizationService");
const { protectedPlaybackSessionService: playback } = await import("../server/services/protectedContent/ProtectedPlaybackSessionService");
const { memberIdentityService } = await import("../server/services/members/MemberIdentityService");
const { handleProtectedContentRoute } = await import("../server/routes/protectedContentRoutes");
const { sendSafeError } = await import("../server/middleware/mediaErrorMiddleware");
const { AuthApiError } = await import("../server/utils/auth/authErrorUtils");
const authenticate = memberIdentityService.authenticateRequest;
const server = createServer(async (request, response) => {
  try { if (!await handleProtectedContentRoute(request, response, new URL(request.url!, "http://localhost"))) { response.writeHead(404); response.end(); } }
  catch (error) { sendSafeError(response, error); }
});
try {
  await membershipCatalogService.ensureDefaultCatalog();
  const now = new Date().toISOString();
  await jsonDatabase.update((data) => {
    for (const tier of ["free", "premium", "supporter", "vip"]) {
      data.memberAccounts.push({ memberId: tier, status: "Active", emailVerified: true, membershipTier: "Free Member", preferences: {}, metadata: { authorizationVersion: 1 }, createdAt: now, updatedAt: now } as never);
      data.memberSessions.push({ sessionId: `session-${tier}`, memberId: tier, status: "active", expiresAt: new Date(Date.now() + 3600000).toISOString(), absoluteExpiresAt: new Date(Date.now() + 3600000).toISOString() } as never);
    }
    data.releaseRecords.push({ releaseId: "release", songId: "song", title: "Synthetic range fixture", slug: "fixture", artistId: "artist", status: "published", publicationState: "published", publicVisibility: true, releaseDate: "2026-01-01", metadata: { fullSongAssetId: "audio" }, createdAt: now, updatedAt: now } as never);
    data.mediaAssets.push({ assetId: "audio", assetType: "full_song", status: "draft", title: "Synthetic bytes", createdAt: now, updatedAt: now } as never);
    data.mediaStorageObjects.push({ storageObjectId: "storage", assetId: "audio", storagePath: "private/song.wav", fileName: "song.wav", mimeType: "audio/wav", fileSizeBytes: 10, provider: "local", accessLevel: "private", status: "ready", mediaCategory: "audio", assetType: "full_song" } as never);
  });
  for (const tier of ["free", "premium", "supporter", "vip"]) await membershipAssignmentService.assignTier(tier, `tier-${tier}`, "admin_grant", "fixture-admin");
  const subject = async (memberId: string) => {
    const member = (await jsonDatabase.read()).memberAccounts.find((item) => item.memberId === memberId)!;
    return { type: "member" as const, member: { ...member, authorizationVersion: Number(member.metadata?.authorizationVersion ?? 1) } as never };
  };
  memberIdentityService.authenticateRequest = async (request) => {
    const id = String(request.headers["x-fixture-member"] ?? "");
    if (!["free", "premium", "supporter", "vip"].includes(id)) throw new AuthApiError("MEMBER_AUTH_REQUIRED", "Member authentication required.", 401);
    return { member: (await subject(id)).member, sessionId: `session-${id}` } as never;
  };
  await mkdir(join(root, "private"), { recursive: true });
  await writeFile(join(root, "private/song.wav"), "0123456789");
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = (endpoint: string, memberId: string, options: RequestInit = {}) => fetch(`${base}${endpoint}`, { ...options, headers: { "x-fixture-member": memberId, ...(options.headers ?? {}) } });
  const authorize = async (id: string) => delivery.authorizeReleaseStream(await subject(id), { releaseSlugOrId: "fixture", sessionId: `session-${id}` });
  for (const tier of ["free", "premium", "supporter", "vip"]) {
    const decision = evaluateSongAction(await jsonDatabase.read(), tier, "release", "stream");
    assert.equal(decision.allowed, true);
    assert.equal(decision.mode, tier === "free" ? "single_play" : "unlimited");
    assert.equal(evaluateSongAction(await jsonDatabase.read(), tier, "release", "download").allowed, false, "No tier may download without song enablement");
  }
  const free = await authorize("free");
  assert.equal(free.authorized, true);
  const endpoint = "streamEndpoint" in free ? free.streamEndpoint! : "";
  assert.equal((await songUsageService.summary("free", "fixture")).streamStarts, 0, "Issuance must not consume a play");
  assert.equal((await request(endpoint, "free", { method: "HEAD" })).status, 200);
  assert.equal((await jsonDatabase.read()).memberSongUsage.length, 0, "HEAD must not consume a play");
  assert.equal((await request(endpoint, "premium")).status, 403, "Authorizations must be member-bound");
  const withoutCatalogClone = async <T>(run: () => Promise<T>) => {
    const clone = globalThis.structuredClone;
    globalThis.structuredClone = ((value: unknown, options?: StructuredSerializeOptions) => {
      assert.ok(!value || typeof value !== "object" || !("releaseRecords" in value && "memberAccounts" in value), "Gateway accounting must not clone the complete catalog snapshot.");
      return clone(value, options);
    }) as typeof structuredClone;
    try { return await run(); } finally { globalThis.structuredClone = clone; }
  };
  const bytes = await withoutCatalogClone(() => request(endpoint, "free", { headers: { Range: "bytes=2-4" } }));
  assert.equal(bytes.status, 206);
  assert.equal(await bytes.text(), "234");
  assert.equal(bytes.headers.get("content-range"), "bytes 2-4/10");
  assert.equal(bytes.headers.get("cache-control"), "private, no-store");
  const suffix = await request(endpoint, "free", { headers: { Range: "bytes=-2" } });
  assert.equal(await suffix.text(), "89");
  assert.equal((await request(endpoint, "free", { headers: { Range: "bytes=0-1,4-5" } })).status, 416);
  const usage = await songUsageService.summary("free", "fixture", "session-free");
  assert.equal(usage.streamStarts, 1);
  assert.equal(usage.remainingFullPlays, 0);
  assert.equal(usage.canContinue, true);
  assert.equal(usage.canStream, false);
  assert.equal((await jsonDatabase.read()).memberAccessHistory.filter(item => item.memberId === "free" && item.action === "song_stream_started").length, 1, "First byte delivery must persist one safe access-history record, not one per range.");
  assert.equal((await authorize("free")).authorized, false);
  const firstAuth = (await jsonDatabase.read()).protectedMediaAuthorizations.find((item) => item.memberId === "free")!;
  await jsonDatabase.update((data) => { const record = data.protectedMediaAuthorizations.find((item) => item.authorizationId === firstAuth.authorizationId)!; record.issuedAt = new Date(Date.now() - 290000).toISOString(); record.expiresAt = new Date(Date.now() + 10000).toISOString(); });
  const refresh = await withoutCatalogClone(() => request("/api/member/media/stream-refresh", "free", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ authorizationReference: decodeURIComponent(endpoint.split("/").at(-1)!) }) }));
  assert.equal(refresh.status, 200);
  assert.ok(Date.parse((await refresh.json() as { data: { expiresAt: string } }).data.expiresAt) > Date.now() + 200000);
  assert.equal((await songUsageService.summary("free", "fixture")).streamStarts, 1, "Refresh must not consume another play");
  await assert.rejects(() => playback.create({ memberId: "premium", sessionId: "session-premium", mediaAssetId: "audio", contentId: "release", authorizationId: firstAuth.authorizationId }), /unavailable/);
  const activePlayback = (await jsonDatabase.read()).protectedPlaybackSessions.find((item) => item.authorizationId === firstAuth.authorizationId)!;
  await assert.rejects(() => playback.create({ memberId: "free", sessionId: "session-free", mediaAssetId: "audio", contentId: "release", authorizationId: firstAuth.authorizationId }), /already exists/);
  await playback.update(activePlayback.playbackSessionId, "free", "completed", "session-free");
  await assert.rejects(() => playback.update(activePlayback.playbackSessionId, "free", "playing", "session-free"), /unavailable/);
  const premium = await authorize("premium");
  const premiumEndpoint = "streamEndpoint" in premium ? premium.streamEndpoint! : "";
  await membershipAssignmentService.assignTier("premium", "tier-free", "admin_grant", "fixture-admin");
  assert.equal((await request(premiumEndpoint, "premium")).status, 403, "Downgrade must revoke old delivery");
  await jsonDatabase.update((data) => { data.releaseRecords[0].metadata!.downloadEnabled = true; });
  assert.equal(evaluateSongAction(await jsonDatabase.read(), "free", "release", "download").allowed, false);
  const download = await delivery.authorizeDownload(await subject("vip"), { mediaId: "audio", sessionId: "session-vip" });
  assert.equal(download.authorized, true);
  const downloadEndpoint = "downloadEndpoint" in download ? download.downloadEndpoint! : "";
  assert.equal((await request(downloadEndpoint, "vip", { method: "HEAD" })).status, 200);
  assert.equal((await request(downloadEndpoint, "vip")).status, 200);
  assert.equal((await request(downloadEndpoint, "vip")).status, 403);
  assert.equal((await songUsageService.summary("vip", "fixture")).downloadStarts, 1);
  const rollbackAuthorization = await authorize("vip");
  const beforeRollback = structuredClone(await jsonDatabase.read());
  await jsonDatabase.update(data => { data.memberAccessHistory = null as never; });
  try {
    const rejectedAccounting = await request("streamEndpoint" in rollbackAuthorization ? rollbackAuthorization.streamEndpoint! : "", "vip");
    assert.equal(rejectedAccounting.status, 503);
    const afterRollback = await jsonDatabase.read();
    assert.deepEqual(afterRollback.memberSongUsage, beforeRollback.memberSongUsage, "Late accounting failure must not leak usage changes to the local cache.");
    assert.deepEqual(afterRollback.protectedMediaAuthorizations, beforeRollback.protectedMediaAuthorizations, "Late accounting failure must not consume an authorization.");
  } finally { await jsonDatabase.update(data => { data.memberAccessHistory = beforeRollback.memberAccessHistory; }); }
  const snapshot = structuredClone(await jsonDatabase.read());
  for (const status of ["PendingVerification", "Locked", "Disabled", "Suspended", "Deleted"] as const) {
    const data = structuredClone(snapshot); data.memberAccounts.find((item) => item.memberId === "vip")!.status = status;
    assert.equal(evaluateSongAction(data, "vip", "release", "stream").allowed, false);
  }
  const scoped = structuredClone(snapshot);
  scoped.memberEntitlementGrants.push({ grantId: "scoped", memberId: "free", entitlementKey: "audio.download", effect: "allow", status: "active", startsAt: "2026-01-01", resourceType: "release", resourceId: "another", reason: "Fixture" } as never);
  assert.equal(resolveMemberEntitlements(scoped, "free").allowed.includes("audio.download"), false);
  assert.equal(evaluateSongAction(scoped, "free", "release", "download").allowed, false);
  scoped.memberEntitlementGrants[0].resourceId = "release";
  assert.equal(evaluateSongAction(scoped, "free", "release", "download").allowed, true);
  scoped.memberEntitlementGrants.push({ ...scoped.memberEntitlementGrants[0], grantId: "deny", effect: "deny" });
  assert.equal(evaluateSongAction(scoped, "free", "release", "download").allowed, false);
  const embargo = structuredClone(snapshot); embargo.releaseRecords[0].metadata!.embargoUntil = "2999-01-01";
  assert.equal(evaluateSongAction(embargo, "vip", "release", "stream").allowed, false);
  const draft = structuredClone(snapshot); draft.releaseRecords[0].status = "draft";
  assert.equal(evaluateSongAction(draft, "vip", "release", "stream").allowed, false);
  const protectedSong = structuredClone(snapshot);
  protectedSong.contentAccessPolicies.push({ policyId: "fixture-policy", status: "published", defaultEffect: "deny", rules: [{ ruleId: "allow", enabled: true, priority: 1, effect: "allow", requiredEntitlements: [] }] } as never);
  protectedSong.contentEntitlementRequirements.push({ requirementId: "fixture-requirement", contentType: "release", contentId: "release", status: "active", policyId: "fixture-policy", accessClassification: "premium_member", requiredEntitlementKeys: ["content.premium.view"], streamAssetId: "audio" } as never);
  assert.equal(evaluateSongAction(protectedSong, "free", "release", "stream").allowed, false, "Included plays do not bypass exclusive content requirements");
  assert.equal(evaluateSongAction(protectedSong, "vip", "release", "stream").allowed, true);
  protectedSong.contentAccessPolicies[0].status = "draft";
  assert.equal(evaluateSongAction(protectedSong, "vip", "release", "stream").allowed, false);
  const denied = structuredClone(snapshot);
  denied.memberEntitlementGrants.push({ grantId: "full-deny", memberId: "vip", entitlementKey: "audio.stream.full", effect: "deny", status: "active", startsAt: "2026-01-01", reason: "Fixture" } as never);
  assert.equal(evaluateSongAction(denied, "vip", "release", "stream").allowed, false);
  const quota = structuredClone(snapshot);
  quota.tierEntitlementGrants.find((item) => item.tierId === "tier-vip" && item.entitlementKey === "audio.download")!.quota = { maximum: 1 };
  assert.equal(evaluateSongAction(quota, "vip", "release", "download").allowed, false, "Unsupported quota cannot authorize unlimited delivery");
  const mediaDeny = structuredClone(snapshot);
  mediaDeny.accessOverrides.push({ overrideId: "media-deny", scopeType: "media", scopeId: "audio", subjectType: "all_authenticated", effect: "deny", startsAt: "2026-01-01", status: "active", reason: "Fixture" } as never);
  assert.equal(evaluateSongAction(mediaDeny, "vip", "release", "stream").allowed, false);
  const changedMode = structuredClone(snapshot);
  changedMode.protectedMediaAuthorizations.push({ authorizationId: "old-full", memberId: "free-race", resourceId: "release", action: "stream", entitlementKey: "audio.stream.full", status: "active", useCount: 1 } as never);
  changedMode.memberAccounts.push({ ...changedMode.memberAccounts.find((item) => item.memberId === "free")!, memberId: "free-race" });
  changedMode.memberMembershipAssignments.push({ ...changedMode.memberMembershipAssignments.find((item) => item.memberId === "free" && item.status === "active")!, memberId: "free-race", assignmentId: "mode-fixture" });
  assert.equal(evaluateSongAction(changedMode, "free-race", "release", "stream", "old-full").allowed, false, "A formerly unlimited token cannot silently become a Free allowance token");
  const expired = structuredClone(snapshot);
  const optionalNull = structuredClone(snapshot);
  optionalNull.memberMembershipAssignments.find((item) => item.memberId === "vip" && item.status === "active")!.endsAt = null as never;
  assert.equal(evaluateSongAction(optionalNull, "vip", "release", "stream").allowed, true, "Persisted null optional expiry means no expiry, not an invalid assignment");
  const vipAssignment = expired.memberMembershipAssignments.find((item) => item.memberId === "vip" && item.status === "active")!;
  vipAssignment.startsAt = "2026-01-01"; vipAssignment.endsAt = "2026-01-02";
  assert.equal(evaluateSongAction(expired, "vip", "release", "stream").mode, "single_play", "Expired paid membership falls back to configured Free access");
  await jsonDatabase.update((data) => {
    const freeMember = structuredClone(data.memberAccounts.find((item) => item.memberId === "free")!);
    freeMember.memberId = "free-race";
    data.memberAccounts.push(freeMember);
    data.memberSessions.push({ ...data.memberSessions.find((item) => item.memberId === "free")!, sessionId: "session-free-race", memberId: "free-race" });
  });
  await membershipAssignmentService.assignDefaultFreeTier("free-race");
  const realFixtureAuth = memberIdentityService.authenticateRequest;
  memberIdentityService.authenticateRequest = async (req) => req.headers["x-fixture-member"] === "free-race" ? { member: (await subject("free-race")).member, sessionId: "session-free-race" } as never : realFixtureAuth(req);
  const raceOne = await authorize("free-race");
  const raceTwo = await authorize("free-race");
  const raceResponses = await Promise.all([raceOne, raceTwo].map((item) => request("streamEndpoint" in item ? item.streamEndpoint! : "", "free-race")));
  assert.deepEqual(raceResponses.map((response) => response.status).sort(), [200, 403]);
  assert.equal((await songUsageService.summary("free-race", "fixture")).streamStarts, 1);
  const { backendStorageProviderRegistry } = await import("../server/storage/StorageProviderRegistry");
  const originalProvider = backendStorageProviderRegistry.getActiveProvider;
  const originalFetch = globalThis.fetch;
  try {
    await jsonDatabase.update((data) => { data.mediaStorageObjects[0].provider = "r2"; });
    backendStorageProviderRegistry.getActiveProvider = () => ({ getProviderName: () => "r2", getSignedUrl: async () => "https://fixture-storage.invalid/private-source?signature=synthetic" }) as never;
    globalThis.fetch = async (input, options) => {
      if (String(input).startsWith("https://fixture-storage.invalid/")) {
        assert.equal(options?.redirect, "error");
        assert.equal(new Headers(options?.headers).get("range"), "bytes=3-5");
        return new Response("345", { status: 206, headers: { "Content-Length": "3", "Content-Range": "bytes 3-5/10" } });
      }
      return originalFetch(input, options);
    };
    const remote = await authorize("vip");
    const response = await request("streamEndpoint" in remote ? remote.streamEndpoint! : "", "vip", { headers: { Range: "bytes=3-5" } });
    assert.equal(response.status, 206);
    assert.equal(await response.text(), "345");
    assert.equal(response.headers.get("location"), null);
    for (const upstreamStatus of [403, 206]) {
      let cancelled = false;
      globalThis.fetch = async (input, options) => {
        if (String(input).startsWith("https://fixture-storage.invalid/")) return new Response(new ReadableStream({ cancel() { cancelled = true; } }), {
          status: upstreamStatus, headers: { "Content-Length": "999", "Content-Range": "bytes 0-998/999" },
        });
        return originalFetch(input, options);
      };
      const beforeFailure = (await songUsageService.summary("vip", "fixture")).streamStarts;
      const failedAuthorization = await authorize("vip");
      const rejected = await request("streamEndpoint" in failedAuthorization ? failedAuthorization.streamEndpoint! : "", "vip", { headers: { Range: "bytes=3-5" } });
      assert.equal(rejected.status, 502);
      assert.equal(rejected.headers.get("cache-control"), "private, no-store");
      assert.equal((await rejected.json() as { code: string }).code, "PROTECTED_MEDIA_NOT_READY");
      assert.equal(cancelled, true, "Rejected upstream bodies must be cancelled before Node stream conversion.");
      assert.equal((await songUsageService.summary("vip", "fixture")).streamStarts, beforeFailure, "Rejected upstream must not consume a play.");
    }
  } finally { globalThis.fetch = originalFetch; backendStorageProviderRegistry.getActiveProvider = originalProvider; }
  await jsonDatabase.update((data) => { data.mediaStorageObjects[0].provider = "local"; });
  const liveBeforeTakedown = await authorize("vip");
  const liveEndpoint = "streamEndpoint" in liveBeforeTakedown ? liveBeforeTakedown.streamEndpoint! : "";
  const { protectedContentTakedownService } = await import("../server/services/protectedContent/ProtectedContentTakedownService");
  await protectedContentTakedownService.disableResource("media", "audio", "Synthetic fixture takedown", "fixture-admin");
  assert.equal((await request(liveEndpoint, "vip")).status, 403);
  assert.equal((await authorize("vip")).authorized, false);
  await protectedContentTakedownService.restoreResource("media", "audio", "fixture-admin");
  assert.equal((await authorize("vip")).authorized, true);
  assert.equal((await request("/api/member/releases/fixture/usage", "unknown")).status, 401);
  const summary = await request("/api/member/releases/fixture/usage", "vip");
  assert.equal(summary.status, 200);
  assert.equal(summary.headers.get("cache-control"), "private, no-store");
  assert.ok(!/storagePath|private\/|authorizationToken|sessionIdHash|streamEndpoint/.test(await summary.text()));
  console.log("Song permission tests passed: all four consumer tiers, account states, first-delivery quota, HEAD/ranges, member binding, downgrade, separate single-use downloads, scoped grants, embargo, safe summary and playback status. Synthetic bytes only; no real listens or staging data.");
} finally {
  memberIdentityService.authenticateRequest = authenticate;
  await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  await rm(root, { recursive: true, force: true });
}
