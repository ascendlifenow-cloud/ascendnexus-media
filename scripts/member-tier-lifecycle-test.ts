import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = await mkdtemp(join(tmpdir(), "anmx-member-tiers-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
try {
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const { membershipCatalogService } = await import("../server/services/membership/MembershipCatalogService");
  const { membershipAssignmentService: service } = await import("../server/services/membership/MembershipAssignmentService");
  const { StripeProvider, ManualBillingProvider, entitlementSyncService } = await import("../server/services/billing/BillingServices");
  await membershipCatalogService.ensureDefaultCatalog();
  await jsonDatabase.update((data) => {
    data.memberAccounts.push({ memberId: "fixture", status: "Active", emailVerified: true, metadata: {}, updatedAt: new Date().toISOString() } as never);
  });
  await service.assignDefaultFreeTier("fixture");
  assert.equal((await service.getCurrentMembership("fixture"))?.tier.tierKey, "free");
  const before = await jsonDatabase.read();
  const originalCount = before.memberMembershipAssignments.length;
  await assert.rejects(() => service.assignTier("missing", "tier-premium"));
  await assert.rejects(() => service.assignTier("fixture", "tier-guest"));
  await assert.rejects(() => service.assignTier("fixture", "administrator"));
  await assert.rejects(() => service.assignTier("fixture", "tier-premium", "registration_default"));
  await assert.rejects(() => service.assignTier("fixture", "tier-premium", "admin_grant", "admin", "invalid"));
  assert.equal((await jsonDatabase.read()).memberMembershipAssignments.length, originalCount);
  await jsonDatabase.update((data) => { data.membershipTiers.find((item) => item.tierKey === "vip")!.status = "inactive"; });
  await assert.rejects(() => service.assignTier("fixture", "tier-vip"));
  await jsonDatabase.update((data) => { data.membershipTiers.find((item) => item.tierKey === "vip")!.status = "active"; });
  for (const key of ["premium", "supporter", "vip", "free"]) {
    await service.assignTier("fixture", `tier-${key}`, "admin_grant", "admin");
    assert.equal((await service.getCurrentMembership("fixture"))?.tier.tierKey, key);
  }
  await jsonDatabase.update((data) => {
    data.protectedMediaAuthorizations.push({ authorizationId: "fixture-token", memberId: "fixture", status: "active" } as never);
    data.protectedPlaybackSessions.push({ playbackSessionId: "fixture-playback", memberId: "fixture", status: "playing" } as never);
    data.billingPlans.push({ billingPlanId: "fixture-plan", membershipTierKey: "premium" } as never);
    data.memberSubscriptions.push({ subscriptionId: "fixture-subscription", memberId: "fixture", billingPlanId: "fixture-plan", state: "active", currentPeriodEnd: new Date(Date.now() + 3600000).toISOString() } as never);
  });
  await entitlementSyncService.syncSubscription("fixture-subscription");
  assert.equal((await service.getCurrentMembership("fixture"))?.tier.tierKey, "premium");
  await service.assignTier("fixture", "tier-free", "admin_grant", "admin");
  const after = await jsonDatabase.read();
  assert.equal(after.protectedMediaAuthorizations[0].status, "revoked");
  assert.equal(after.protectedPlaybackSessions[0].status, "revoked");
  assert.equal(after.memberMembershipAssignments.filter((item) => item.status === "active").length, 1);
  assert.ok(Number(after.memberAccounts[0].metadata?.authorizationVersion) > 1);
  for (const provider of [new StripeProvider(), new ManualBillingProvider()]) {
    assert.equal((await provider.verifyWebhook({ payload: { testMode: true, type: "payment_succeeded" }, signature: "not-a-signature" })).verified, false);
  }
  console.log("Member tier tests passed: default Free, all admin tiers, invalid assignments, internal billing synchronization fixture, authorization versioning, media revocation, and unsigned webhook rejection. No live payments or accounts changed.");
} finally { await rm(root, { recursive: true, force: true }); }
