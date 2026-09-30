import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { accessAuditService } from "../access/AccessAuditService";
import { accessPolicyEvaluationService, type AccessSubject } from "../access/AccessPolicyEvaluationService";
import type { MediaStorageObject } from "../../models/mediaModels";
import type { MediaDeliveryProfileRecord, ProtectedMediaResourceRecord } from "../../models/protectedContent/ProtectedContentModels";

const nowIso = () => new Date().toISOString();

const defaultProfiles = (): MediaDeliveryProfileRecord[] => {
  const now = nowIso();
  return [
    {
      deliveryProfileId: "profile-protected-audio-stream",
      profileKey: "protected_audio_stream",
      name: "Protected audio stream",
      mediaType: "audio",
      accessClassification: "protected_stream",
      deliveryMode: "protected_gateway",
      requiredEntitlementKey: "audio.stream.full",
      allowedActions: ["stream"],
      tokenTtlSeconds: 300,
      rangeRequestsAllowed: true,
      downloadAllowed: false,
      publicCacheAllowed: false,
      privateCacheAllowed: false,
      cdnAllowed: false,
      sessionBindingRequired: true,
      memberBindingRequired: true,
      watermarkingReadiness: "disabled",
      status: "active",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    },
    {
      deliveryProfileId: "profile-protected-download",
      profileKey: "protected_download",
      name: "Protected download",
      mediaType: "audio",
      accessClassification: "protected_download",
      deliveryMode: "protected_gateway",
      requiredEntitlementKey: "audio.download",
      allowedActions: ["download"],
      tokenTtlSeconds: 180,
      maxUses: 1,
      rangeRequestsAllowed: false,
      downloadAllowed: true,
      publicCacheAllowed: false,
      privateCacheAllowed: false,
      cdnAllowed: false,
      sessionBindingRequired: true,
      memberBindingRequired: true,
      watermarkingReadiness: "disabled",
      status: "active",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    },
  ];
};

export class ProtectedContentDeliveryAuthorizationService {
  async ensureDefaultProfiles() {
    await jsonDatabase.update((data) => {
      const existing = new Set(data.mediaDeliveryProfiles.map((profile) => profile.profileKey));
      for (const profile of defaultProfiles()) {
        if (!existing.has(profile.profileKey)) data.mediaDeliveryProfiles.push(profile);
      }
    });
    return (await jsonDatabase.read()).mediaDeliveryProfiles;
  }

  async authorizeStream(subject: AccessSubject, input: { mediaId: string; sessionId: string; playbackContext?: Record<string, unknown> }) {
    return this.authorize(subject, { mediaId: input.mediaId, sessionId: input.sessionId, action: "stream", entitlementKey: "audio.stream.full" });
  }

  async authorizeDownload(subject: AccessSubject, input: { mediaId: string; sessionId: string }) {
    return this.authorize(subject, { mediaId: input.mediaId, sessionId: input.sessionId, action: "download", entitlementKey: "audio.download" });
  }

