import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaStorageObject } from "../../models/mediaModels";
import { joinBaseUrlAndPath, isPublicStoragePath } from "../../utils/media/storageUrlUtils";

export class MediaCdnService {
  isEnabled() {
    return Boolean(mediaBackendConfig.cdnEnabled && mediaBackendConfig.cdnBaseUrl);
  }

  getCdnUrl(storageObject: MediaStorageObject): string | undefined {
    if (!this.isEnabled()) return undefined;
    if (storageObject.assetType === "full_song" || storageObject.accessLevel !== "public") return undefined;
    if (!isPublicStoragePath(storageObject.storagePath, mediaBackendConfig.publicPrefix)) return undefined;
    return joinBaseUrlAndPath(mediaBackendConfig.cdnBaseUrl as string, storageObject.storagePath);
  }

  mapResponsiveImage(storageObject: MediaStorageObject) {
    const src = this.getCdnUrl(storageObject) ?? storageObject.publicUrl;
    if (!src || storageObject.mediaCategory !== "image") return undefined;
    return {
      src,
      srcSet: src,
      sizes: "(max-width: 768px) 100vw, 768px",
      width: Number(storageObject.metadata?.width ?? 0) || undefined,
      height: Number(storageObject.metadata?.height ?? 0) || undefined,
      format: storageObject.fileExtension,
    };
  }

  async getHealthStatus() {
    return {
      enabled: this.isEnabled(),
      provider: mediaBackendConfig.cdnEnabled ? "configured" : "disabled",
      baseUrlConfigured: Boolean(mediaBackendConfig.cdnBaseUrl),
      imageBaseUrlConfigured: Boolean(mediaBackendConfig.cdnBaseUrl),
      audioBaseUrlConfigured: Boolean(mediaBackendConfig.cdnBaseUrl),
      cacheBustStrategy: "versioned_path",
      invalidationSupported: false,
      checkedAt: new Date().toISOString(),
      warnings: mediaBackendConfig.cdnEnabled && !mediaBackendConfig.cdnBaseUrl ? ["CDN is enabled but base URL is missing."] : [],
    };
  }
}

export const mediaCdnService = new MediaCdnService();
