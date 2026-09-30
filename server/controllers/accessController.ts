import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { accessPolicyEvaluationService } from "../services/access/AccessPolicyEvaluationService";
import { effectiveEntitlementService } from "../services/access/EffectiveEntitlementService";
import { membershipAccessHealthService } from "../services/access/MembershipAccessHealthService";
import { protectedMediaAuthorizationService } from "../services/access/ProtectedMediaAuthorizationService";
import { memberIdentityService } from "../services/members/MemberIdentityService";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { jsonDatabase } from "../services/media/JsonDatabase";
import { membershipAssignmentService } from "../services/membership/MembershipAssignmentService";
import { membershipCatalogService } from "../services/membership/MembershipCatalogService";

export class AccessController {
  async publicTiers(_request: IncomingMessage, response: ServerResponse) {
    sendJson(response, 200, { success: true, data: await membershipCatalogService.getPublicTiers() });
  }

  async memberAccess(request: IncomingMessage, response: ServerResponse) {
    const session = await memberIdentityService.authenticateRequest(request);
    const entitlements = await effectiveEntitlementService.getForMember(session.member);
    const membership = await membershipAssignmentService.getCurrentMembership(session.member.memberId);
    sendJson(response, 200, {
      success: true,
      data: {
        membership: membership?.tier ? { tierKey: membership.tier.tierKey, name: membership.tier.name, status: membership.assignment?.status ?? "active", startsAt: membership.assignment?.startsAt, endsAt: membership.assignment?.endsAt } : undefined,
        capabilities: entitlements.allowed,
        entitlements: entitlements.allowed,
        authorizationVersion: entitlements.authorizationVersion,
      },
    });
  }

  async memberEntitlements(request: IncomingMessage, response: ServerResponse) {
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await effectiveEntitlementService.getForMember(session.member) });
  }

  async memberContentAccess(request: IncomingMessage, response: ServerResponse, contentType: string, contentId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    const decision = await accessPolicyEvaluationService.evaluateContentView({ type: "member", member: session.member }, { resourceType: contentType, resourceId: contentId, accessClassification: "registered_member" });
    sendJson(response, 200, { success: true, data: { decision } });
  }

  async authorizeStream(request: IncomingMessage, response: ServerResponse, mediaId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    const result = await protectedMediaAuthorizationService.authorizeStream({ type: "member", member: session.member }, { mediaId, sessionId: session.sessionId });
    sendJson(response, result.authorized ? 200 : 403, { success: result.authorized, data: result, errors: result.authorized ? undefined : [result.decision.safeMessage] });
  }

  async authorizeDownload(request: IncomingMessage, response: ServerResponse, mediaId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    const result = await protectedMediaAuthorizationService.authorizeDownload({ type: "member", member: session.member }, { mediaId, sessionId: session.sessionId });
    sendJson(response, result.authorized ? 200 : 403, { success: result.authorized, data: result, errors: result.authorized ? undefined : [result.decision.safeMessage] });
  }

  async adminCatalog(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    sendJson(response, 200, { success: true, data: await membershipCatalogService.ensureDefaultCatalog(auth.userId) });
  }

  async adminHealth(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "security.read");
    sendJson(response, 200, { success: true, data: await membershipAccessHealthService.getHealthReport() });
  }

  async adminGrantTier(request: IncomingMessage, response: ServerResponse, memberId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.manage");
    const body = await parseJsonBody(request) as { tierKey?: string; tierId?: string };
    const tier = body.tierId ? undefined : await membershipCatalogService.getTierByKey(body.tierKey ?? "free");
    const assignment = await membershipAssignmentService.assignTier(memberId, body.tierId ?? tier?.tierId ?? "tier-free", "admin_grant", auth.userId);
    sendJson(response, 200, { success: true, data: assignment });
  }

  async adminSimulate(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "users.read");
    const body = await parseJsonBody(request) as { subjectType?: "guest" | "member"; memberId?: string; resourceType?: string; resourceId?: string; action?: string; accessClassification?: never; requiredEntitlements?: string[] };
    let subject: Parameters<typeof accessPolicyEvaluationService.evaluate>[0] = { type: "guest" };
    if (body.subjectType === "member" && body.memberId) {
      const data = await jsonDatabase.read();
      const member = data.memberAccounts.find((item) => item.memberId === body.memberId);
      if (member) subject = { type: "member", member: { ...member, passwordHash: undefined } as never };
    }
    const decision = await accessPolicyEvaluationService.evaluate(subject, {
      resourceType: body.resourceType ?? "content",
      resourceId: body.resourceId,
      action: body.action ?? "view",
      accessClassification: body.accessClassification ?? "public",
      requiredEntitlements: body.requiredEntitlements,
    });
    sendJson(response, 200, { success: true, data: { decision } });
  }
}

export const accessController = new AccessController();