  private async authorize(subject: AccessSubject, input: { mediaId: string; sessionId: string; action: "stream" | "download"; entitlementKey: string }) {
    await this.ensureDefaultProfiles();
    const resolved = await this.resolveResource(input.mediaId, input.action);
    if (!resolved || resolved.resource.status !== "ready") {
      return { authorized: false, safeAccessState: "unavailable", errorCode: "PROTECTED_MEDIA_NOT_READY" };
    }

    const decision = input.action === "stream"
      ? await accessPolicyEvaluationService.evaluateMediaStream(subject, { resourceType: resolved.resource.contentType, resourceId: resolved.resource.contentId, requiredEntitlements: [input.entitlementKey] })
      : await accessPolicyEvaluationService.evaluateMediaDownload(subject, { resourceType: resolved.resource.contentType, resourceId: resolved.resource.contentId, requiredEntitlements: [input.entitlementKey] });
    await accessAuditService.recordDecision(decision, { memberId: subject.member?.memberId, sessionId: input.sessionId });
    if (!decision.allowed || !subject.member) {
      return { authorized: false, decision, safeAccessState: decision.decision === "challenge_authentication" ? "authentication_required" : "upgrade_required", errorCode: "PROTECTED_CONTENT_ACCESS_DENIED" };
    }

    const token = createOpaqueToken();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + resolved.profile.tokenTtlSeconds * 1000).toISOString();
    const authorizationId = `protected-auth-${Date.now()}-${createOpaqueToken(6)}`;
    const authorizationReference = `${authorizationId}.${token}`;
    const record = {
      authorizationId,
      authorizationReference: authorizationId,
      memberId: subject.member.memberId,
      mediaId: input.mediaId,
      mediaAssetId: resolved.resource.mediaAssetId,
      resourceType: resolved.resource.contentType,
      resourceId: resolved.resource.contentId,
      action: input.action,
      entitlementKey: input.entitlementKey,
      accessPolicyVersion: resolved.resource.accessPolicyId,
      membershipVersion: subject.member.authorizationVersion ?? 1,
      authorizationVersion: subject.member.authorizationVersion ?? 1,
      deliveryMode: resolved.profile.deliveryMode,
      issuedAt: issuedAt.toISOString(),
      expiresAt,
      status: "active" as const,
      authorizationTokenHash: hashSecret(token),
      sessionIdHash: hashSecret(input.sessionId),
      maxUses: input.action === "download" ? resolved.profile.maxUses ?? 1 : undefined,
      useCount: 0,
      metadata: { storageObjectId: resolved.storage.storageObjectId, profileKey: resolved.profile.profileKey },
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      data.protectedMediaAuthorizations.push(record);
    });

    const endpoint = input.action === "stream"
      ? `/api/member/media/stream/${encodeURIComponent(authorizationReference)}`
      : `/api/member/media/download/${encodeURIComponent(authorizationReference)}`;
    return {
      authorized: true,
      authorizationReference,
      deliveryMode: resolved.profile.deliveryMode,
      streamEndpoint: input.action === "stream" ? endpoint : undefined,
      downloadEndpoint: input.action === "download" ? endpoint : undefined,
      expiresAt,
      mimeType: resolved.resource.mimeType,
      duration: resolved.resource.duration,
      rangeSupported: resolved.profile.rangeRequestsAllowed,
      contentLength: resolved.resource.fileSize,
      refreshAllowed: input.action === "stream",
      safeAccessState: "allowed",
      cacheControl: "private, no-store",
    };
  }

  async resolveResource(mediaId: string, action: "stream" | "download" = "stream"): Promise<{ resource: ProtectedMediaResourceRecord; profile: MediaDeliveryProfileRecord; storage: MediaStorageObject } | undefined> {
    const data = await jsonDatabase.read();
    const existing = data.protectedMediaResources.find((resource) => resource.mediaAssetId === mediaId || resource.protectedMediaResourceId === mediaId);
    if (existing) {
      const profile = data.mediaDeliveryProfiles.find((item) => item.deliveryProfileId === existing.deliveryProfileId && item.status === "active");
      const storage = data.mediaStorageObjects.find((item) => item.assetId === existing.mediaAssetId || item.storageObjectId === existing.privateObjectKey);
      return profile && storage ? { resource: existing, profile, storage } : undefined;
    }
    const storage = data.mediaStorageObjects.find((item) => item.assetId === mediaId || item.storageObjectId === mediaId);
    if (!storage || storage.accessLevel === "public" || storage.status === "deleted" || storage.status === "archived") return undefined;
    const profiles = await this.ensureDefaultProfiles();
    const profile = profiles.find((item) => item.profileKey === (action === "download" ? "protected_download" : "protected_audio_stream"));
    if (!profile) return undefined;
    const now = nowIso();
    const resource: ProtectedMediaResourceRecord = {
      protectedMediaResourceId: `protected-resource-${storage.assetId ?? storage.storageObjectId}`,
      mediaAssetId: storage.assetId ?? storage.storageObjectId,
      contentType: storage.assetType === "full_song" ? "release" : "media",
      contentId: String(storage.metadata?.releaseId ?? storage.metadata?.targetId ?? storage.assetId ?? storage.storageObjectId),
      mediaType: storage.mediaCategory,
      deliveryProfileId: profile.deliveryProfileId,
      storageProvider: storage.provider,
      privateObjectKey: storage.storageObjectId,
      mimeType: storage.mimeType,
      fileSize: storage.fileSizeBytes,
      checksum: storage.checksum,
      status: storage.status === "ready" || storage.status === "uploaded" ? "ready" : "processing",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    await jsonDatabase.update((next) => {
      if (!next.protectedMediaResources.some((item) => item.protectedMediaResourceId === resource.protectedMediaResourceId)) next.protectedMediaResources.push(resource);
    });
    return { resource, profile, storage };
  }
}

export const protectedContentDeliveryAuthorizationService = new ProtectedContentDeliveryAuthorizationService();
