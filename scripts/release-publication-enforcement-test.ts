import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseReleasePublicationTargets as parse } from "../server/utils/publication/releasePublicationTargets";

const root = await mkdtemp(join(tmpdir(), "release-enforcement-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_STORAGE_PROVIDER: "local", MEDIA_STORAGE_LOCAL_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
try {
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const { membershipCatalogService } = await import("../server/services/membership/MembershipCatalogService");
  const { membershipAssignmentService } = await import("../server/services/membership/MembershipAssignmentService");
  const { evaluateSongAction } = await import("../server/services/access/SongUsageService");
  const { releaseRepository } = await import("../server/repositories/ReleaseRepository");
  const { publicReleaseRepository } = await import("../server/repositories/public/PublicReleaseRepository");
  const { publicReleaseService } = await import("../server/services/public/PublicReleaseService");
  const { publicContentDeliveryService: delivery } = await import("../server/services/public/PublicContentDeliveryService");
  assert.deepEqual(parse(undefined), { audience: "public", homepage: true, newReleases: true });
  assert.deepEqual(parse({ publicationAudience: "vip", publicationHomepage: false }), { audience: "vip", homepage: false, newReleases: true });
  for (const invalid of [null, [], "public", { publicationAudience: "VIP" }, { publicationAudience: "toString" }, { publicationAudience: null }, { publicationHomepage: "false" }, { publicationNewReleases: 0 }]) assert.equal(parse(invalid), null);
  await membershipCatalogService.ensureDefaultCatalog();
  await jsonDatabase.update(data => {
    data.artistRecords.push({ artistId: "artist", name: "Fixture", displayName: "Fixture", slug: "fixture", status: "active", publicationState: "published", publicVisibility: true, sortOrder: 0, genres: [], styleTags: [], externalLinks: {} } as never);
    for (const tier of ["free", "premium", "supporter", "vip"]) data.memberAccounts.push({ memberId: tier, status: "Active", emailVerified: true, metadata: { authorizationVersion: 1 } } as never);
    for (const [id, metadata] of Object.entries({ legacy: {}, hiddenHome: { publicationHomepage: false }, hiddenLatest: { publicationNewReleases: false }, free: { publicationAudience: "free" }, premium: { publicationAudience: "premium" }, supporter: { publicationAudience: "supporter" }, vip: { publicationAudience: "vip" }, invalid: { publicationAudience: "invalid" }, badPlacement: { publicationHomepage: "true" } })) {
      data.releaseRecords.push({ releaseId: id, songId: id, title: id, slug: id, artistId: "artist", status: "published", publicationState: "published", publicVisibility: true, releaseDate: "2020-01-01", featured: true, featuredPlacement: "homepage", genre: "Rock", styleTags: [], externalLinks: {}, metadata: { ...metadata, fullSongAssetId: "private-source", privateObjectKey: "private/secret" } } as never);
    }
  });
  for (const tier of ["free", "premium", "supporter", "vip"]) await membershipAssignmentService.assignTier(tier, `tier-${tier}`, "admin_grant", "fixture-admin");
  const ids = (values: Array<{ releaseId: string }>) => values.map(value => value.releaseId).sort();
  const catalogIds = ["hiddenHome", "hiddenLatest", "legacy"];
  assert.deepEqual(ids(await releaseRepository.listPublic()), catalogIds);
  assert.deepEqual(ids(await publicReleaseRepository.listPublishedReleases()), catalogIds);
  assert.deepEqual(ids(await publicReleaseRepository.getLatestPublishedReleases()), ["hiddenHome", "legacy"]);
  assert.deepEqual(ids(await publicReleaseRepository.getFeaturedPublishedReleases(12, "homepage")), ["hiddenLatest", "legacy"]);
  assert.deepEqual(ids(await publicReleaseService.listPublishedReleases()), catalogIds);
  assert.equal(await publicReleaseService.getPublishedReleaseBySlug("vip"), undefined);
  assert.ok(await publicReleaseService.getPublishedReleaseBySlug("hiddenHome"));
  const latest = await delivery.getLatestPublicReleases();
  assert.deepEqual(ids(latest.flatMap(group => group.releases)), ["hiddenHome", "legacy"]);
  const homepage = await delivery.getPublicHomepage();
  assert.deepEqual(ids(homepage.releaseGroups.flatMap(group => group.releases)), ["hiddenLatest", "legacy"]);
  assert.notEqual(homepage.featuredRelease?.release.releaseId, "hiddenHome");
  assert.ok(homepage.spotlightArtists.every(item => item.latestRelease?.releaseId !== "hiddenHome"));
  assert.doesNotMatch(JSON.stringify(homepage), /private-source|privateObjectKey|private\/secret/);
  const baseline = structuredClone(await jsonDatabase.read());
  for (const audience of ["free", "premium", "supporter", "vip"]) {
    const data = structuredClone(baseline);
    data.releaseRecords.find(item => item.releaseId === audience)!.publicVisibility = false;
    assert.equal(evaluateSongAction(data, audience, audience, "stream").allowed, true, `${audience} target is explicit classification`);
  }
  assert.equal(evaluateSongAction(baseline, "free", "vip", "stream").allowed, false);
  for (const id of ["invalid", "badPlacement"]) assert.equal(evaluateSongAction(baseline, "vip", id, "stream").allowed, false);
  for (const audience of ["public", "free", "premium", "supporter", "vip"]) {
    const data = structuredClone(baseline);
    const release = data.releaseRecords.find(item => item.releaseId === "legacy")!;
    release.metadata!.publicationAudience = audience;
    data.memberEntitlementGrants.push({ grantId: "deny", memberId: "vip", entitlementKey: `content.${audience}.view`, effect: "deny", status: "active", startsAt: "2020-01-01" } as never);
    assert.equal(evaluateSongAction(data, "vip", "legacy", "stream").allowed, false, `Explicit ${audience} denial must win`);
  }
  for (const change of [
    (data: typeof baseline) => { data.releaseRecords.find(item => item.releaseId === "vip")!.metadata!.embargoUntil = "2999-01-01"; },
    (data: typeof baseline) => { data.adminAuditEvents.push({ entityId: "vip", action: "production_draft_ingested" } as never); },
    (data: typeof baseline) => { data.accessOverrides.push({ overrideId: "deny", scopeType: "release", scopeId: "vip", subjectType: "all_authenticated", effect: "deny", status: "active" } as never); },
    (data: typeof baseline) => {
      data.contentEntitlementRequirements.push({ contentType: "release", contentId: "vip", status: "active", policyId: "deny", accessClassification: "vip", requiredEntitlementKeys: [] } as never);
      data.contentAccessPolicies.push({ policyId: "deny", status: "published", defaultEffect: "deny", rules: [] } as never);
    },
  ]) {
    const changed = structuredClone(baseline); change(changed);
    assert.equal(evaluateSongAction(changed, "vip", "vip", "stream").allowed, false, "VIP cannot bypass existing safeguards");
  }
  const { PublicLandingService } = await import("../server/services/public/PublicLandingService");
  delivery.getPublicSiteConfiguration = async () => ({ siteName: "Fixture" }) as never;
  delivery.listPublicArtists = async () => [];
  delivery.listPublicGalleryItems = async () => [];
  const landing = await new PublicLandingService().buildPublicLandingExperience();
  assert.deepEqual(landing.latestReleases.map(card => card.release.releaseId), ["legacy"]);
  assert.deepEqual(landing.featuredReleases.map(card => card.release.releaseId).sort(), ["hiddenLatest", "legacy"]);
  assert.equal(JSON.stringify(landing).includes('"releaseId":"vip"'), false);
  console.log("Release publication enforcement passed: helper, audiences, stale visibility, homepage/latest placements, explicit denials, embargo, policies and private-source exclusion. Isolated synthetic data only.");
} finally { await rm(root, { recursive: true, force: true }); }
