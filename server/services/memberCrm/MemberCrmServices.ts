import { randomUUID } from "node:crypto";
import type { MemberAccount, MemberAccountResponse } from "../../models/members/MemberModels";
import type { MemberModerationAction, MemberRiskLevel, MemberSupportStatus } from "../../models/memberCrm/MemberCrmModels";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { sanitizeMemberAccount } from "../../models/members/MemberModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { membershipAssignmentService } from "../membership/MembershipAssignmentService";
import { membershipCatalogService } from "../membership/MembershipCatalogService";
import { memberIdentityService } from "../members/MemberIdentityService";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

const redactMember = (member: MemberAccount): MemberAccountResponse & { emailRedacted: string } => ({
  ...sanitizeMemberAccount(member),
  emailRedacted: member.email.replace(/^(.).+(@.+)$/, "$1***$2"),
});

export class MemberSearchService {
  async search(params: URLSearchParams) {
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const status = params.get("status") ?? "";
    const tier = params.get("tier") ?? "";
    const data = await jsonDatabase.read();
    return data.memberAccounts
      .filter((member) => !status || member.status === status)
      .filter((member) => !tier || member.membershipTier === tier || member.membershipTier.toLowerCase().includes(tier.toLowerCase()))
      .filter((member) => !query || [member.email, member.displayName, member.username, member.memberId, member.membershipTier, member.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 200)
      .map(redactMember);
  }
}

export class MemberRiskService {
  async calculate(memberId: string) {
    const data = await jsonDatabase.read();
    const member = data.memberAccounts.find((item) => item.memberId === memberId);
    if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member was not found.", 404);
    const failedLoginEvents = data.securityEvents.filter((event) => event.entityId === memberId && /login_failure|credential|suspicious/i.test(event.eventType)).length;
    const securityEvents = data.securityEvents.filter((event) => event.entityId === memberId).length;
    const activeSessions = data.memberSessions.filter((session) => session.memberId === memberId && session.status === "active").length;
    const activeFlags = data.memberAccountFlags.filter((flag) => flag.memberId === memberId && flag.status === "active");
    const moderation = data.memberModerationRecords.filter((record) => record.memberId === memberId && record.status === "active").length;
    const score = Math.min(100, failedLoginEvents * 12 + securityEvents * 4 + Math.max(0, activeSessions - 3) * 8 + activeFlags.length * 15 + moderation * 25 + (member.status === "Suspended" ? 35 : 0));
    const level: MemberRiskLevel = score >= 80 ? "critical" : score >= 55 ? "high" : score >= 25 ? "medium" : "low";
    return {
      score,
      level,
      failedLoginEvents,
      securityEvents,
      activeSessions,
      activeFlags: activeFlags.length,
      activeModerationActions: moderation,
      chargebackReadiness: "not_configured",
      botReadiness: "signals_only",
      checkedAt: now(),
    };
  }
}

export class MemberTimelineService {
  async getTimeline(memberId: string) {
    const data = await jsonDatabase.read();
    const events: Array<{ occurredAt: string; type: string; label: string; metadata?: Record<string, unknown> }> = [];
    const member = data.memberAccounts.find((item) => item.memberId === memberId);
    if (member) {
      events.push({ occurredAt: member.createdAt, type: "registered", label: "Member registered" });
      if (member.emailVerifiedAt) events.push({ occurredAt: member.emailVerifiedAt, type: "verified", label: "Email verified" });
      if (member.lastLogin) events.push({ occurredAt: member.lastLogin, type: "login", label: "Last login" });
    }
    data.memberMembershipAssignments.filter((item) => item.memberId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "membership_changed", label: `Membership ${item.status}`, metadata: { tierId: item.tierId, source: item.source } }));
    data.memberFavorites.filter((item) => item.memberId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "favorite_added", label: `Favorited ${item.resource.title ?? item.resource.resourceType}` }));
    data.memberFollows.filter((item) => item.memberId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "follow_added", label: `Followed ${item.resource.title ?? item.resource.resourceType}` }));
    data.memberPlaylists.filter((item) => item.memberId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "playlist_created", label: `Playlist created: ${item.name}` }));
    data.memberPlaybackHistory.filter((item) => item.memberId === memberId).slice(0, 50).forEach((item) => events.push({ occurredAt: item.occurredAt, type: "song_played", label: `${item.eventType}: ${item.resource.title ?? item.resource.resourceId}` }));
    data.memberNotifications.filter((item) => item.memberId === memberId && item.readAt).forEach((item) => events.push({ occurredAt: item.readAt ?? item.createdAt, type: "notification_opened", label: `Notification read: ${item.title}` }));
    data.securityEvents.filter((item) => item.entityId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "security_event", label: item.summary ?? item.eventType }));
    data.memberSupportNotes.filter((item) => item.memberId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "support_action", label: item.subject }));
    data.memberModerationRecords.filter((item) => item.memberId === memberId).forEach((item) => events.push({ occurredAt: item.createdAt, type: "moderator_action", label: `${item.action}: ${item.reason}` }));
    return events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 300);
  }
}

