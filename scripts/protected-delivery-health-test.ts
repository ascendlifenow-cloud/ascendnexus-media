import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-delivery-health-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_WORKERS_ENABLED: "false" });
const { ProtectedDeliveryTelemetryService } = await import("../server/services/protectedContent/ProtectedDeliveryTelemetryService");
const { ProtectedContentDeliveryHealthService, protectedContentDeliveryHealthService } = await import("../server/services/protectedContent/ProtectedContentDeliveryHealthService");
const { publicDeliveryVerificationService } = await import("../server/services/public/PublicDeliveryVerificationService");
const { protectedContentDeliveryAuthorizationService } = await import("../server/services/protectedContent/ProtectedContentDeliveryAuthorizationService");
const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
const originalSafety = publicDeliveryVerificationService.buildFullReport;
const originalUpdate = jsonDatabase.update;
try {
  await protectedContentDeliveryAuthorizationService.ensureDefaultProfiles();
  const data = structuredClone(await jsonDatabase.read());
  publicDeliveryVerificationService.buildFullReport = async () => ({ success: true, checks: [], checkedAt: new Date().toISOString() });
  jsonDatabase.update = async () => { throw new Error("Health must not write catalog or create profiles."); };
  let clock = Date.now();
  const telemetry = new ProtectedDeliveryTelemetryService(() => clock);
  const service = new ProtectedContentDeliveryHealthService(telemetry);
  let report = await service.getHealthReport(data);
  assert.equal(report.overallStatus, "degraded");
  assert.equal(report.gatewayStatus, "unverified");
  assert.equal(report.endToEndVerified, false);
  assert.equal(report.searchStatus, "not_probed");
  assert.equal(report.storageStatus, "not_probed");
  assert.equal(report.authorizationStatus, "profiles_configured");
  const head = telemetry.begin("stream", "HEAD");
  telemetry.finish(head, 200, true);
  assert.equal(telemetry.getSnapshot().originByteResponsesCompleted, 0, "HEAD never verifies byte delivery.");
  const read = telemetry.begin("stream", "GET");
  telemetry.advance(read, "byte_delivery");
  telemetry.finish(read, 206, true);
  report = await service.getHealthReport(data);
  assert.equal(report.rangeStatus, "origin_range_delivery_observed");
  assert.equal(report.overallStatus, "degraded", "Origin completion must not certify browser/CDN delivery.");
  assert.equal(report.endToEndVerified, false);
  const denied = telemetry.begin("stream", "GET"); telemetry.finish(denied, 403, false);
  const disconnected = telemetry.begin("stream", "GET"); telemetry.finish(disconnected, 499, false);
  assert.equal(telemetry.getSnapshot().serverFailures, 0);
  const failed = telemetry.begin("download", "GET"); telemetry.advance(failed, "storage_read");
  telemetry.finish(failed, 502, false, "https://private.invalid?token=SYNTHETIC_SECRET");
  report = await service.getHealthReport(data);
  assert.equal(report.overallStatus, "unavailable");
  assert.equal(report.observations.lastFailure?.stage, "storage_read");
  assert.doesNotMatch(JSON.stringify(report.observations), /SYNTHETIC_SECRET|https:|memberId|resourceId|storagePath|authorizationReference/);
  telemetry.finish(failed, 200, true);
  assert.equal(telemetry.getSnapshot().serverFailures, 1, "A completed failure cannot be rewritten as success.");
  clock += 15 * 60 * 1000;
  assert.equal(telemetry.getSnapshot().observedRequests, 0);
  const stalled = telemetry.begin("stream", "GET"); telemetry.advance(stalled, "usage_commit"); clock += 120000;
  assert.equal((await service.getHealthReport(data)).observations.stalledRequests, 1);
  telemetry.finish(stalled, 504, false);
  for (let index = 0; index < 150; index++) telemetry.finish(telemetry.begin("stream", "GET"), 403, false);
  assert.equal(telemetry.getSnapshot().observedRequests, 100, "Observations must be bounded.");
  for (const mutate of [
    (copy: typeof data) => { copy.mediaDeliveryProfiles = []; },
    (copy: typeof data) => { copy.mediaDeliveryProfiles.push(structuredClone(copy.mediaDeliveryProfiles[0])); },
    (copy: typeof data) => { copy.mediaDeliveryProfiles[0].publicCacheAllowed = true; },
    (copy: typeof data) => { copy.mediaDeliveryProfiles[0].tokenTtlSeconds = 901; },
    (copy: typeof data) => { copy.mediaDeliveryProfiles[0].sessionBindingRequired = false; },
    (copy: typeof data) => { copy.mediaDeliveryProfiles[1].maxUses = undefined; },
  ]) {
    const copy = structuredClone(data); mutate(copy);
    assert.equal((await new ProtectedContentDeliveryHealthService().getHealthReport(copy)).authorizationStatus, "configuration_invalid");
  }
  data.protectedMediaAuthorizations.push({ status: "active", expiresAt: new Date(Date.now() + 60000).toISOString() } as never, { status: "active", expiresAt: "invalid" } as never);
  data.protectedPlaybackSessions.push({ status: "playing", expiresAt: new Date(Date.now() - 1000).toISOString() } as never, { status: "playing", expiresAt: new Date(Date.now() + 60000).toISOString() } as never);
  report = await service.getHealthReport(data);
  assert.equal(report.activeAuthorizations, 1);
  assert.equal(report.activePlaybackSessions, 1);
  publicDeliveryVerificationService.buildFullReport = async () => ({ success: false, checks: [], checkedAt: new Date().toISOString() });
  assert.equal((await service.getHealthReport(data)).securityStatus, "public_projection_check_failed");
  const { MemberCertificationService } = await import("../server/services/certification/MemberEcosystemCertificationService");
  const { memberIdentityService } = await import("../server/services/members/MemberIdentityService");
  const { membershipAccessHealthService } = await import("../server/services/access/MembershipAccessHealthService");
  const { memberPortalHealthService } = await import("../server/services/memberPortal/MemberPortalHealthService");
  const { memberHealthService } = await import("../server/services/memberCrm/MemberCrmServices");
  const { billingHealthService } = await import("../server/services/billing/BillingServices");
  const originals = [memberIdentityService.getHealth, membershipAccessHealthService.getHealthReport, protectedContentDeliveryHealthService.getHealthReport,
    memberPortalHealthService.getHealthReport, memberHealthService.getOverallHealth, billingHealthService.getHealthReport] as const;
  try {
    memberIdentityService.getHealth = async () => ({ overallStatus: "available" } as never);
    membershipAccessHealthService.getHealthReport = async () => ({ errors: [], warnings: [] } as never);
    protectedContentDeliveryHealthService.getHealthReport = async () => ({ ...report, errors: [], warnings: [] });
    memberPortalHealthService.getHealthReport = async () => ({ overallStatus: "available", warnings: [] } as never);
    memberHealthService.getOverallHealth = async () => ({ checkedAt: new Date().toISOString() } as never);
    billingHealthService.getHealthReport = async () => ({ rawCardStorage: "disabled" } as never);
    const certification = (await new MemberCertificationService().certify()).find(item => item.domain === "protectedMedia")!;
    assert.equal(certification.status, "blocked", "Configuration checks and origin observations must not certify end-to-end playback.");
    assert.ok(certification.blockers.some(item => item.includes("end-to-end")));
  } finally {
    [memberIdentityService.getHealth, membershipAccessHealthService.getHealthReport, protectedContentDeliveryHealthService.getHealthReport,
      memberPortalHealthService.getHealthReport, memberHealthService.getOverallHealth, billingHealthService.getHealthReport] = originals;
  }
  const { mediaAuthorizationService } = await import("../server/services/media/MediaAuthorizationService");
  const { handleProtectedContentRoute } = await import("../server/routes/protectedContentRoutes");
  const { sendSafeError } = await import("../server/middleware/mediaErrorMiddleware");
  const { AuthApiError } = await import("../server/utils/auth/authErrorUtils");
  const originalAuthenticate = mediaAuthorizationService.authenticate;
  const server = createServer(async (request, response) => {
    try { if (!await handleProtectedContentRoute(request, response, new URL(request.url!, "http://localhost"))) { response.writeHead(404); response.end(); } }
    catch (error) { sendSafeError(response, error); }
  });
  try {
    mediaAuthorizationService.authenticate = async request => {
      const permission = request.headers["x-fixture-permission"];
      if (permission === "security.read" || permission === "media.read") return { permissions: [permission] } as never;
      throw new AuthApiError("ADMIN_AUTH_REQUIRED", "Administrative authentication required.", 401);
    };
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    for (const path of ["/api/admin/protected-content/health", "/api/admin/protected-content/overview"]) {
      assert.equal((await fetch(`${base}${path}`)).status, 401);
      assert.equal((await fetch(`${base}${path}`, { headers: { "x-fixture-permission": "media.read" } })).status, 403);
      const response = await fetch(`${base}${path}`, { headers: { "x-fixture-permission": "security.read" } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
      const payload = await response.json() as { data: { health?: { endToEndVerified: boolean }; endToEndVerified?: boolean } };
      assert.equal(payload.data.health?.endToEndVerified ?? payload.data.endToEndVerified, false);
    }
  } finally {
    mediaAuthorizationService.authenticate = originalAuthenticate;
    await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
  }
  console.log("Protected delivery health tests passed: read-only health, no false certification, bounded/redacted origin observations, unsafe profiles, expiration, failures, stalls and admin API boundaries. No external network or real member changes.");
} finally {
  publicDeliveryVerificationService.buildFullReport = originalSafety;
  jsonDatabase.update = originalUpdate;
  await rm(root, { recursive: true, force: true });
}
