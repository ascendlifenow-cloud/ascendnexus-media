import type { MediaAssetType } from "../models/admin";
import type { MediaUploadTypeConfig, StorageProviderConfig, StorageProviderName } from "../models/media";

const storageProviderNames: StorageProviderName[] = ["mock", "local", "s3", "r2", "supabase", "firebase", "custom"];
const envValue = (key: string): string | undefined => {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const envFlag = (key: string, fallback: boolean): boolean => {
  const value = envValue(key);
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
};

const getActiveStorageProvider = (): StorageProviderName => {
  const provider = envValue("VITE_MEDIA_STORAGE_PROVIDER") as StorageProviderName | undefined;
  return provider && storageProviderNames.includes(provider) ? provider : "custom";
};

export const defaultStorageProviderConfig: StorageProviderConfig = {
  provider: getActiveStorageProvider(),
  enabled: true,
  mockEnabled: envFlag("VITE_MEDIA_MOCK_UPLOADS", true),
  baseUrl: envValue("VITE_MEDIA_PUBLIC_BASE_URL") ?? "/mock-storage",
  uploadApiBaseUrl: envValue("VITE_MEDIA_UPLOAD_API_BASE_URL") ?? "",
  bucket: "ascend-nexus-media",
  publicPathPrefix: "/public",
  privatePathPrefix: "/admin",
  defaultAccessLevel: "admin_only",
  maxUploadRetries: 2,
  retryDelayMs: 600,
  retryableErrorCodes: ["network_error", "timeout", "temporary_unavailable"],
  maxFileSizeBytes: 50 * 1024 * 1024,
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "audio/mpeg", "audio/wav", "audio/mp4", "video/mp4"],
  metadata: {
    frontendSafe: true,
    secretsRequired: false,
    providerSwitching: true,
  },
};

export const defaultUploadTypeConfig: Record<MediaAssetType, MediaUploadTypeConfig> = {
  cover_art: { mediaCategory: "image", maxFileSizeBytes: 12 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  artist_profile: { mediaCategory: "image", maxFileSizeBytes: 12 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  artist_character_art: { mediaCategory: "image", maxFileSizeBytes: 16 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  artist_banner: { mediaCategory: "image", maxFileSizeBytes: 16 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  promo_graphic: { mediaCategory: "image", maxFileSizeBytes: 16 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  gallery_image: { mediaCategory: "image", maxFileSizeBytes: 16 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
  video_thumbnail: { mediaCategory: "image", maxFileSizeBytes: 12 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  social_preview: { mediaCategory: "image", maxFileSizeBytes: 12 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  logo: { mediaCategory: "image", maxFileSizeBytes: 6 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] },
  fallback_image: { mediaCategory: "image", maxFileSizeBytes: 12 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"] },
  custom_image: { mediaCategory: "image", maxFileSizeBytes: 16 * 1024 * 1024, allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
  audio_preview: { mediaCategory: "audio", maxFileSizeBytes: 20 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"] },
  full_song: { mediaCategory: "audio", maxFileSizeBytes: 250 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"] },
  stem: { mediaCategory: "audio", maxFileSizeBytes: 250 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"] },
  instrumental: { mediaCategory: "audio", maxFileSizeBytes: 250 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"] },
  vocal: { mediaCategory: "audio", maxFileSizeBytes: 250 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"] },
  custom_audio: { mediaCategory: "audio", maxFileSizeBytes: 250 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"] },
  video: { mediaCategory: "video", maxFileSizeBytes: 500 * 1024 * 1024, allowedMimeTypes: ["video/mp4", "video/webm"] },
  lyric_video: { mediaCategory: "video", maxFileSizeBytes: 500 * 1024 * 1024, allowedMimeTypes: ["video/mp4", "video/webm"] },
  short_clip: { mediaCategory: "video", maxFileSizeBytes: 150 * 1024 * 1024, allowedMimeTypes: ["video/mp4", "video/webm"] },
  animation: { mediaCategory: "video", maxFileSizeBytes: 250 * 1024 * 1024, allowedMimeTypes: ["video/mp4", "video/webm", "image/gif"] },
  custom: { mediaCategory: "custom", maxFileSizeBytes: 50 * 1024 * 1024, allowedMimeTypes: [] },
};
