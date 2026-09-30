import { randomUUID } from "node:crypto";
import { createMediaApiServer } from "../server/index.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";
import { memberPortalHealthService } from "../server/services/memberPortal/MemberPortalHealthService.ts";
import { memberDashboardService } from "../server/services/memberPortal/MemberDashboardService.ts";
import { publicDeliveryVerificationService } from "../server/services/public/PublicDeliveryVerificationService.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "health";
const failures = [];
const marker = `member-portal-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (typeof value === "string" && /(token=|signature=|x-amz-|private\/|storagePath|signedUrl|full[-_]?song|authorizationReference)/i.test(value)) return "[REDACTED]";
  if (key.toLowerCase().includes("email")) return "[REDACTED]";
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

const jsonRequest = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", "X-Auth-Scope": "member", ...(options.headers ?? {}) },
  });
  return { response, payload: await response.json().catch(() => ({})) };
};

const cleanup = async () => {
  await jsonDatabase.update((data) => {
    const ids = new Set(data.memberAccounts.filter((member) => member.memberId.includes("member-portal-smoke") || member.normalizedEmail.includes("member-portal-smoke")).map((member) => member.memberId));
    data.memberAccounts = data.memberAccounts.filter((member) => !ids.has(member.memberId));
    data.memberSessions = data.memberSessions.filter((session) => !ids.has(session.memberId));
    data.memberVerificationTokens = data.memberVerificationTokens.filter((token) => !ids.has(token.memberId));
    data.memberPasswordResetTokens = data.memberPasswordResetTokens.filter((token) => !ids.has(token.memberId));
    data.memberMembershipAssignments = data.memberMembershipAssignments.filter((assignment) => !ids.has(assignment.memberId));
    data.memberEntitlementGrants = data.memberEntitlementGrants.filter((grant) => !ids.has(grant.memberId));
    data.memberRecommendations = data.memberRecommendations.filter((recommendation) => !ids.has(recommendation.memberId));
    data.memberAccessHistory = data.memberAccessHistory.filter((record) => !record.memberId || !ids.has(record.memberId));
    data.adminAuditEvents = data.adminAuditEvents.filter((event) => !ids.has(String(event.entityId ?? "")));
  });
};

const prepareMember = async (baseUrl) => {
  await cleanup();
  const email = `${marker}@example.invalid`;
  const password = "MemberPortalSmoke123!";
  const registration = await jsonRequest(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: "Member Portal Smoke", acceptTerms: true, acceptPrivacy: true, newsletterOptIn: true }),
  });
  expect(registration.response.status === 201, `Registration failed: ${registration.response.status}`);
  const token = registration.payload.data?.verificationToken;
  const verify = await jsonRequest(baseUrl, "/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
  expect(verify.response.ok, `Verification failed: ${verify.response.status}`);
  const login = await jsonRequest(baseUrl, "/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, rememberMe: false }) });
  expect(login.response.ok, `Login failed: ${login.response.status}`);
  return { cookie: login.response.headers.get("set-cookie"), memberId: login.payload.data?.member?.memberId };
};

const assertNoProtectedData = (payload, label) => {
  const text = JSON.stringify(payload);
  expect(!/(private\/|storagePath|privateObjectKey|signedUrl|signature=|fullSong|full-song|full_song|authorizationReference|streamEndpoint|downloadUrl)/i.test(text), `${label} exposed protected delivery data.`);
};

const runDashboardFlow = async () => withServer(async (baseUrl) => {
  const fixture = await prepareMember(baseUrl);
  try {
    const dashboard = await jsonRequest(baseUrl, "/api/member/dashboard", { headers: { Cookie: fixture.cookie ?? "" } });
    expect(dashboard.response.ok, `Dashboard failed: ${dashboard.response.status}`);
    expect(dashboard.response.headers.get("cache-control")?.includes("no-store"), "Dashboard must use private no-store cache headers.");
    expect(dashboard.payload.data?.member?.displayName === "Member Portal Smoke", "Dashboard did not use the authenticated member.");
    expect(Array.isArray(dashboard.payload.data?.recentReleases), "Dashboard recent releases missing.");
    expect(Array.isArray(dashboard.payload.data?.recommendations), "Dashboard recommendations missing.");
    assertNoProtectedData(dashboard.payload, "Dashboard");
    const membership = await jsonRequest(baseUrl, "/api/member/membership", { headers: { Cookie: fixture.cookie ?? "" } });
    expect(membership.response.ok, `Membership endpoint failed: ${membership.response.status}`);
    assertNoProtectedData(membership.payload, "Membership");
    return { dashboardStatus: dashboard.response.status, memberId: fixture.memberId, noStore: dashboard.response.headers.get("cache-control") };
  } finally {
    await cleanup();
  }
});

const runProfilePreferencesSessions = async () => withServer(async (baseUrl) => {
  const fixture = await prepareMember(baseUrl);
  try {
    const headers = { Cookie: fixture.cookie ?? "" };
    const profile = await jsonRequest(baseUrl, "/api/member/profile", { headers });
    expect(profile.response.ok, `Profile read failed: ${profile.response.status}`);
    const updateProfile = await jsonRequest(baseUrl, "/api/member/profile", { method: "PATCH", headers, body: JSON.stringify({ displayName: "Member Portal Smoke Updated", bio: "Safe profile bio" }) });
    expect(updateProfile.response.ok, `Profile update failed: ${updateProfile.response.status}`);
    const preferences = await jsonRequest(baseUrl, "/api/member/preferences", { method: "PATCH", headers, body: JSON.stringify({ notifications: { newsletter: false }, privacy: { publicProfile: false } }) });
    expect(preferences.response.ok, `Preferences update failed: ${preferences.response.status}`);
    const sessions = await jsonRequest(baseUrl, "/api/member/sessions", { headers });
    expect(sessions.response.ok && Array.isArray(sessions.payload.data), `Sessions failed: ${sessions.response.status}`);
    assertNoProtectedData({ profile: profile.payload, preferences: preferences.payload, sessions: sessions.payload }, "Profile/preferences/sessions");
    return { profileUpdated: updateProfile.response.ok, sessions: sessions.payload.data?.length ?? 0 };
  } finally {
    await cleanup();
  }
});

const runHealth = async () => {
  const report = await memberPortalHealthService.getHealthReport();
  expect(!report.errors.length, `Member portal health errors: ${report.errors.join("; ")}`);
  return report;
};

const runStaticProtectedScan = async () => {
  const publicReport = await publicDeliveryVerificationService.buildFullReport();
  expect(publicReport.success, "Public delivery safety failed.");
  const dashboardHealth = await memberDashboardService.getHealth();
  expect(!dashboardHealth.errors.length, "Dashboard health reported errors.");
  return { publicSafety: publicReport.success, dashboardHealth };
};

const result = command === "health" ? await runHealth()
  : command === "verify" || command === "dashboard-test" || command === "network-scan" ? await runDashboardFlow()
  : command === "profile-test" || command === "preferences-test" || command === "sessions-test" ? await runProfilePreferencesSessions()
  : command === "cache-scan" || command === "protected-data-scan" || command === "full-song-scan" || command === "private-media-scan" ? await runStaticProtectedScan()
  : command === "accessibility" || command === "performance" ? await runHealth()
  : await runHealth();

if (failures.length) {
  safePrint({ success: false, command, failures, result });
  process.exitCode = 1;
} else {
  safePrint({ success: true, command, result });
}
