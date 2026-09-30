import { randomUUID } from "node:crypto";
import { defaultMemberPreferences } from "../server/models/members/MemberModels.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";
import {
  memberAdministrationService,
  memberCrmService,
  memberHealthService,
  memberModerationService,
  memberRiskService,
  memberSearchService,
  memberSessionAdministrationService,
  memberSuccessService,
  memberSupportService,
  memberTimelineService,
} from "../server/services/memberCrm/MemberCrmServices.ts";
import { membershipAssignmentService } from "../server/services/membership/MembershipAssignmentService.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "verify";
const failures = [];
const marker = `member-crm-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const actorId = "member-crm-smoke-admin";

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (key.toLowerCase().includes("email")) return "[REDACTED]";
  if (typeof value === "string" && /(token=|signature=|x-amz-|private\/|storagePath|privateObjectKey|signedUrl|full[-_]?song|authorizationReference|streamEndpoint|downloadUrl)/i.test(value)) return "[REDACTED]";
  return value;
}, 2));

const cleanup = async () => {
  await jsonDatabase.update((data) => {
    const ids = new Set(data.memberAccounts.filter((member) => member.memberId.includes("member-crm-smoke") || member.normalizedEmail.includes("member-crm-smoke")).map((member) => member.memberId));
    data.memberAccounts = data.memberAccounts.filter((member) => !ids.has(member.memberId));
    data.memberSessions = data.memberSessions.filter((session) => !ids.has(session.memberId));
    data.memberVerificationTokens = data.memberVerificationTokens.filter((token) => !ids.has(token.memberId));
    data.memberPasswordResetTokens = data.memberPasswordResetTokens.filter((token) => !ids.has(token.memberId));
    data.memberMembershipAssignments = data.memberMembershipAssignments.filter((assignment) => !ids.has(assignment.memberId));
    data.memberEntitlementGrants = data.memberEntitlementGrants.filter((grant) => !ids.has(grant.memberId));
    data.memberFavorites = data.memberFavorites.filter((item) => !ids.has(item.memberId));
    data.memberFollows = data.memberFollows.filter((item) => !ids.has(item.memberId));
    data.memberPlaylists = data.memberPlaylists.filter((item) => !ids.has(item.memberId));
    data.memberPlaylistItems = data.memberPlaylistItems.filter((item) => !ids.has(item.memberId));
    data.memberPlaybackHistory = data.memberPlaybackHistory.filter((item) => !ids.has(item.memberId));
    data.memberViewingHistory = data.memberViewingHistory.filter((item) => !ids.has(item.memberId));
    data.memberNotifications = data.memberNotifications.filter((item) => !ids.has(item.memberId));
    data.memberRecommendationFeedback = data.memberRecommendationFeedback.filter((item) => !ids.has(item.memberId));
    data.memberSavedSearches = data.memberSavedSearches.filter((item) => !ids.has(item.memberId));
    data.memberCollections = data.memberCollections.filter((item) => !ids.has(item.memberId));
    data.memberCollectionItems = data.memberCollectionItems.filter((item) => !ids.has(item.memberId));
    data.memberSupportNotes = data.memberSupportNotes.filter((item) => !ids.has(item.memberId));
    data.memberAccountFlags = data.memberAccountFlags.filter((item) => !ids.has(item.memberId));
    data.memberModerationRecords = data.memberModerationRecords.filter((item) => !ids.has(item.memberId));
    data.securityEvents = data.securityEvents.filter((event) => !ids.has(String(event.entityId ?? "")));
    data.adminAuditEvents = data.adminAuditEvents.filter((event) => !ids.has(String(event.entityId ?? "")) && !ids.has(String(event.actorId ?? "")));
  });
};

const prepareMember = async () => {
  const timestamp = new Date().toISOString();
  const memberId = marker;
  await jsonDatabase.update((data) => {
    data.memberAccounts.push({
      memberId,
      email: `${marker}@example.invalid`,
      normalizedEmail: `${marker}@example.invalid`,
      displayName: "CRM Smoke Member",
      username: marker,
      membershipTier: "Free Member",
      status: "Active",
      emailVerified: true,
      emailVerifiedAt: timestamp,
      passwordHash: "not-used-in-crm-smoke",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLogin: timestamp,
      failedLoginCount: 0,
      preferences: defaultMemberPreferences(),
      schemaVersion: 1,
      metadata: { authorizationVersion: 1 },
    });
    data.memberSessions.push({
      sessionId: `${marker}-session`,
      memberId,
      tokenHash: "not-used-in-crm-smoke",
      status: "active",
      rememberMe: false,
      createdAt: timestamp,
      lastActiveAt: timestamp,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      absoluteExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      deviceLabel: "CRM smoke browser",
    });
    data.memberFavorites.push({
      favoriteId: `${marker}-favorite`,
      memberId,
      resource: { resourceType: "release", resourceId: `${marker}-release`, title: "CRM Smoke Release" },
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    });
    data.memberFollows.push({
      followId: `${marker}-follow`,
      memberId,
      resource: { resourceType: "artist", resourceId: `${marker}-artist`, title: "CRM Smoke Artist" },
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    });
    data.memberPlaylists.push({
      playlistId: `${marker}-playlist`,
      memberId,
      name: "CRM Smoke Playlist",
      visibility: "private",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    });
    data.memberPlaybackHistory.push({
      historyId: `${marker}-history`,
      memberId,
      resource: { resourceType: "song", resourceId: `${marker}-song`, title: "CRM Smoke Song" },
      eventType: "played",
      lastPositionSeconds: 12,
      durationSeconds: 180,
      occurredAt: timestamp,
      schemaVersion: 1,
    });
    data.memberNotifications.push({
      notificationId: `${marker}-notification`,
      memberId,
      type: "system_message",
      title: "CRM Smoke Notification",
      body: "Synthetic notification for CRM verification.",
      delivery: { inApp: true, emailReady: false, pushReady: false, digestReady: false },
      status: "unread",
      createdAt: timestamp,
      schemaVersion: 1,
    });
    data.securityEvents.push({
      securityEventId: `${marker}-security`,
      eventType: "member_access_denied_repeated",
      severity: "warning",
      entityType: "member_account",
      entityId: memberId,
      summary: "Synthetic repeated denial signal for CRM risk verification.",
      metadata: {},
      createdAt: timestamp,
      schemaVersion: 1,
    });
  });
  await membershipAssignmentService.assignDefaultFreeTier(memberId);
  return memberId;
};

const noLeak = (payload, label) => {
  expect(!JSON.stringify(payload).match(/private\/|storagePath|privateObjectKey|signedUrl|signature=|fullSong|full-song|full_song|authorizationReference|streamEndpoint|downloadUrl/i), `${label} leaked protected delivery data.`);
};

const runHealth = async () => {
  const health = await memberHealthService.getOverallHealth();
  return {
    overallStatus: "available",
    ...health,
  };
};

const runVerify = async () => {
  await cleanup();
  const memberId = await prepareMember();
  try {
    const search = await memberSearchService.search(new URLSearchParams({ q: marker }));
    expect(search.some((member) => member.memberId === memberId), "Member search did not find the synthetic member.");

    const detailBefore = await memberAdministrationService.getDetail(memberId);
    expect(detailBefore.member.memberId === memberId, "Member detail did not load the requested member.");
    expect(detailBefore.sessions.length === 1, "Member session administration did not expose the active session.");
    expect(detailBefore.engagement.favorites.length === 1, "Member detail did not aggregate favorites.");
    expect(detailBefore.engagement.following.length === 1, "Member detail did not aggregate followed artists.");
    expect(detailBefore.engagement.playlists.length === 1, "Member detail did not aggregate playlists.");

    const supportNote = await memberSupportService.addNote(memberId, { subject: "CRM smoke support note", body: "Synthetic CRM support note.", status: "open" }, actorId);
    expect(supportNote.memberId === memberId, "Support note creation failed.");

    const warning = await memberModerationService.moderate(memberId, { action: "warn", reason: "Synthetic CRM moderation warning." }, actorId);
    expect(warning.action === "warn", "Moderation warning action failed.");

    const risk = await memberRiskService.calculate(memberId);
    expect(typeof risk.score === "number" && risk.score > 0, "Risk engine did not calculate a score.");

    const health = await memberHealthService.getMemberHealth(memberId);
    expect(health.verification === "complete" && health.favorites === 1, "Member health did not include identity and engagement status.");

    const timeline = await memberTimelineService.getTimeline(memberId);
    expect(timeline.some((event) => event.type === "support_action"), "Member timeline did not include support activity.");
    expect(timeline.some((event) => event.type === "moderator_action"), "Member timeline did not include moderation activity.");

    await memberAdministrationService.grantMembership(memberId, "premium", actorId);
    const premiumDetail = await memberAdministrationService.getDetail(memberId);
    expect(String(premiumDetail.member.membershipTier).toLowerCase().includes("premium"), "Membership grant did not update the member tier.");

    const revokeResult = await memberSessionAdministrationService.revokeAll(memberId, actorId);
    expect(revokeResult.revoked === 1, "Session revocation did not revoke the active session.");

    await memberModerationService.moderate(memberId, { action: "suspend", reason: "Synthetic CRM suspension." }, actorId);
    const suspended = await memberAdministrationService.getDetail(memberId);
    expect(suspended.member.status === "Suspended", "Suspension did not update the member account status.");

    await memberModerationService.moderate(memberId, { action: "restore", reason: "Synthetic CRM restore." }, actorId);
    const restored = await memberAdministrationService.getDetail(memberId);
    expect(restored.member.status === "Active", "Restore did not reactivate the member account status.");

    const dashboard = await memberCrmService.dashboard();
    expect(typeof dashboard.totalMembers === "number", "CRM dashboard did not generate totals.");

    const report = await memberSuccessService.report();
    expect(typeof report.engagementSignals === "number", "Member success report did not generate metrics.");

    noLeak({ detailBefore, premiumDetail, dashboard, report }, "Member CRM verification");
    return {
      search: true,
      detail: true,
      support: true,
      moderation: true,
      riskLevel: risk.level,
      timelineEvents: timeline.length,
      sessionRevoked: revokeResult.revoked,
      dashboard: true,
      report: true,
    };
  } finally {
    await cleanup();
  }
};

const result = command === "health" ? await runHealth() : await runVerify();

if (failures.length) {
  safePrint({ success: false, command, failures, result });
  process.exitCode = 1;
} else {
  safePrint({ success: true, command, result });
}
