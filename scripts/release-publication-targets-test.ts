import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = await mkdtemp(join(tmpdir(), "anmx-publication-targets-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
try {
  const { AdminReleaseService } = await import("../server/services/releases/AdminReleaseService");
  const { releaseRepository } = await import("../server/repositories/ReleaseRepository");
  const { releaseValidationService } = await import("../server/services/releases/ReleaseValidationService");
  const { mediaAuditPersistenceService } = await import("../server/services/media/MediaAuditPersistenceService");
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const service = new AdminReleaseService();
  let record = { releaseId: "target-fixture", songId: "song-fixture", artistId: "artist-fixture", title: "Fixture", slug: "fixture", releaseDate: "2026-01-01", genre: "Test", styleTags: [], externalLinks: {}, status: "draft", publicationState: "draft", publicVisibility: false, featured: false, metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), schemaVersion: 1 } as import("../server/models/releases/SongReleaseModel").SongReleaseRecord;
  releaseRepository.findById = async () => record;
  releaseRepository.update = async (_id, patch) => { record = { ...record, ...patch }; return record; };
  releaseValidationService.buildValidationResult = async () => ({ valid: true, blockingIssues: [], missingFields: [], warnings: [], fieldErrors: {}, checkedAt: new Date().toISOString() });
  mediaAuditPersistenceService.record = async () => undefined as never;
  service.getReleaseReadiness = async () => ({ ready: true }) as never;
  Object.assign(service, { publishReadyArtistDependency: async () => undefined, promoteReleaseMedia: async () => ({}) });
  for (const audience of ["public", "free", "premium", "supporter", "vip"]) {
    record.metadata = { publicationAudience: audience, publicationHomepage: false, publicationNewReleases: true };
    await service.publishRelease(record.releaseId, "fixture-admin");
    assert.equal(record.publicVisibility, audience === "public");
    assert.equal(record.publicationState, "published");
    assert.equal(record.metadata.publicationHomepage, false);
    assert.equal(record.metadata.publicationNewReleases, true);
  }
  record.metadata = {};
  await service.publishRelease(record.releaseId, "fixture-admin");
  assert.equal(record.publicVisibility, true, "Absent legacy fields retain prior behavior");
  for (const metadata of [{ publicationAudience: "unknown" }, { publicationAudience: "__proto__" }, { publicationHomepage: "true" }, { publicationNewReleases: null }]) {
    record.metadata = metadata;
    await assert.rejects(service.publishRelease(record.releaseId, "fixture-admin"), /invalid/i);
  }
  record.metadata = { publicationAudience: "public", preserved: "keep" };
  record.status = "published";
  record.publicationState = "published";
  await jsonDatabase.update(data => {
    data.protectedMediaAuthorizations.push({ authorizationId: "fixture-auth", resourceId: record.releaseId, status: "active" } as never);
    data.protectedPlaybackSessions.push({ playbackSessionId: "fixture-playback", contentId: record.releaseId, status: "playing" } as never);
  });
  await service.updateRelease(record.releaseId, { metadata: { publicationAudience: "vip", publicationHomepage: true, publicationNewReleases: false } }, "fixture-admin");
  assert.equal(record.publicationState, "ready_to_publish", "Changing targets does not publish the draft");
  assert.equal(record.metadata?.preserved, "keep");
  const data = await jsonDatabase.read();
  assert.equal(data.protectedMediaAuthorizations[0].status, "revoked");
  assert.equal(data.protectedPlaybackSessions[0].status, "revoked");
  await assert.rejects(service.updateRelease(record.releaseId, { metadata: { publicationAudience: "administrator" } }), /valid publication audience/i);
  const { PublicContentCacheService } = await import("../server/services/public/PublicContentCacheService");
  const { MemberPortalCacheService } = await import("../server/services/memberPortal/MemberPortalCacheService");
  const publicCache = new PublicContentCacheService();
  let finish!: (value: string) => void;
  const pending = publicCache.getOrSet("public:releases:test", () => new Promise<string>(resolve => { finish = resolve; }));
  publicCache.deleteByPattern("public:releases");
  finish("old-public-result");
  await pending;
  assert.equal(publicCache.get("public:releases:test"), undefined);
  const memberCache = new MemberPortalCacheService();
  const memberPending = memberCache.getOrSet("member:test:dashboard", () => new Promise<string>(resolve => { finish = resolve; }));
  memberCache.clear();
  finish("old-member-result");
  await memberPending;
  assert.equal(await memberCache.getOrSet("member:test:dashboard", async () => "fresh-result"), "fresh-result");
  console.log("Publication target persistence passed: all audiences, legacy defaults, malformed rejection, placement preservation, draft state and authorization revocation. Isolated stubs; no real publication.");
} finally {
  await rm(root, { recursive: true, force: true });
}