export class MemberHealthService {
  async getMemberHealth(memberId: string) {
    const data = await jsonDatabase.read();
    const member = data.memberAccounts.find((item) => item.memberId === memberId);
    if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member was not found.", 404);
    return {
      registration: "complete",
      verification: member.emailVerified ? "complete" : "pending",
      activity: member.lastLogin ? "active" : "inactive",
      favorites: data.memberFavorites.filter((item) => item.memberId === memberId && item.status === "active").length,
      following: data.memberFollows.filter((item) => item.memberId === memberId && item.status === "active").length,
      playlists: data.memberPlaylists.filter((item) => item.memberId === memberId && item.status === "active").length,
      history: data.memberPlaybackHistory.filter((item) => item.memberId === memberId).length,
      notifications: data.memberNotifications.filter((item) => item.memberId === memberId).length,
      security: data.securityEvents.filter((item) => item.entityId === memberId).length ? "review" : "normal",
      engagement: "tracked",
      retention: member.lastLogin ? "retained" : "new_or_inactive",
      checkedAt: now(),
    };
  }

  async getOverallHealth() {
    const data = await jsonDatabase.read();
    return {
      totalMembers: data.memberAccounts.length,
      activeMembers: data.memberAccounts.filter((member) => member.status === "Active").length,
      suspendedMembers: data.memberAccounts.filter((member) => member.status === "Suspended").length,
      supportOpen: data.memberSupportNotes.filter((note) => ["open", "escalated"].includes(note.status)).length,
      securityAlerts: data.securityEvents.length,
      checkedAt: now(),
    };
  }
}

