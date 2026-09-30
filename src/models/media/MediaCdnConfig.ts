import type { MediaAssetMetadataValue } from "../admin";

export type MediaCdnProvider =
  | "none"
  | "custom"
  | "cloudflare"
  | "s3_cloudfront"
  | "supabase"
  | "firebase"
  | "vercel"
  | "netlify"
  | "other";

export type MediaCdnCacheBustStrategy = "none" | "version_query" | "content_hash" | "updated_at_query";

export interface MediaCdnConfig {
  enabled: boolean;
  provider: MediaCdnProvider;
  baseUrl?: string;
  imageBaseUrl?: string;
  audioBaseUrl?: string;
  fallbackBaseUrl?: string;
  cacheBustStrategy: MediaCdnCacheBustStrategy;
  defaultImageQuality?: number;
  defaultImageFormat?: string;
  responsiveImagesEnabled: boolean;
  signedUrlsEnabled: boolean;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
