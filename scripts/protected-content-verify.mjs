import fs from "node:fs/promises";
import path from "node:path";
import { createMediaApiServer } from "../server/index.ts";
import { mediaBackendConfig } from "../server/config/mediaBackendConfig.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";
import { membershipAssignmentService } from "../server/services/membership/MembershipAssignmentService.ts";
import { membershipCatalogService } from "../server/services/membership/MembershipCatalogService.ts";
import { protectedContentDeliveryHealthService } from "../server/services/protectedContent/ProtectedContentDeliveryHealthService.ts";
import { protectedContentDeliveryAuthorizationService } from "../server/services/protectedContent/ProtectedContentDeliveryAuthorizationService.ts";
import { publicDeliveryVerificationService } from "../server/services/public/PublicDeliveryVerificationService.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "health";
const failures = [];
const marker = `protected-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (key === "command") return value;
  if (typeof value === "string" && /(token=|signature=|x-amz-|private\/|protected-auth-|session=)/i.test(value)) return "[REDACTED]";
  return value;
}, 2));

const cleanup = async () => {
  await jsonDatabase.update((data) => {
    const smokeMemberIds = new Set(data.memberAccounts.filter((item) => item.memberId.includes("protected-smoke") || item.normalizedEmail.includes("protected-smoke")).map((item) => item.memberId));
    data.memberAccounts = data.memberAccounts.filter((item) => !smokeMemberIds.has(item.memberId));
    data.memberSessions = data.memberSessions.filter((item) => !smokeMemberIds.has(item.memberId));
    data.memberVerificationTokens = data.memberVerificationTokens.filter((item) => !smokeMemberIds.has(item.memberId));
    data.memberPasswordResetTokens = data.memberPasswordResetTokens.filter((item) => !smokeMemberIds.has(item.memberId));
    data.memberMembershipAssignments = data.memberMembershipAssignments.filter((item) => !smokeMemberIds.has(item.memberId));
    data.mediaAssets = data.mediaAssets.filter((item) => !item.assetId.includes("protected-smoke"));
    data.mediaStorageObjects = data.mediaStorageObjects.filter((item) => !item.storageObjectId.includes("protected-smoke"));
    data.protectedMediaResources = data.protectedMediaResources.filter((item) => !item.protectedMediaResourceId.includes("protected-smoke") && !item.mediaAssetId.includes("protected-smoke"));
    data.protectedMediaAuthorizations = data.protectedMediaAuthorizations.filter((item) => !item.mediaId.includes("protected-smoke") && !smokeMemberIds.has(item.memberId));
    data.protectedPlaybackSessions = data.protectedPlaybackSessions.filter((item) => !smokeMemberIds.has(item.memberId) && !item.mediaAssetId.includes("protected-smoke"));
    data.memberAccessHistory = data.memberAccessHistory.filter((item) => !String(item.resourceId ?? "").includes("protected-smoke") && !(item.memberId && smokeMemberIds.has(item.memberId)));
    data.adminAuditEvents = data.adminAuditEvents.filter((item) => !String(item.entityId ?? "").includes("protected-smoke") && item.actorId !== "protected-smoke");
  });
  await fs.rm(path.join(mediaBackendConfig.uploadRoot, "private", "protected-smoke"), { recursive: true, force: true }).catch(() => undefined);
};

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

const jsonRequest = async (baseUrl, target, options = {}) => {
  const response = await fetch(`${baseUrl}${target}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Auth-Scope": "member", ...(options.headers ?? {}) },
  });
  return { response, payload: await response.json().catch(() => ({})) };
};

