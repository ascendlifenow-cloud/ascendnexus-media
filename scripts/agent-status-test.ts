import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-agent-status-"));
process.env.NODE_ENV = "test";
process.env.APP_ENV = "test";
process.env.MEDIA_DATA_ROOT = root;
process.env.MONGODB_URI = "";
process.env.MEDIA_ADMIN_DEV_TOKEN = "isolated-agent-test-token";
const { AgentStatusService } = await import("../server/services/agents/AgentStatusService");
const { validateAgentReport, buildAgentReport, agentRunSummary } = await import("../server/services/agents/AgentStatusContract");
const { AgentRunReportRepository } = await import("../server/repositories/agents/AgentRunReportRepository");
const { handleAdminAgentStatusRoute } = await import("../server/routes/adminAgentStatusRoutes");
const { sendSafeError } = await import("../server/middleware/mediaErrorMiddleware");
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const { mediaAuthorizationService } = await import("../server/services/media/MediaAuthorizationService");
const { assertProductionAssetAllowed, assertProductionReleaseAllowed, productionReviewSnapshot } = await import("../server/services/production/ProductionReleaseGate");
const { mediaStoragePromotionService } = await import("../server/services/media/MediaStoragePromotionService");
const service = new AgentStatusService();
const input = { reportId: "report-1", runId: "run-1", team: "engineering", agentName: "Engineering reviewer", assignment: "Verify private production", status: "running", summary: "Started bounded verification.", blockers: [], evidence: [], expectedRevision: 0 };
const api = createServer(async (request, response) => {
  try { if (!await handleAdminAgentStatusRoute(request, response, new URL(request.url!, "http://localhost"))) { response.writeHead(404); response.end(); } }
  catch (error) { sendSafeError(response, error); }
});
try {
  const parsed = validateAgentReport(input);
  for (const summary of ["token= SYNTHETIC_VALUE", "password: SYNTHETIC_VALUE", "ghp_SYNTHETIC_VALUE"]) assert.throws(() => validateAgentReport({ ...input, summary }));
  for (const bad of [{ ...input, actorId: "spoofed" }, { ...input, summary: "token=secret-value" }, { ...input, summary: "https://example.invalid/private" }, { ...input, summary: "/Users/owner/private.txt" }, { ...input, summary: "owner@example.invalid" }, { ...input, expectedRevision: -1 }, { ...input, team: "admin" }, { ...input, status: "approved" }, { ...input, status: "completed" }, { ...input, evidence: [{ label: "Unsafe", path: "/admin/../private" }] }]) assert.throws(() => validateAgentReport(bad));
  const first = await service.report(parsed, "test-coordinator", "local");
  assert.equal(first.revision, 1);
  assert.equal((await service.report(input, "test-coordinator", "local")).revision, 1);
  await assert.rejects(() => service.report({ ...input, summary: "Conflicting report." }, "test-coordinator", "local"));
  const previous = await new AgentRunReportRepository().latest("run-1");
  assert.equal(agentRunSummary({ ...previous!, occurredAt: "2020-01-01T00:00:00.000Z" }).isStale, true);
  assert.throws(() => buildAgentReport(parsed, previous, "test-coordinator", "local"));
  const snapshot = await jsonDatabase.read();
  await service.report({ ...input, reportId: "report-2", expectedRevision: 1, status: "blocked", blockers: ["Final audio is unavailable."], summary: "Text packet checked; final audio missing." }, "test-coordinator", "local");
  await jsonDatabase.write(snapshot);
  assert.equal((await new AgentStatusService().runs(new URLSearchParams())).runs[0].revision, 2, "Legacy catalog writes must not erase agent reports");
  const page = await service.logs("run-1", new URLSearchParams("limit=1"));
  assert.equal(page.logs.length, 1);
  assert.equal(page.hasMore, true);
  assert.equal((await service.logs("run-1", new URLSearchParams(`beforeRevision=${page.nextBeforeRevision}`))).logs[0].revision, 1);
  assert.equal((await service.runs(new URLSearchParams("team=creative"))).total, 0);
  assert.equal("reportedBy" in page.logs[0], false);
  await assert.rejects(() => service.logs("run-1", new URLSearchParams("limit=-1")));
  await service.report({ ...input, reportId: "report-3", expectedRevision: 2, status: "completed", summary: "Bounded audit completed.", evidence: [{ label: "Audit report", path: "docs/ANMX-agent-team-status.md" }] }, "test-coordinator", "local");
  await assert.rejects(() => service.report({ ...input, reportId: "report-4", expectedRevision: 3 }, "test-coordinator", "local"));
  await jsonDatabase.insertCollectionRecord("adminAuditEvents", { auditEventId: "test-enrollment", action: "production_asset_enrolled", entityType: "media_asset", entityId: "managed-cover", summary: "Private asset enrollment.", createdAt: new Date().toISOString() });
  assert.equal((await jsonDatabase.listCollection("mediaAssetLinks")).length, 0);
  await assert.rejects(() => assertProductionAssetAllowed("managed-cover"), /remains private/);
  await jsonDatabase.insertCollectionRecord("mediaStorageObjects", { storageObjectId: "managed-storage", assetId: "managed-cover", assetType: "cover_art", accessLevel: "admin_only", status: "ready" } as never);
  await assert.rejects(() => mediaStoragePromotionService.promoteStorageObjectToPublic("managed-storage", { forceFullSongPublic: true }), /remains private/);
  await assertProductionAssetAllowed("unrelated-asset");
  await jsonDatabase.insertCollectionRecord("releaseRecords", { releaseId: "managed-release", artistId: "test-artist", title: "Private validation fixture", status: "draft", publicationState: "draft", publicVisibility: false } as never);
  await jsonDatabase.insertCollectionRecord("adminAuditEvents", { auditEventId: "release-enrollment", action: "production_draft_ingested", entityType: "release", entityId: "managed-release", summary: "Private release enrollment.", createdAt: new Date().toISOString() });
  const privateReview = await productionReviewSnapshot("managed-release");
  assert.equal(privateReview.approval.publicActionsAllowed, false);
  assert.ok(privateReview.approval.blockers.includes("Final audio has not been produced or ingested."));
  await assert.rejects(() => assertProductionReleaseAllowed("managed-release"), /awaiting owner review/);
  await new Promise<void>((resolve) => api.listen(0, "127.0.0.1", resolve));
  const address = api.address();
  if (!address || typeof address === "string") throw new Error("Test listener failed.");
  const url = `http://127.0.0.1:${address.port}/api/admin/agents/runs`;
  assert.equal((await fetch(url)).status, 401);
  const headers = { "X-Admin-Dev-Token": process.env.MEDIA_ADMIN_DEV_TOKEN };
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await fetch(url, { headers, method: "POST" })).status, 405);
  const authenticate = mediaAuthorizationService.authenticate;
  try {
    mediaAuthorizationService.authenticate = async () => ({ adminId: "read-limited", permissions: [] });
    assert.equal((await fetch(url, { headers })).status, 403);
  } finally { mediaAuthorizationService.authenticate = authenticate; }
  console.log("Agent status passed: validation, idempotency, version conflicts, restart persistence, snapshot isolation, pagination, privacy, RBAC and detached production-asset guard.");
} finally {
  if (api.listening) await new Promise<void>((resolve) => api.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
}
