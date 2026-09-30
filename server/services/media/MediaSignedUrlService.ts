import crypto from "node:crypto";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";

export class MediaSignedUrlService {
  private getLocalSigningSecret(): string {
    return mediaBackendConfig.devAdminToken || `${mediaBackendConfig.bucket}:local-admin-preview`;
  }

  private createLocalPreviewToken(input: { storageObjectId: string; purpose: string; expiresAtMs: number }): string {
    return crypto
      .createHmac("sha256", this.getLocalSigningSecret())
      .update(`${input.storageObjectId}:${input.purpose}:${input.expiresAtMs}`)
      .digest("hex");
  }

  validateLocalPreviewToken(input: { storageObjectId: string; purpose?: string; expires?: string | null; token?: string | null }): boolean {
    const expiresAtMs = Number(input.expires);
    const purpose = input.purpose || "admin_preview";
    if (!input.token || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return false;
    const expected = this.createLocalPreviewToken({ storageObjectId: input.storageObjectId, purpose, expiresAtMs });
    if (expected.length !== input.token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.token));
  }

  async getSignedUrl(input: { assetId?: string; storageObjectId?: string; purpose?: string; expiration?: number; actorId?: string }) {
    if (!input.assetId && !input.storageObjectId) throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "An assetId or storageObjectId is required.", 400, "auth");
    const storageObject = input.storageObjectId
      ? await mediaStoragePersistenceService.get(input.storageObjectId)
      : (await mediaStoragePersistenceService.list()).find((item) => item.assetId === input.assetId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    if (storageObject.status === "deleted" || storageObject.status === "archived") throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Archived or deleted storage objects cannot be signed.", 403, "auth");
    if (storageObject.accessLevel === "public" && storageObject.publicUrl) throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Public storage objects do not require signed URLs.", 400, "auth");
    if (storageObject.publicUrl?.includes("X-Amz-Signature")) throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Signed URLs cannot be used as persistent storage URLs.", 400, "auth");
    if (storageObject.storagePath.includes("..") || storageObject.storagePath.startsWith("/") || /^[a-z]+:/i.test(storageObject.storagePath)) {
      throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Storage path is not eligible for signing.", 400, "auth");
    }
    if (input.assetId) {
      const asset = await mediaAssetPersistenceService.get(input.assetId);
      if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
      this.validateSignedUrlPurpose(asset, input.purpose ?? "admin_preview");
    }
    const expirationSeconds = Math.min(input.expiration ?? mediaBackendConfig.signedUrlExpirationSeconds, mediaBackendConfig.maxSignedUrlExpirationSeconds);
    const purpose = input.purpose ?? "admin_preview";
    if (expirationSeconds <= 0 || expirationSeconds > mediaBackendConfig.maxSignedUrlExpirationSeconds) throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Signed URL expiration is invalid.", 400, "auth");
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const expiresAtMs = Date.now() + expirationSeconds * 1000;
    const signedUrl = provider.getProviderName() === "local"
      ? `/api/admin/media/storage/objects/${encodeURIComponent(storageObject.storageObjectId)}/content?purpose=${encodeURIComponent(purpose)}&expires=${expiresAtMs}&previewToken=${this.createLocalPreviewToken({ storageObjectId: storageObject.storageObjectId, purpose, expiresAtMs })}`
      : await provider.getSignedUrl(storageObject, expirationSeconds, purpose);
    await mediaAuditPersistenceService.record("signed_media_url_generated", "Generated signed media URL", {
      actorId: input.actorId,
      entityType: "media_storage_object",
      entityId: storageObject.storageObjectId,
      metadata: { purpose, expirationSeconds },
    });
    return { signedUrl, expiresInSeconds: expirationSeconds, expiresAt: new Date(Date.now() + expirationSeconds * 1000).toISOString(), purpose };
  }

  validateSignedUrlPurpose(asset: { assetType: string; status?: string }, purpose: string): void {
    const allowed = new Set(["admin_preview", "private_audio_preview", "authorized_download", "download", "processing_access", "processing"]);
    if (!allowed.has(purpose)) throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Signed URL purpose is not supported.", 400, "auth");
    if (asset.status === "deleted" || asset.status === "archived") throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Archived or deleted assets cannot be signed.", 403, "auth");
    if (asset.assetType === "full_song" && !["admin_preview", "authorized_download", "download", "processing_access", "processing"].includes(purpose)) {
      throw new MediaApiError("MEDIA_SIGNED_URL_DENIED", "Full-song private access requires an authorized purpose.", 403, "auth");
    }
  }
}

export const mediaSignedUrlService = new MediaSignedUrlService();