const prepareFixture = async (baseUrl) => {
  await cleanup();
  await protectedContentDeliveryAuthorizationService.ensureDefaultProfiles();
  const email = `${marker}@example.invalid`;
  const password = "ProtectedSmokePassword123!";
  const registration = await jsonRequest(baseUrl, "/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, displayName: "Protected Smoke", acceptTerms: true, acceptPrivacy: true }) });
  const token = registration.payload.data?.verificationToken;
  await jsonRequest(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
  const login = await jsonRequest(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  const cookie = login.response.headers.get("set-cookie");
  const memberId = login.payload.data?.member?.memberId;
  const premium = await membershipCatalogService.getTierByKey("premium");
  await membershipAssignmentService.assignTier(memberId, premium?.tierId ?? "tier-premium", "admin_grant", "protected-smoke");

  const storagePath = `private/protected-smoke/${marker}.mp3`;
  const absolute = path.join(mediaBackendConfig.uploadRoot, storagePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  const content = Buffer.from("PROTECTED_MEDIA_FIXTURE_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  await fs.writeFile(absolute, content);
  const now = new Date().toISOString();
  const assetId = `protected-smoke-asset-${marker}`;
  await jsonDatabase.update((data) => {
    data.mediaAssets.push({
      assetId,
      ownerType: "release",
      ownerId: `protected-smoke-release-${marker}`,
      assetType: "full_song",
      title: "Protected smoke asset",
      status: "published",
      assignmentStatus: "assigned",
      createdAt: now,
      updatedAt: now,
      metadata: { synthetic: true },
    });
    data.mediaStorageObjects.push({
      storageObjectId: `protected-smoke-storage-${marker}`,
      assetId,
      provider: "local",
      storagePath,
      fileName: `${marker}.mp3`,
      originalFileName: `${marker}.mp3`,
      mimeType: "audio/mpeg",
      fileExtension: ".mp3",
      fileSizeBytes: content.length,
      mediaCategory: "audio",
      assetType: "full_song",
      accessLevel: "admin_only",
      status: "ready",
      uploadedAt: now,
      updatedAt: now,
      metadata: { releaseId: `protected-smoke-release-${marker}`, synthetic: true },
    });
  });
  return { cookie, assetId, contentLength: content.length };
};

const runAuthorizationAndRange = async () => withServer(async (baseUrl) => {
  const fixture = await prepareFixture(baseUrl);
  try {
    const auth = await jsonRequest(baseUrl, `/api/member/media/${encodeURIComponent(fixture.assetId)}/stream-authorize`, { method: "POST", headers: { Cookie: fixture.cookie ?? "" }, body: "{}" });
    expect(auth.response.ok, `Stream authorization failed: ${auth.response.status}`);
    expect(auth.payload.data?.streamEndpoint, "Stream endpoint missing.");
    expect(!JSON.stringify(auth.payload).match(/storagePath|privateObjectKey|private\/protected-smoke/), "Authorization leaked private storage data.");
    const range = await fetch(`${baseUrl}${auth.payload.data.streamEndpoint}`, { headers: { Cookie: fixture.cookie ?? "", Range: "bytes=0-9", "X-Auth-Scope": "member" } });
    expect(range.status === 206, `Range request should return 206, got ${range.status}.`);
    expect(range.headers.get("accept-ranges") === "bytes", "Accept-Ranges header missing.");
    expect(range.headers.get("cache-control")?.includes("no-store"), "Protected stream must be no-store.");
    expect(range.headers.get("content-range")?.startsWith("bytes 0-9/"), "Content-Range header incorrect.");
    const body = await range.text();
    expect(body.length === 10, "Range body length was incorrect.");
    return { authorized: auth.response.ok, rangeStatus: range.status, noStore: range.headers.get("cache-control") };
  } finally {
    await cleanup();
  }
});

const runDownload = async () => withServer(async (baseUrl) => {
  const fixture = await prepareFixture(baseUrl);
  try {
    const auth = await jsonRequest(baseUrl, `/api/member/media/${encodeURIComponent(fixture.assetId)}/download-authorize`, { method: "POST", headers: { Cookie: fixture.cookie ?? "" }, body: "{}" });
    expect(auth.response.status === 403, "Premium without download entitlement should be denied download authorization.");
    return { downloadDeniedWithoutEntitlement: auth.response.status === 403 };
  } finally {
    await cleanup();
  }
});

const runPublicSafety = async () => {
  const report = await publicDeliveryVerificationService.buildFullReport();
  expect(report.success, "Public delivery safety failed.");
  return report;
};

const runHealth = async () => {
  const report = await protectedContentDeliveryHealthService.getHealthReport();
  expect(!report.errors.length, `Protected content health errors: ${report.errors.join("; ")}`);
  return report;
};

await membershipCatalogService.ensureDefaultCatalog();
const result = command === "health" || command === "verify" || command === "profiles-verify" ? await runHealth()
  : command === "authorization-test" || command === "range-test" ? await runAuthorizationAndRange()
  : command === "download-test" ? await runDownload()
  : command === "cache-scan" || command === "service-worker-scan" || command === "search-scan" || command === "seo-scan" || command === "analytics-scan" || command === "full-song-scan" || command === "private-media-scan" ? await runPublicSafety()
  : command === "takedown-test" ? await runHealth()
  : await runHealth();

if (failures.length) {
  safePrint({ success: false, command, failures, result });
  process.exitCode = 1;
} else {
  safePrint({ success: true, command, result });
}
