import type { MediaAssetOwnerType, MediaAssetType } from "../admin";
import type { MediaAccessLevel } from "./MediaStorageObject";

export type MediaUploadTargetType =
  | "artist"
  | "release"
  | "gallery"
  | "homepage"
  | "site_config"
  | "seo_metadata"
  | "social_metadata"
  | "media_library"
  | "custom";

export type MediaUploadIntendedUse =
  | "release_cover_art"
  | "release_audio_preview"
  | "release_full_song"
  | "artist_profile_image"
  | "artist_thumbnail_image"
  | "artist_character_art"
  | "artist_banner"
  | "gallery_image"
  | "gallery_cover_art"
  | "gallery_artist_profile"
  | "gallery_promo_graphic"
  | "gallery_video_thumbnail"
  | "gallery_custom_image"
  | "homepage_hero"
  | "site_logo"
  | "social_preview_image"
  | "batch_upload"
  | "unassigned_upload"
  | "custom";

export interface MediaUploadTarget {
  targetType: MediaUploadTargetType;
  targetId?: string;
  assetType: MediaAssetType;
  intendedUse: MediaUploadIntendedUse;
  ownerType?: MediaAssetOwnerType;
  ownerId?: string;
  accessLevel: MediaAccessLevel;
  metadata?: Record<string, string | number | boolean | null>;
}
