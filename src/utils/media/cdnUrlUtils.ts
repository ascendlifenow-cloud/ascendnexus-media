import type { MediaAssetRecord } from "../../models/admin";
import type { MediaCdnConfig } from "../../models/media";
import { isSafePublicMediaUrl } from "./publicSafeUrlUtils";

export const defaultMediaCdnConfig: MediaCdnConfig = {
  enabled: false,
  provider: "none",
  baseUrl: import.meta.env.VITE_MEDIA_CDN_BASE_URL,
  imageBaseUrl: import.meta.env.VITE_MEDIA_IMAGE_CDN_BASE_URL,
  audioBaseUrl: import.meta.env.VITE_MEDIA_AUDIO_CDN_BASE_URL,
  fallbackBaseUrl: import.meta.env.VITE_MEDIA_FALLBACK_CDN_BASE_URL,
  cacheBustStrategy: "updated_at_query",
  defaultImageQuality: 82,
  defaultImageFormat: "webp",
  responsiveImagesEnabled: true,
  signedUrlsEnabled: false,
};

export const normalizePublicMediaUrl = (url: string | null | undefined): string | undefined => {
  const value = (url ?? "").trim();
  if (!value || !isSafePublicMediaUrl(value)) return undefined;
  return value.replace(/\\/g, "/").replace(/([^:]\/)\/+/g, "$1");
};

const isAbsoluteHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url);

export const joinCdnBaseAndPath = (baseUrl: string, pathOrUrl: string): string => {
  const base = baseUrl.replace(/\/+$/, "");
  if (isAbsoluteHttpUrl(pathOrUrl)) {
    try {
      const parsed = new URL(pathOrUrl);
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return pathOrUrl;
    }
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
};

export const getCdnBaseForAsset = (asset: MediaAssetRecord, config: MediaCdnConfig): string | undefined => {
  if (["audio_preview", "full_song", "custom_audio", "stem", "instrumental", "vocal"].includes(asset.assetType)) {
    return config.audioBaseUrl ?? config.baseUrl;
  }
  return config.imageBaseUrl ?? config.baseUrl;
};

export const transformToCdnUrl = (
  originalUrl: string,
  asset: MediaAssetRecord,
  config: MediaCdnConfig,
): string | undefined => {
  const safeOriginal = normalizePublicMediaUrl(originalUrl);
  if (!safeOriginal) return undefined;
  if (!config.enabled) return safeOriginal;
  const base = getCdnBaseForAsset(asset, config);
  if (!base || !isSafePublicMediaUrl(base)) return safeOriginal;
  return normalizePublicMediaUrl(joinCdnBaseAndPath(base, safeOriginal)) ?? safeOriginal;
};

export const buildCdnPathList = (asset: MediaAssetRecord): string[] =>
  [asset.url, asset.thumbnailUrl, asset.largeUrl]
    .map(normalizePublicMediaUrl)
    .filter((url): url is string => Boolean(url))
    .map((url) => {
      try {
        return new URL(url, "https://anm.local").pathname;
      } catch {
        return url;
      }
    });
