import { createOpaqueToken, hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import type { AccessSubject } from "../access/AccessPolicyEvaluationService";
import type { MediaStorageObject } from "../../models/mediaModels";
import type { MediaDeliveryProfileRecord, ProtectedMediaResourceRecord } from "../../models/protectedContent/ProtectedContentModels";
import { evaluateSongAction, songMediaMatches, ensureSongUsagePersistence } from "../access/SongUsageService";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { protectedPlaybackSessionService } from "./ProtectedPlaybackSessionService";

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
    const saved = await jsonDatabase.listCollection("mediaDeliveryProfiles");
    if (defaultProfiles().every((profile) => saved.some((item) => item.profileKey === profile.profileKey))) return saved;
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

  async authorizeReleaseStream(subject: AccessSubject, input: { releaseSlugOrId: string; sessionId: string; playbackContext?: Record<string, unknown> }) {
    if (!subject.member) return { authorized: false, safeAccessState: "authentication_required", errorCode: "PROTECTED_CONTENT_AUTHENTICATION_REQUIRED" };
    const data = await jsonDatabase.read();
    const release = data.releaseRecords.find((item) => item.slug === input.releaseSlugOrId || item.releaseId === input.releaseSlugOrId);
    if (!release || release.status !== "published" || release.publicationState !== "published") {
      return { authorized: false, safeAccessState: "unavailable", errorCode: "PROTECTED_CONTENT_UNAVAILABLE" };
    }
    const requirement = data.contentEntitlementRequirements.find((item) => item.contentType === "release" && item.contentId === release.releaseId && item.status === "active");
    const mediaId = requirement?.streamAssetId ?? (typeof release.metadata?.fullSongAssetId === "string" ? release.metadata.fullSongAssetId : "");
    if (!mediaId) return { authorized: false, safeAccessState: "unavailable", errorCode: "PROTECTED_MEDIA_NOT_READY" };

    return this.authorize(subject, {
      mediaId,
      sessionId: input.sessionId,
      action: "stream",
      entitlementKey: "audio.stream.full",
    });
  }

  async authorizeDownload(subject: AccessSubject, input: { mediaId: string; sessionId: string }) {
    return this.authorize(subject, { mediaId: input.mediaId, sessionId: input.sessionId, action: "download", entitlementKey: "audio.download" });
  }

  private async authorize(subject: AccessSubject, input: { mediaId: string; sessionId: string; action: "stream" | "download"; entitlementKey: string; authorizationEntitlementKey?: string; metadata?: Record<string, unknown> }) {
    await ensureSongUsagePersistence();
    await this.ensureDefaultProfiles();
    const resolved = await this.resolveResource(input.mediaId, input.action);
    if (!resolved || resolved.resource.status !== "ready") {
      return { authorized: false, safeAccessState: "unavailable", errorCode: "PROTECTED_MEDIA_NOT_READY" };
    }
    if (!Number.isSafeInteger(resolved.profile.tokenTtlSeconds) || resolved.profile.tokenTtlSeconds < 1 || resolved.profile.tokenTtlSeconds > 900) return { authorized: false, safeAccessState: "unavailable", errorCode: "SONG_DELIVERY_INVALID" };

    if (resolved.resource.contentType === "release") {
      if (!subject.member) return { authorized: false, safeAccessState: "authentication_required", errorCode: "PROTECTED_CONTENT_AUTHENTICATION_REQUIRED" };
      const check = evaluateSongAction(await jsonDatabase.read(), subject.member.memberId, resolved.resource.contentId, input.action);
      if (!check.allowed) return { authorized: false, safeAccessState: "upgrade_required", errorCode: check.reasonCode };
    } else return { authorized: false, safeAccessState: "unavailable", errorCode: "PROTECTED_CONTENT_UNAVAILABLE" };

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
      entitlementKey: input.authorizationEntitlementKey ?? input.entitlementKey,
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
      metadata: { storageObjectId: resolved.storage.storageObjectId, profileKey: resolved.profile.profileKey, ...input.metadata },
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      const check = evaluateSongAction(data, record.memberId, record.resourceId, input.action);
      if (!check.allowed || !songMediaMatches(data, record.resourceId, resolved.resource.mediaAssetId, input.action)) throw new AuthApiError(check.reasonCode, "Song access is unavailable.", 403);
      if (resolved.profile.deliveryMode !== "protected_gateway" || !resolved.profile.allowedActions.includes(input.action) || resolved.profile.publicCacheAllowed || (input.action === "download" && !resolved.profile.downloadAllowed)) throw new AuthApiError("SONG_DELIVERY_INVALID", "Song delivery is unavailable.", 403);
      const storage = data.mediaStorageObjects.find((item) => item.storageObjectId === resolved.storage.storageObjectId);
      const asset = data.mediaAssets.find((item) => item.assetId === resolved.resource.mediaAssetId);
      if (!storage || storage.publicUrl || !storage.mimeType.startsWith("audio/") || !["private", "signed", "admin_only"].includes(storage.accessLevel) || !["ready", "uploaded"].includes(storage.status) || !asset || ["archived", "deleted"].includes(asset.status)) throw new AuthApiError("SONG_MEDIA_UNAVAILABLE", "Song delivery is unavailable.", 404);
      record.authorizationVersion = check.authorizationVersion;
      record.membershipVersion = check.authorizationVersion;
      record.entitlementKey = check.mode === "single_play" ? "audio.stream.full.single_play" : input.entitlementKey;
      record.metadata = { ...record.metadata, ...(check.mode === "single_play" ? { allowance: "free_single_full_play", releaseId: record.resourceId } : {}) };
      data.protectedMediaAuthorizations.push(record);
      data.memberAccessHistory.push({ accessHistoryId: `access-${authorizationId}`, memberId: record.memberId, resourceType: "release", resourceId: record.resourceId, action: `song_${input.action}_authorized`, decision: "allow", reasonCode: check.reasonCode, occurredAt: record.issuedAt, metadataSafe: { tierKey: check.tierKey, authorizationVersion: check.authorizationVersion }, schemaVersion: 1 });
    });

    const endpoint = input.action === "stream"
      ? `/api/member/media/stream/${encodeURIComponent(authorizationReference)}`
      : `/api/member/media/download/${encodeURIComponent(authorizationReference)}`;
    const playback = input.action === "stream" ? await protectedPlaybackSessionService.create({ memberId: record.memberId, sessionId: input.sessionId, mediaAssetId: resolved.resource.mediaAssetId, contentId: record.resourceId, authorizationId: record.authorizationId }) : undefined;
    return {
      authorized: true,
      authorizationReference,
      playbackSessionId: playback?.playbackSessionId,
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
    if (existing && existing.status !== "ready") return undefined;
    const assetId = existing?.mediaAssetId ?? mediaId;
    const storage = data.mediaStorageObjects.find((item) => item.assetId === assetId || item.storageObjectId === assetId);
    if (!storage || storage.accessLevel === "public" || storage.status === "deleted" || storage.status === "archived") return undefined;
    const releases = data.releaseRecords.filter((item) => songMediaMatches(data, item.releaseId, storage.assetId ?? "", action));
    if (releases.length !== 1) return undefined;
    const profiles = data.mediaDeliveryProfiles.length ? data.mediaDeliveryProfiles : await this.ensureDefaultProfiles();
    const profile = profiles.find((item) => item.profileKey === (action === "download" ? "protected_download" : "protected_audio_stream"));
    if (!profile) return undefined;
    if (existing && existing.contentType === "release" && existing.contentId === releases[0].releaseId && existing.storageProvider === storage.provider && existing.privateObjectKey === storage.storageObjectId && existing.fileSize === storage.fileSizeBytes && existing.mimeType === storage.mimeType && existing.checksum === storage.checksum) return { resource: existing, profile, storage };
    const now = nowIso();
    const resource: ProtectedMediaResourceRecord = {
      protectedMediaResourceId: existing?.protectedMediaResourceId ?? `protected-resource-${storage.assetId ?? storage.storageObjectId}`,
      mediaAssetId: storage.assetId ?? storage.storageObjectId,
      contentType: "release",
      contentId: releases[0].releaseId,
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
      const index = next.protectedMediaResources.findIndex((item) => item.protectedMediaResourceId === resource.protectedMediaResourceId);
      if (index >= 0) next.protectedMediaResources[index] = resource;
      else next.protectedMediaResources.push(resource);
    });
    return { resource, profile, storage };
  }
}

export const protectedContentDeliveryAuthorizationService = new ProtectedContentDeliveryAuthorizationService();
