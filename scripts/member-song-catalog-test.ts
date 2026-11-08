import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = await mkdtemp(join(tmpdir(), "anmx-member-catalog-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { membershipCatalogService } = await import("../server/services/membership/MembershipCatalogService");
const { membershipAssignmentService } = await import("../server/services/membership/MembershipAssignmentService");
const { memberSongCatalogService: catalog } = await import("../server/services/memberPortal/MemberSongCatalogService");
const { memberDashboardService: dashboard } = await import("../server/services/memberPortal/MemberDashboardService");
const { memberRecommendationService } = await import("../server/services/memberPortal/MemberRecommendationService");
const { publicContentDeliveryService } = await import("../server/services/public/PublicContentDeliveryService");
const { memberIdentityService } = await import("../server/services/members/MemberIdentityService");
const { handleMemberPortalRoute } = await import("../server/routes/memberPortalRoutes");
const originalPublic = publicContentDeliveryService.listPublicReleases;
const originalAuth = memberIdentityService.authenticateRequest;
try {
  await membershipCatalogService.ensureDefaultCatalog();
  await jsonDatabase.update(data => {
    data.memberAccounts.push({ memberId: "vip", status: "Active", emailVerified: true, metadata: { authorizationVersion: 1 } } as never);
    for (let i = 0; i < 39; i++) data.releaseRecords.push({ releaseId: `release-${i}`, songId: `song-${i}`, slug: `song-${i}`, title: `Song ${i}`, artistId: "artist", genre: "Rock", status: "published", publicationState: "published", publicVisibility: false, releaseDate: "2026-01-01", featured: false, metadata: { fullSongAssetId: "private-audio", privateObjectKey: "secret" } } as never);
    data.contentAccessPolicies.push({ policyId: "policy", status: "published", defaultEffect: "deny", rules: [{ ruleId: "allow", enabled: true, priority: 1, effect: "allow", requiredEntitlements: [] }] } as never);
    for (const release of data.releaseRecords) data.contentEntitlementRequirements.push({ requirementId: release.releaseId, contentType: "release", contentId: release.releaseId, status: "active", policyId: "policy", accessClassification: "vip", requiredEntitlementKeys: ["content.vip.view"], streamAssetId: "private-audio" } as never);
  });
  await membershipAssignmentService.assignTier("vip", "tier-vip", "admin_grant", "fixture-admin");
  publicContentDeliveryService.listPublicReleases = async () => [];
  const data = structuredClone(await jsonDatabase.read());
  const member = { ...data.memberAccounts[0], preferences: { privacy: { showFavorites: false } } } as never;
  const catalogPayload = await catalog.getCatalog("vip");
  assert.equal(catalogPayload.releases.length, 39);
  assert.equal(catalogPayload.artists.length, 1, "Missing public artist must not discard eligible member songs");
  assert.equal((await catalog.getDetail("vip", "song-38")).song.releaseId, "release-38");
  await assert.rejects(() => catalog.getDetail("vip", "not-published"), /unavailable/);
  assert.ok(!/private-audio|privateObjectKey|secret|streamEndpoint/.test(JSON.stringify(catalogPayload)));
  const { ReleaseCatalogService } = await import("../src/services/ReleaseCatalogService");
  const { memberSongCatalogApiService } = await import("../src/services/member/MemberSongCatalogApiService");
  const { publicMediaApiClient } = await import("../src/services/public/PublicMediaApiClient");
  const originalFetch = globalThis.fetch;
  const originalArtists = publicMediaApiClient.listArtists;
  const originalReleases = publicMediaApiClient.listReleases;
  try {
    let memberRequests = 0;
    globalThis.fetch = async (input, init) => {
      memberRequests++;
      assert.equal(init?.credentials, "include");
      assert.equal(init?.cache, "no-store");
      assert.equal(new Headers(init?.headers).get("x-auth-scope"), "member");
      const path = String(input);
      assert.ok(path.startsWith("/api/member/songs"));
      return new Response(JSON.stringify({ success: true, data: path === "/api/member/songs" ? catalogPayload : await catalog.getDetail("vip", decodeURIComponent(path.split("/").at(-1)!)) }), { status: 200 });
    };
    publicMediaApiClient.listArtists = async () => { throw new Error("Member catalog must not use public artists"); };
    publicMediaApiClient.listReleases = async () => { throw new Error("Member catalog must not use public releases"); };
    const client = new ReleaseCatalogService();
    const all = await client.getCatalogData(true);
    assert.equal(all.releases.length, 39);
    assert.equal(all.genreCounts.Rock, 39);
    assert.equal(client.filterCatalogReleases(all.releases, { query: "Song 38" }).length, 1);
    // Restore server decoration mock before the detail call in this in-process transport.
    publicContentDeliveryService.listPublicReleases = async () => [];
    assert.equal((await memberSongCatalogApiService.detail("song-38")).song.releaseId, "release-38");
    const beforeGuest = memberRequests;
    publicMediaApiClient.listArtists = async () => catalogPayload.artists;
    publicMediaApiClient.listReleases = async () => catalogPayload.releases.slice(0, 2);
    assert.equal((await client.getCatalogData()).releases.length, 2);
    assert.equal(memberRequests, beforeGuest, "Guest catalog must not call member APIs");
    globalThis.fetch = async () => new Response(JSON.stringify({ success: false }), { status: 403 });
    await assert.rejects(() => client.getCatalogData(true), /unavailable/);
    await assert.rejects(() => memberSongCatalogApiService.detail("song-38"), /unavailable/);
  } finally { globalThis.fetch = originalFetch; publicMediaApiClient.listArtists = originalArtists; publicMediaApiClient.listReleases = originalReleases; }
  assert.equal((await catalog.list("vip")).length, 39, "All eligible nonfeatured, nonpublic records must be discoverable");
  assert.equal((await dashboard.getRecentReleases(8, member)).length, 8);
  assert.equal((await memberRecommendationService.getRecommendations(member)).length, 6);
  assert.ok((await dashboard.getExclusiveContent(member)).every(card => card.streamAvailable && !card.downloadAvailable));
  assert.ok(!/private-audio|privateObjectKey|secret|streamEndpoint/.test(JSON.stringify(await catalog.list("vip"))));
  for (const mutate of [
    (d: typeof data) => { d.releaseRecords[0].status = "draft"; },
    (d: typeof data) => { d.releaseRecords[0].publicationState = "draft"; },
    (d: typeof data) => { d.releaseRecords[0].publicationState = "ready_to_publish"; },
    (d: typeof data) => { d.releaseRecords[0].deletedAt = "2026-01-01"; },
    (d: typeof data) => { d.releaseRecords[0].metadata!.embargoUntil = "2999-01-01"; },
    (d: typeof data) => { d.releaseRecords[0].metadata!.embargoUntil = "invalid"; },
    (d: typeof data) => { d.contentEntitlementRequirements[0].accessClassification = "private"; },
    (d: typeof data) => { d.contentEntitlementRequirements[0].endsAt = "2020-01-01"; },
    (d: typeof data) => { d.accessOverrides.push({ overrideId: "deny", status: "active", scopeType: "release", scopeId: "release-0", subjectType: "member", subjectId: "vip", effect: "deny", entitlementKey: "audio.stream.full" } as never); },
    (d: typeof data) => { d.protectedContentTakedowns.push({ resourceType: "release", resourceId: "release-0", status: "active" } as never); },
  ]) {
    const changed = structuredClone(data); mutate(changed);
    assert.equal(catalog.project(changed, "vip").length, 38);
    assert.ok(!catalog.project(changed, "vip").some(card => card.contentId === "release-0"));
  }
  for (const mutate of [
    (d: typeof data) => { d.memberAccounts[0].emailVerified = false; },
    (d: typeof data) => { d.memberAccounts[0].status = "Suspended"; },
    (d: typeof data) => { d.contentAccessPolicies[0].status = "draft"; },
    (d: typeof data) => { d.contentAccessPolicies[0].rules[0].effect = "deny"; },
    (d: typeof data) => { d.memberMembershipAssignments[0].tierId = "tier-free"; },
  ]) { const changed = structuredClone(data); mutate(changed); assert.equal(catalog.project(changed, "vip").length, 0); }
  const free = structuredClone(data);
  free.memberMembershipAssignments[0].tierId = "tier-free";
  for (const requirement of free.contentEntitlementRequirements) { requirement.accessClassification = "free_member"; requirement.requiredEntitlementKeys = []; }
  free.memberSongUsage.push({ usageId: "used", memberId: "vip", songId: "song-0", releaseId: "release-0", streamStarts: 1, downloadStarts: 0, freePlayUsed: true, freeAuthorizationId: "previous-delivery" } as never);
  const exhausted = catalog.project(free, "vip").find(card => card.contentId === "release-0");
  assert.ok(exhausted, "An exhausted included play must not erase a song from discovery");
  assert.equal(exhausted.streamAvailable, false);
  assert.equal(exhausted.downloadAvailable, false);
  memberIdentityService.authenticateRequest = async () => ({ member } as never);
  for (const path of ["/api/member/songs", "/api/member/releases"]) {
    const headers = new Map<string, unknown>();
    let payload = "";
    const response = { setHeader: (key: string, value: unknown) => headers.set(key.toLowerCase(), value), getHeader: (key: string) => headers.get(key.toLowerCase()),
      writeHead: (status: number, values: Record<string, unknown>) => { assert.equal(status, 200); for (const [key, value] of Object.entries(values)) headers.set(key.toLowerCase(), value); },
      end: (body: string) => { payload = body; } };
    assert.equal(await handleMemberPortalRoute({ method: "GET" } as never, response as never, new URL(path, "http://localhost")), true);
    assert.equal(JSON.parse(payload).data.items.length, 39);
    assert.equal(JSON.parse(payload).data.releases.length, 39);
    assert.match(String(headers.get("cache-control")), /private, no-store/);
    assert.equal(headers.get("x-robots-tag"), "noindex, nofollow");
  }
  let detailBody = "";
  const detailHeaders = new Map<string, unknown>();
  const detailResponse = { setHeader: (key: string, value: unknown) => detailHeaders.set(key.toLowerCase(), value), getHeader: () => undefined,
    writeHead: (status: number, values: Record<string, unknown>) => { assert.equal(status, 200); for (const [key, value] of Object.entries(values)) detailHeaders.set(key.toLowerCase(), value); },
    end: (body: string) => { detailBody = body; } };
  assert.equal(await handleMemberPortalRoute({ method: "GET" } as never, detailResponse as never, new URL("http://localhost/api/member/songs/song-38")), true);
  assert.equal(JSON.parse(detailBody).data.song.releaseId, "release-38");
  assert.match(String(detailHeaders.get("cache-control")), /private, no-store/);
  await jsonDatabase.update(d => { d.releaseRecords.find(release => release.releaseId === "release-38")!.status = "draft"; });
  await assert.rejects(() => catalog.getDetail("vip", "song-38"), /unavailable/, "Detail must recheck publication, not serve a cached catalog record");
  memberIdentityService.authenticateRequest = async () => { throw new Error("Authentication required"); };
  await assert.rejects(() => handleMemberPortalRoute({ method: "GET" } as never, { setHeader() {} } as never, new URL("http://localhost/api/member/songs")), /Authentication required/);
  console.log("Member song catalog tests passed: 39 records through frontend catalog service, protected detail, guest isolation, no fallback on denial, filters/counts, bounded dashboard, publication/policy/account/embargo exclusions, authenticated no-store routes.");
} finally {
  publicContentDeliveryService.listPublicReleases = originalPublic;
  memberIdentityService.authenticateRequest = originalAuth;
  await rm(root, { recursive: true, force: true });
}
