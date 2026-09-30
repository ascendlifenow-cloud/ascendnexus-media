import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { memberIdentityService } from "../services/members/MemberIdentityService";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { effectiveEntitlementService } from "../services/access/EffectiveEntitlementService";
import { membershipAssignmentService } from "../services/membership/MembershipAssignmentService";
import { setCookie } from "../utils/auth/authCookieUtils";

export class MemberAuthController {
  private async buildAuthorizationSummary(member: Awaited<ReturnType<typeof memberIdentityService.authenticateRequest>>["member"]) {
    const entitlements = await effectiveEntitlementService.getForMember(member);
    const membership = await membershipAssignmentService.getCurrentMembership(member.memberId);
    return {
      membership: membership?.tier ? {
        tierKey: membership.tier.tierKey,
        name: membership.tier.name,
        status: membership.assignment?.status ?? "active",
        startsAt: membership.assignment?.startsAt,
        endsAt: membership.assignment?.endsAt,
      } : undefined,
      entitlements: entitlements.allowed,
      capabilities: entitlements.allowed,
      authorizationVersion: entitlements.authorizationVersion,
    };
  }

  async register(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { email?: string; password?: string; displayName?: string; acceptTerms?: boolean; acceptPrivacy?: boolean; newsletterOptIn?: boolean };
    sendJson(response, 201, { success: true, data: await memberIdentityService.register(request, body) });
  }

  async login(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { email?: string; password?: string; rememberMe?: boolean };
    const result = await memberIdentityService.login(request, body);
    setCookie(response, memberIdentityService.buildSessionCookie(result.sessionToken, result.sessionExpiresAt));
    sendJson(response, 200, { success: true, data: { authenticated: true, member: result.member, sessionId: result.sessionId, sessionExpiresAt: result.sessionExpiresAt, redirectTo: "/member", authorization: await this.buildAuthorizationSummary(result.member) } });
  }

  async logout(request: IncomingMessage, response: ServerResponse) {
    await memberIdentityService.logout(request);
    setCookie(response, memberIdentityService.buildClearSessionCookie());
    sendJson(response, 200, { success: true });
  }

  async session(request: IncomingMessage, response: ServerResponse) {
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { ...session, authorization: await this.buildAuthorizationSummary(session.member) } });
  }

  async verifyEmail(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { token?: string };
    sendJson(response, 200, { success: true, data: await memberIdentityService.verifyEmail(body.token ?? "") });
  }

  async resendVerification(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { email?: string };
    sendJson(response, 200, { success: true, data: await memberIdentityService.resendVerification(request, body.email ?? "") });
  }

  async requestPasswordReset(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { email?: string };
    sendJson(response, 200, { success: true, data: await memberIdentityService.requestPasswordReset(request, body.email ?? "") });
  }

  async resetPassword(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { token?: string; password?: string; newPassword?: string };
    sendJson(response, 200, { success: true, data: await memberIdentityService.resetPassword(body.token ?? "", body.newPassword ?? body.password ?? "") });
  }

  async changePassword(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { currentPassword?: string; newPassword?: string };
    const member = await memberIdentityService.changePassword(request, body.currentPassword ?? "", body.newPassword ?? "");
    setCookie(response, memberIdentityService.buildClearSessionCookie());
    sendJson(response, 200, { success: true, data: { member } });
  }

  async account(request: IncomingMessage, response: ServerResponse) {
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { member: session.member, sessionId: session.sessionId, sessionExpiresAt: session.sessionExpiresAt, authorization: await this.buildAuthorizationSummary(session.member) } });
  }

  async updateProfile(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as { displayName?: string; avatar?: string; bio?: string };
    sendJson(response, 200, { success: true, data: { member: await memberIdentityService.updateProfile(request, body) } });
  }

  async updatePreferences(request: IncomingMessage, response: ServerResponse) {
    const body = await parseJsonBody(request) as Record<string, unknown>;
    sendJson(response, 200, { success: true, data: { member: await memberIdentityService.updatePreferences(request, body as never) } });
  }

  async sessions(request: IncomingMessage, response: ServerResponse) {
    sendJson(response, 200, { success: true, data: await memberIdentityService.listSessions(request) });
  }

  async revokeSession(request: IncomingMessage, response: ServerResponse, sessionId: string) {
    sendJson(response, 200, { success: true, data: await memberIdentityService.revokeOwnSession(request, sessionId) });
  }

  async deleteAccount(request: IncomingMessage, response: ServerResponse) {
    const result = await memberIdentityService.deleteAccount(request);
    setCookie(response, memberIdentityService.buildClearSessionCookie());
    sendJson(response, 200, { success: true, data: result });
  }

  async adminMembers(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: await memberIdentityService.adminListMembers() });
  }

  async adminMember(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: await memberIdentityService.adminGetMember(memberId) });
  }

  async adminSetStatus(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.manage");
    const body = await parseJsonBody(request) as { status?: never };
    sendJson(response, 200, { success: true, data: await memberIdentityService.adminSetStatus(memberId, body.status ?? "Disabled", auth.userId) });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    if (!auth.permissions.includes("security.read") && !auth.permissions.includes("users.read")) mediaAuthorizationService.requirePermission(auth, "security.read");
    sendJson(response, 200, { success: true, data: await memberIdentityService.getHealth() });
  }
}

export const memberAuthController = new MemberAuthController();
