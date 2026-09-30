import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaAsset, MediaStorageObject } from "../../models/mediaModels";
import { joinBaseUrlAndPath, isPublicStoragePath } from "../../utils/media/storageUrlUtils";

const unsafeUrl = (url: string | undefined) => !url || url.includes("private") || url.includes("token=") || url.includes("X-Amz-Signature");

export class MediaPublicUrlService {
  getPublicStorageUrl(storageObject: MediaStorageObject): string | undefined {
    if (storageObject.accessLevel !== "public") return undefined;
    if (!isPublicStoragePath(storageObject.storagePath, mediaBackendConfig.publicPrefix)) return undefined;
    if (storageObject.assetType === "full_song") return undefined;
    return storageObject.publicUrl ?? (mediaBackendConfig.publicBaseUrl ? joinBaseUrlAndPath(mediaBackendConfig.publicBaseUrl, storageObject.storagePath) : undefined);
  }

  getPreferredPublicUrl(asset: MediaAsset, storageObject?: MediaStorageObject): string | undefined {
    if (asset.status !== "published" && asset.status !== "draft") return undefined;
    if (asset.assetType === "full_song") return undefined;
    const candidate = storageObject ? this.getCdnUrl(storageObject) ?? this.getPublicStorageUrl(storageObject) : asset.url;
    return unsafeUrl(candidate) ? undefined : candidate;
  }

  getCdnUrl(storageObject: MediaStorageObject): string | undefined {
    if (!mediaBackendConfig.cdnEnabled || !mediaBackendConfig.cdnBaseUrl) return undefined;
    if (storageObject.assetType === "full_song") return undefined;
    if (storageObject.accessLevel !== "public" || !isPublicStoragePath(storageObject.storagePath, mediaBackendConfig.publicPrefix)) return undefined;
    return joinBaseUrlAndPath(mediaBackendConfig.cdnBaseUrl, storageObject.storagePath);
  }

  getImageUrlForUse(asset: MediaAsset, use: "thumbnail" | "card" | "feature" | "hero" | "banner" | "social" | "original") {
    if (asset.assetType === "full_song") return undefined;
    if (["thumbnail", "card"].includes(use)) return this.normalizePublicUrl(asset.thumbnailUrl) ?? this.normalizePublicUrl(asset.url);
    if (["feature", "hero", "banner", "social"].includes(use)) return this.normalizePublicUrl(asset.largeUrl) ?? this.normalizePublicUrl(asset.url);
    return this.normalizePublicUrl(asset.url);
  }

  getAudioPreviewUrl(asset: MediaAsset) {
    if (asset.assetType !== "audio_preview") return undefined;
    return this.normalizePublicUrl(asset.url);
  }

  normalizePublicUrl(url: string | undefined): string | undefined {
    if (unsafeUrl(url)) return undefined;
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return undefined;
      return parsed.toString();
    } catch {
      return url?.startsWith("/") && !url.includes("private") ? url : undefined;
    }
  }

  validatePublicUrl(url: string | undefined): boolean {
    return Boolean(this.normalizePublicUrl(url));
  }
}

export const mediaPublicUrlService = new MediaPublicUrlService();
