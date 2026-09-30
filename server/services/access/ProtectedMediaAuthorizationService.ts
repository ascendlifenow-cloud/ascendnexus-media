import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { accessAuditService } from "./AccessAuditService";
import { accessPolicyEvaluationService, type AccessSubject } from "./AccessPolicyEvaluationService";

export class ProtectedMediaAuthorizationService {
  async authorizeStream(subject: AccessSubject, input: { mediaId: string; resourceType?: string; resourceId?: string; requiredEntitlements?: string[]; sessionId?: string }) {
    const decision = await accessPolicyEvaluationService.evaluateMediaStream(subject, {
      resourceType: input.resourceType ?? "media",
      resourceId: input.resourceId ?? input.mediaId,
      requiredEntitlements: input.requiredEntitlements,
    });
    await accessAuditService.recordDecision(decision, { memberId: subject.member?.memberId, sessionId: input.sessionId });
    if (!decision.allowed || !subject.member) return { authorized: false, decision };
    return this.createAuthorization(subject.member.memberId, input.mediaId, input.resourceType ?? "media", input.resourceId ?? input.mediaId, "stream", "audio.stream.full", input.sessionId);
  }

  async authorizeDownload(subject: AccessSubject, input: { mediaId: string; resourceType?: string; resourceId?: string; requiredEntitlements?: string[]; sessionId?: string }) {
    const decision = await accessPolicyEvaluationService.evaluateMediaDownload(subject, {
      resourceType: input.resourceType ?? "media",
      resourceId: input.resourceId ?? input.mediaId,
      requiredEntitlements: input.requiredEntitlements,
    });
    await accessAuditService.recordDecision(decision, { memberId: subject.member?.memberId, sessionId: input.sessionId });
    if (!decision.allowed || !subject.member) return { authorized: false, decision };
    return this.createAuthorization(subject.member.memberId, input.mediaId, input.resourceType ?? "media", input.resourceId ?? input.mediaId, "download", "audio.download", input.sessionId);
  }

  private async createAuthorization(memberId: string, mediaId: string, resourceType: string, resourceId: string, action: "stream" | "download", entitlementKey: string, sessionId?: string) {
    const token = createOpaqueToken();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60 * 1000).toISOString();
    const authorizationId = `media-auth-${Date.now()}-${createOpaqueToken(6)}`;
    await jsonDatabase.update((data) => {
      data.protectedMediaAuthorizations.push({
        authorizationId,
        memberId,
        mediaId,
        resourceType,
        resourceId,
        action,
        entitlementKey,
        issuedAt: issuedAt.toISOString(),
        expiresAt,
        status: "active",
        authorizationTokenHash: hashSecret(token),
        sessionIdHash: sessionId ? hashSecret(sessionId) : undefined,
        maxUses: action === "download" ? 1 : undefined,
        useCount: 0,
        schemaVersion: 1,
      });
    });
    return {
      authorized: true,
      authorizationId,
      expiresAt,
      token,
      cacheControl: "private, no-store",
      stream: action === "stream" ? { mode: "authorized", ttlSeconds: 300 } : undefined,
      download: action === "download" ? { mode: "authorized", ttlSeconds: 300 } : undefined,
    };
  }
}

export const protectedMediaAuthorizationService = new ProtectedMediaAuthorizationService();
