import { randomUUID } from "node:crypto";
import { createMediaApiServer } from "../server/index.ts";
import { accessPolicyEvaluationService } from "../server/services/access/AccessPolicyEvaluationService.ts";
import { effectiveEntitlementService } from "../server/services/access/EffectiveEntitlementService.ts";
import { membershipAccessHealthService } from "../server/services/access/MembershipAccessHealthService.ts";
import { protectedMediaAuthorizationService } from "../server/services/access/ProtectedMediaAuthorizationService.ts";
import { publicAccessProjectionService } from "../server/services/access/PublicAccessProjectionService.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";
import { publicDeliveryVerificationService } from "../server/services/public/PublicDeliveryVerificationService.ts";
import { membershipAssignmentService } from "../server/services/membership/MembershipAssignmentService.ts";
import { membershipCatalogService } from "../server/services/membership/MembershipCatalogService.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "health";
const failures = [];

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (key === "command") return value;
  if (typeof value === "string" && /(token=|signature=|x-amz-|private\/|full[-_]?song)/i.test(value)) return "[REDACTED]";
  return value;
}, 2));

const withServer = async (fn) => {
  const server = createMediaApiServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    return await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const get = async (baseUrl, path, headers = {}) => {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
};

const syntheticMember = async () => {
  const now = new Date().toISOString();
  const memberId = `access-smoke-${randomUUID()}`;
  await jsonDatabase.update((data) => {
    data.memberAccounts.push({
      memberId,
      email: `${memberId}@example.invalid`,
      normalizedEmail: `${memberId}@example.invalid`,
      displayName: "Access Smoke",
      membershipTier: "Free Member",
      status: "Active",
      emailVerified: true,
      emailVerifiedAt: now,
      passwordHash: "not-used-in-access-smoke",
      createdAt: now,
      updatedAt: now,
      failedLoginCount: 0,
      preferences: {
        notifications: { newReleases: true, artistUpdates: true, newsletter: false, marketing: false, systemNotifications: true, securityAlerts: true },
        privacy: { publicProfile: false, showFavorites: false },
      },
      schemaVersion: 1,
      metadata: { authorizationVersion: 1, synthetic: true },
    });
  });
  await membershipAssignmentService.assignDefaultFreeTier(memberId);
  const data = await jsonDatabase.read();
  return data.memberAccounts.find((member) => member.memberId === memberId);
};

const cleanupSyntheticAccessMembers = async () => {
  await jsonDatabase.update((data) => {
    const syntheticIds = new Set(data.memberAccounts.filter((member) => member.memberId.startsWith("access-smoke-")).map((member) => member.memberId));
    if (!syntheticIds.size) return;
    data.memberAccounts = data.memberAccounts.filter((member) => !syntheticIds.has(member.memberId));
    data.memberMembershipAssignments = data.memberMembershipAssignments.filter((assignment) => !syntheticIds.has(assignment.memberId));
    data.memberEntitlementGrants = data.memberEntitlementGrants.filter((grant) => !syntheticIds.has(grant.memberId));
    data.protectedMediaAuthorizations = data.protectedMediaAuthorizations.filter((authorization) => !syntheticIds.has(authorization.memberId));
    data.memberAccessHistory = data.memberAccessHistory.filter((history) => !syntheticIds.has(history.memberId));
    data.adminAuditEvents = data.adminAuditEvents.filter((event) => !String(event.entityId ?? "").startsWith("access-smoke-") && event.actorId !== "access-smoke");
  });
};

const runCatalogCheck = async () => {
  const catalog = await membershipCatalogService.ensureDefaultCatalog();
  expect(catalog.tiers.some((tier) => tier.tierKey === "free" && tier.isDefault), "Default free tier is missing.");
  expect(catalog.tiers.some((tier) => tier.tierKey === "premium"), "Premium readiness tier is missing.");
  expect(catalog.tiers.some((tier) => tier.tierKey === "supporter"), "Supporter readiness tier is missing.");
  expect(catalog.tiers.some((tier) => tier.tierKey === "vip"), "VIP readiness tier is missing.");
  expect(catalog.entitlements.some((entitlement) => entitlement.entitlementKey === "audio.stream.full"), "Full-stream entitlement is missing.");
  expect(catalog.tierGrants.some((grant) => grant.entitlementKey === "content.free.view" && grant.effect === "allow"), "Free tier content grant is missing.");
  return { tiers: catalog.tiers.length, entitlements: catalog.entitlements.length, tierGrants: catalog.tierGrants.length };
};

const runHealth = async () => {
  const report = await membershipAccessHealthService.getHealthReport();
  expect(!report.errors.length, `Access health has errors: ${report.errors.join("; ")}`);
  return report;
};

const runProjectionScan = async () => {
  const projection = publicAccessProjectionService.projectGuestTeaser({
    title: "Teaser",
    description: "Safe teaser",
    fullSongUrl: "private/releases/master.wav",
    signedUrl: "https://cdn.example/song?signature=bad",
    storagePath: "private/releases/master.wav",
    adminNotes: "hidden",
  });
  const report = publicAccessProjectionService.validatePublicProjection(projection);
  expect(report.safe, `Projection remained unsafe: ${JSON.stringify(report)}`);
  return { safe: report.safe, removed: ["fullSongUrl", "signedUrl", "storagePath", "adminNotes"] };
};

const runPublicApiScan = async () => {
  const report = await publicDeliveryVerificationService.buildFullReport();
  expect(report.success, `Public delivery verification failed: ${JSON.stringify(report)}`);
  return report;
};

const runSearchScan = async () => withServer(async (baseUrl) => {
  const search = await get(baseUrl, "/api/public/search?q=preview");
  if (search.response.status !== 404) {
    expect(search.response.ok && search.payload.success !== false, `Search endpoint failed: ${search.response.status}`);
    const text = JSON.stringify(search.payload);
    expect(!/(private\/|signedUrl|storagePath|fullSong|full-song|full_song)/i.test(text), "Search payload exposed protected media fields.");
  }
  return { checked: "public search payload", status: search.response.status };
});

const runCacheScan = async () => {
  const guestDecision = await accessPolicyEvaluationService.evaluate({ type: "guest" }, { resourceType: "release", action: "view", accessClassification: "public" });
  const premiumDecision = await accessPolicyEvaluationService.evaluate({ type: "guest" }, { resourceType: "release", action: "view", accessClassification: "premium_member" });
  expect(guestDecision.cacheScope === "public", "Public guest decision should use public cache scope.");
  expect(premiumDecision.cacheScope === "guest_teaser", "Denied premium guest decision should use guest teaser scope.");
  return { publicCacheScope: guestDecision.cacheScope, premiumGuestCacheScope: premiumDecision.cacheScope };
};

const runProtectedMediaTest = async () => {
  await cleanupSyntheticAccessMembers();
  const member = await syntheticMember();
  try {
    const freeSnapshot = await effectiveEntitlementService.getForMember(member);
    expect(!freeSnapshot.allowed.includes("audio.stream.full"), "Free member unexpectedly has full-stream entitlement.");
    const denied = await protectedMediaAuthorizationService.authorizeStream({ type: "member", member }, { mediaId: "access-smoke-media", sessionId: "access-smoke-session" });
    expect(!denied.authorized && denied.decision.decision !== "allow", "Free member stream authorization should be denied.");
    const premium = await membershipCatalogService.getTierByKey("premium");
    await membershipAssignmentService.assignTier(member.memberId, premium?.tierId ?? "tier-premium", "admin_grant", "access-smoke");
    const refreshed = (await jsonDatabase.read()).memberAccounts.find((item) => item.memberId === member.memberId);
    const allowed = await protectedMediaAuthorizationService.authorizeStream({ type: "member", member: refreshed }, { mediaId: "access-smoke-media", sessionId: "access-smoke-session" });
    expect(allowed.authorized, "Premium member stream authorization should be allowed.");
    expect(!JSON.stringify(allowed).match(/private\/|storagePath|signedUrl|fullSong/i), "Authorization response exposed protected media details.");
    return { freeDenied: !denied.authorized, premiumAllowed: allowed.authorized, tokenPrinted: false, expiresAt: allowed.expiresAt };
  } finally {
    await cleanupSyntheticAccessMembers();
  }
};

const runSimulation = async () => {
  const publicDecision = await accessPolicyEvaluationService.evaluate({ type: "guest" }, { resourceType: "release", action: "view", accessClassification: "public" });
  const premiumDecision = await accessPolicyEvaluationService.evaluate({ type: "guest" }, { resourceType: "release", action: "view", accessClassification: "premium_member" });
  expect(publicDecision.allowed, "Guest should view public content.");
  expect(!premiumDecision.allowed && premiumDecision.decision === "challenge_authentication", "Guest premium content should challenge authentication.");
  return { publicDecision, premiumDecision };
};

await membershipCatalogService.ensureDefaultCatalog();

const result = command === "health" ? await runHealth()
  : command === "tiers-verify" || command === "entitlements-verify" || command === "assignments-verify" ? await runCatalogCheck()
  : command === "policies-verify" || command === "content-verify" ? await runSimulation()
  : command === "public-projection-scan" || command === "member-projection-scan" ? await runProjectionScan()
  : command === "cache-scan" ? await runCacheScan()
  : command === "search-scan" ? await runSearchScan()
  : command === "protected-media-test" ? await runProtectedMediaTest()
  : command === "full-song-scan" || command === "private-media-scan" ? await runPublicApiScan()
  : command === "simulate" ? await runSimulation()
  : await runHealth();

if (failures.length) {
  safePrint({ success: false, command, failures, result });
  process.exitCode = 1;
} else {
  safePrint({ success: true, command, result });
}
