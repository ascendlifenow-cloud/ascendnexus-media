import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import type { MemberAccountStatus } from "../models/members/MemberModels";
import type { MemberModerationAction, MemberSupportStatus } from "../models/memberCrm/MemberCrmModels";
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
} from "../services/memberCrm/MemberCrmServices";

export class AdminMemberCrmController {
  private async auth(request: IncomingMessage, permission: "users.read" | "users.manage" = "users.read") {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, permission);
    return auth;
  }

  async dashboard(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberCrmService.dashboard() });
  }

  async search(request: IncomingMessage, response: ServerResponse, url: URL) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberSearchService.search(url.searchParams) });
  }

  async detail(request: IncomingMessage, response: ServerResponse, memberId: string) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberAdministrationService.getDetail(memberId) });
  }

  async timeline(request: IncomingMessage, response: ServerResponse, memberId: string) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberTimelineService.getTimeline(memberId) });
  }

  async health(request: IncomingMessage, response: ServerResponse, memberId?: string) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: memberId ? await memberHealthService.getMemberHealth(memberId) : await memberHealthService.getOverallHealth() });
  }

  async risk(request: IncomingMessage, response: ServerResponse, memberId: string) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberRiskService.calculate(memberId) });
  }

  async grantMembership(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { tierKey?: string };
    sendJson(response, 200, { success: true, data: await memberAdministrationService.grantMembership(memberId, body.tierKey ?? "free", auth.userId) });
  }

  async revokeMembership(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { reason?: string };
    sendJson(response, 200, { success: true, data: await memberAdministrationService.revokeMembership(memberId, body.reason ?? "Admin revoked membership.", auth.userId) });
  }

  async setStatus(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { status?: MemberAccountStatus };
    sendJson(response, 200, { success: true, data: await memberAdministrationService.setAccountStatus(memberId, body.status ?? "Active", auth.userId) });
  }

  async sessions(request: IncomingMessage, response: ServerResponse, memberId: string) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberSessionAdministrationService.list(memberId) });
  }

  async revokeSession(request: IncomingMessage, response: ServerResponse, memberId: string, sessionId?: string) {
    const auth = await this.auth(request, "users.manage");
    const result = sessionId ? await memberSessionAdministrationService.revoke(memberId, sessionId, auth.userId).then(() => ({ revoked: 1 })) : await memberSessionAdministrationService.revokeAll(memberId, auth.userId);
    sendJson(response, 200, { success: true, data: result });
  }

  async supportNote(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { subject?: string; body?: string; status?: MemberSupportStatus };
    sendJson(response, 201, { success: true, data: await memberSupportService.addNote(memberId, body, auth.userId) });
  }

  async moderation(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { action?: MemberModerationAction; reason?: string; endsAt?: string };
    sendJson(response, 201, { success: true, data: await memberModerationService.moderate(memberId, body, auth.userId) });
  }

  async report(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await memberSuccessService.report() });
  }
}

export const adminMemberCrmController = new AdminMemberCrmController();
