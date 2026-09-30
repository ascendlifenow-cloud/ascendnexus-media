import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { memberIdentityService } from "../services/members/MemberIdentityService";
import { memberDashboardService } from "../services/memberPortal/MemberDashboardService";
import { memberPortalHealthService } from "../services/memberPortal/MemberPortalHealthService";
import { memberPortalCacheService } from "../services/memberPortal/MemberPortalCacheService";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";

const privateMemberHeaders = (response: ServerResponse) => {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
};

export class MemberPortalController {
  async dashboard(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await memberDashboardService.getDashboard(session.member) });
  }

  async profile(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { member: session.member } });
  }

  async updateProfile(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const body = await parseJsonBody(request) as { displayName?: string; avatar?: string; bio?: string };
    const member = await memberIdentityService.updateProfile(request, body);
    memberPortalCacheService.invalidateMember(member.memberId);
    sendJson(response, 200, { success: true, data: { member } });
  }

  async preferences(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { preferences: session.member.preferences } });
  }

  async updatePreferences(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const body = await parseJsonBody(request) as never;
    const member = await memberIdentityService.updatePreferences(request, body);
    memberPortalCacheService.invalidateMember(member.memberId);
    sendJson(response, 200, { success: true, data: { member, preferences: member.preferences } });
  }

  async membership(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    const dashboard = await memberDashboardService.getDashboard(session.member);
    sendJson(response, 200, { success: true, data: { membership: dashboard.membership, capabilities: dashboard.capabilities, membershipCta: dashboard.membershipCta } });
  }

  async earlyAccess(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { items: await memberDashboardService.getEarlyAccess(session.member) } });
  }

  async exclusiveContent(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { items: await memberDashboardService.getExclusiveContent(session.member) } });
  }

  async recommendations(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    const dashboard = await memberDashboardService.getDashboard(session.member);
    sendJson(response, 200, { success: true, data: { items: dashboard.recommendations } });
  }

  async announcements(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { items: await memberDashboardService.getAnnouncements(session.member) } });
  }

  async sessions(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    sendJson(response, 200, { success: true, data: await memberIdentityService.listSessions(request) });
  }

  async revokeSession(request: IncomingMessage, response: ServerResponse, sessionId: string) {
    privateMemberHeaders(response);
    sendJson(response, 200, { success: true, data: await memberIdentityService.revokeOwnSession(request, sessionId) });
  }

  async revokeOtherSessions(request: IncomingMessage, response: ServerResponse) {
    privateMemberHeaders(response);
    const context = await memberIdentityService.authenticateRequest(request);
    const sessions = await memberIdentityService.listSessions(request);
    await Promise.all(sessions.filter((session) => !session.current).map((session) => memberIdentityService.revokeSession(session.sessionId, context.member.memberId, "member_other_sessions_revoked")));
    sendJson(response, 200, { success: true, data: { revoked: sessions.filter((session) => !session.current).length } });
  }

  async adminHealth(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    if (!auth.permissions.includes("system.health.read") && !auth.permissions.includes("users.read")) mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: await memberPortalHealthService.getHealthReport() });
  }
}

export const memberPortalController = new MemberPortalController();