export class MemberSupportService {
  async addNote(memberId: string, input: { subject?: string; body?: string; status?: MemberSupportStatus }, actorId: string) {
    const timestamp = now();
    const note = {
      supportNoteId: id("support-note"),
      memberId,
      status: input.status ?? "open",
      subject: String(input.subject ?? "Support note").slice(0, 160),
      body: String(input.body ?? "").slice(0, 2000),
      internal: true,
      createdBy: actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      if (!data.memberAccounts.some((member) => member.memberId === memberId)) throw new AuthApiError("MEMBER_NOT_FOUND", "Member was not found.", 404);
      data.memberSupportNotes.unshift(note);
    });
    await mediaAuditPersistenceService.record("member_support_note_created", note.subject, { actorId, entityType: "member_account", entityId: memberId });
    return note;
  }

  async list(memberId: string) {
    const data = await jsonDatabase.read();
    return data.memberSupportNotes.filter((note) => note.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class MemberModerationService {
  async moderate(memberId: string, input: { action?: MemberModerationAction; reason?: string; endsAt?: string }, actorId: string) {
    const action = input.action ?? "warn";
    const timestamp = now();
    const record = {
      moderationId: id("moderation"),
      memberId,
      action,
      status: "active" as const,
      reason: String(input.reason ?? "Administrative moderation action").slice(0, 1000),
      startsAt: timestamp,
      endsAt: input.endsAt,
      createdBy: actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      const member = data.memberAccounts.find((item) => item.memberId === memberId);
      if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member was not found.", 404);
      data.memberModerationRecords.unshift(record);
      if (["suspend", "temporary_ban"].includes(action)) member.status = "Suspended";
      if (action === "permanent_ban") member.status = "Disabled";
      if (action === "restore") member.status = "Active";
      member.updatedAt = timestamp;
    });
    await mediaAuditPersistenceService.record("member_moderation_action", `${action}: ${record.reason}`, { actorId, entityType: "member_account", entityId: memberId });
    return record;
  }

  async list(memberId: string) {
    const data = await jsonDatabase.read();
    return data.memberModerationRecords.filter((item) => item.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class MemberSessionAdministrationService {
  async list(memberId: string) {
    const data = await jsonDatabase.read();
    return data.memberSessions.filter((session) => session.memberId === memberId).map((session) => ({
      sessionId: session.sessionId,
      status: session.status,
      rememberMe: session.rememberMe,
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      expiresAt: session.expiresAt,
      deviceLabel: session.deviceLabel,
      revokedAt: session.revokedAt,
      revocationReason: session.revocationReason,
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async revoke(memberId: string, sessionId: string, actorId: string) {
    await memberIdentityService.revokeSession(sessionId, actorId, "admin_member_session_revoked");
    await mediaAuditPersistenceService.record("member_session_revoked_by_admin", `Admin revoked member session ${sessionId}.`, { actorId, entityType: "member_account", entityId: memberId });
  }

  async revokeAll(memberId: string, actorId: string) {
    const sessions = await this.list(memberId);
    await Promise.all(sessions.filter((session) => session.status === "active").map((session) => this.revoke(memberId, session.sessionId, actorId)));
    return { revoked: sessions.filter((session) => session.status === "active").length };
  }
}

export class MemberAdministrationService {
  async getDetail(memberId: string) {
    const data = await jsonDatabase.read();
    const member = data.memberAccounts.find((item) => item.memberId === memberId);
    if (!member) throw new AuthApiError("MEMBER_NOT_FOUND", "Member was not found.", 404);
    const [membership, membershipHistory, health, risk, timeline, sessions, support, moderation] = await Promise.all([
      membershipAssignmentService.getCurrentMembership(memberId),
      membershipAssignmentService.getMembershipHistory(memberId),
      memberHealthService.getMemberHealth(memberId),
      memberRiskService.calculate(memberId),
      memberTimelineService.getTimeline(memberId),
      memberSessionAdministrationService.list(memberId),
      memberSupportService.list(memberId),
      memberModerationService.list(memberId),
    ]);
    return {
      member: redactMember(member),
      membership,
      membershipHistory,
      engagement: {
        favorites: data.memberFavorites.filter((item) => item.memberId === memberId && item.status === "active"),
        following: data.memberFollows.filter((item) => item.memberId === memberId && item.status === "active"),
        playlists: data.memberPlaylists.filter((item) => item.memberId === memberId && item.status === "active"),
        playbackHistory: data.memberPlaybackHistory.filter((item) => item.memberId === memberId).slice(0, 50),
        viewingHistory: data.memberViewingHistory.filter((item) => item.memberId === memberId).slice(0, 50),
        notifications: data.memberNotifications.filter((item) => item.memberId === memberId).slice(0, 50),
        collections: data.memberCollections.filter((item) => item.memberId === memberId && item.status === "active"),
        recommendationFeedback: data.memberRecommendationFeedback.filter((item) => item.memberId === memberId).slice(0, 50),
      },
      sessions,
      securityEvents: data.securityEvents.filter((event) => event.entityId === memberId).slice(0, 50),
      auditEvents: data.adminAuditEvents.filter((event) => event.entityId === memberId || event.actorId === memberId).slice(0, 50),
      support,
      flags: data.memberAccountFlags.filter((flag) => flag.memberId === memberId),
      moderation,
      health,
      risk,
      timeline,
    };
  }

  async grantMembership(memberId: string, tierKey: string, actorId: string) {
    const tier = await membershipCatalogService.getTierByKey(tierKey);
    if (!tier) throw new AuthApiError("MEMBER_TIER_NOT_FOUND", "Membership tier was not found.", 404);
    return membershipAssignmentService.assignTier(memberId, tier.tierId, "admin_grant", actorId);
  }

  async revokeMembership(memberId: string, reason: string, actorId: string) {
    await membershipAssignmentService.revokeMembership(memberId, reason || "Admin revoked membership.", actorId);
    return this.getDetail(memberId);
  }

  async setAccountStatus(memberId: string, status: MemberAccount["status"], actorId: string) {
    await memberIdentityService.adminSetStatus(memberId, status, actorId);
    return this.getDetail(memberId);
  }
}

export class MemberCrmService {
  async dashboard() {
    const data = await jsonDatabase.read();
    const recentRegistrations = data.memberAccounts.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map(redactMember);
    return {
      totalMembers: data.memberAccounts.length,
      activeMembers: data.memberAccounts.filter((member) => member.status === "Active").length,
      inactiveMembers: data.memberAccounts.filter((member) => member.status !== "Active").length,
      premiumReady: data.memberAccounts.filter((member) => /premium/i.test(member.membershipTier)).length,
      supporterReady: data.memberAccounts.filter((member) => /supporter/i.test(member.membershipTier)).length,
      vipReady: data.memberAccounts.filter((member) => /vip/i.test(member.membershipTier)).length,
      recentRegistrations,
      recentUpgrades: data.memberMembershipAssignments.filter((item) => item.source === "admin_grant").slice(-10).reverse(),
      suspensions: data.memberAccounts.filter((member) => member.status === "Suspended").length,
      securityAlerts: data.securityEvents.length,
      supportQueue: data.memberSupportNotes.filter((note) => ["open", "escalated"].includes(note.status)).length,
      memberHealth: await memberHealthService.getOverallHealth(),
      checkedAt: now(),
    };
  }
}

export class MemberSuccessService {
  async report() {
    const data = await jsonDatabase.read();
    return {
      retentionSignals: data.memberAccounts.filter((member) => member.lastLogin).length,
      engagementSignals: data.memberFavorites.length + data.memberFollows.length + data.memberPlaylists.length + data.memberPlaybackHistory.length,
      supportVolume: data.memberSupportNotes.length,
      securityIncidentCount: data.securityEvents.length,
      generatedAt: now(),
    };
  }
}

export const memberSearchService = new MemberSearchService();
export const memberRiskService = new MemberRiskService();
export const memberTimelineService = new MemberTimelineService();
export const memberHealthService = new MemberHealthService();
export const memberSupportService = new MemberSupportService();
export const memberModerationService = new MemberModerationService();
export const memberSessionAdministrationService = new MemberSessionAdministrationService();
export const memberAdministrationService = new MemberAdministrationService();
export const memberCrmService = new MemberCrmService();
export const memberSuccessService = new MemberSuccessService();
