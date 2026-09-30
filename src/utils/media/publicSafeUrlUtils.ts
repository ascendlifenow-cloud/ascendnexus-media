import type { MediaAssetRecord } from "../../models/admin";
import { validatePublicMediaUrl } from "../security/publicUrlSafetyUtils";

export interface PublicSafeMediaUrlContext {
  publicAllowed?: boolean;
  allowFallback?: boolean;
  fallbackUrl?: string;
  allowAdminPreview?: boolean;
  isAdminPreview?: boolean;
  publicPlaybackAllowed?: boolean;
}

export const isSafePublicMediaUrl = (url: string | null | undefined): boolean => {
  return validatePublicMediaUrl(url);
};

const getStorageAccessLevel = (asset: MediaAssetRecord): string | undefined => {
  const storage = asset.metadata?.storage;
  if (!storage || typeof storage !== "object" || Array.isArray(storage)) return undefined;
  const accessLevel = storage.accessLevel;
  return typeof accessLevel === "string" ? accessLevel : undefined;
};

const getAudioPublicPlaybackAllowed = (asset: MediaAssetRecord): boolean => {
  const audio = asset.metadata?.audio;
  if (!audio || typeof audio !== "object" || Array.isArray(audio)) return false;
  return audio.publicPlaybackAllowed === true;
};

export const getPublicSafeMediaUrl = (
  asset: MediaAssetRecord | null | undefined,
  context: PublicSafeMediaUrlContext = {},
): string | undefined => {
  if (!asset) return context.allowFallback ? context.fallbackUrl : undefined;
  const url = asset.url || asset.largeUrl || asset.thumbnailUrl;
  const adminPreviewAllowed = Boolean(context.allowAdminPreview && context.isAdminPreview);
  if (asset.status === "archived") return context.allowFallback ? context.fallbackUrl : undefined;
  if (asset.status !== "published" && !adminPreviewAllowed) return context.allowFallback ? context.fallbackUrl : undefined;
  if (!isSafePublicMediaUrl(url)) return context.allowFallback ? context.fallbackUrl : undefined;
  const accessLevel = getStorageAccessLevel(asset);
  if ((accessLevel === "admin_only" || accessLevel === "private") && !adminPreviewAllowed) return context.allowFallback ? context.fallbackUrl : undefined;
  if (asset.assetType === "full_song" && !(context.publicPlaybackAllowed || getAudioPublicPlaybackAllowed(asset))) {
    return context.allowFallback ? context.fallbackUrl : undefined;
  }
  if (context.publicAllowed === false && !adminPreviewAllowed) return context.allowFallback ? context.fallbackUrl : undefined;
  return url;
};

export const getFallbackOrPublicAssetUrl = (
  asset: MediaAssetRecord | null | undefined,
  fallbackUrl: string | undefined,
  context: PublicSafeMediaUrlContext = {},
): string | undefined => getPublicSafeMediaUrl(asset, { ...context, fallbackUrl, allowFallback: true });
