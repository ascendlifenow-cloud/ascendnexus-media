import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = await mkdtemp(join(tmpdir(), "anmx-crm-tier-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
try {
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const { membershipCatalogService } = await import("../server/services/membership/MembershipCatalogService");
  const { membershipAssignmentService } = await import("../server/services/membership/MembershipAssignmentService");
  const { MemberSearchService } = await import("../server/services/memberCrm/MemberCrmServices");
  await membershipCatalogService.ensureDefaultCatalog();
  await jsonDatabase.update(data => {
    for (const memberId of ["active", "pending"]) data.memberAccounts.push({ memberId, email: `${memberId}@example.test`, displayName: memberId, status: memberId === "active" ? "Active" : "PendingVerification", emailVerified: memberId === "active", membershipTier: "Premium Ready", metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as never);
  });
  await membershipAssignmentService.assignDefaultFreeTier("active");
  const search = new MemberSearchService();
  let members = await search.search(new URLSearchParams());
  assert.equal(members.find(m => m.memberId === "active")?.effectiveTierKey, "free");
  assert.equal(members.find(m => m.memberId === "pending")?.effectiveTierKey, "none");
  assert.equal((await search.search(new URLSearchParams({ tier: "premium" }))).length, 0);
  assert.equal((await search.search(new URLSearchParams({ tier: "free" }))).length, 1);
  await membershipAssignmentService.assignTier("active", "tier-vip", "admin_grant", "fixture-admin");
  members = await search.search(new URLSearchParams({ tier: "vip" }));
  assert.equal(members.length, 1);
  assert.equal(members[0].effectiveTierKey, "vip");
  assert.equal(members[0].effectiveMembershipStatus, "active");
  await jsonDatabase.update(data => { data.memberAccounts.find(m => m.memberId === "active")!.status = "Suspended"; });
  assert.equal((await search.search(new URLSearchParams({ tier: "vip" }))).length, 0);
  assert.equal((await search.search(new URLSearchParams({ q: "active" })))[0].effectiveTierKey, "none");
  console.log("CRM tier tests passed: stale legacy label ignored, canonical filters, current grant, unverified and suspended status. Isolated fixtures only.");
} finally { await rm(root, { recursive: true, force: true }); }
