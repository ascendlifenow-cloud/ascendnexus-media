export type MediaAssetOwnerType = "artist" | "release" | "gallery" | "site" | "media_library" | "custom";
export type MediaAssetType =
  | "full_song"
  | "cover_art"
  | "artist_profile"
  | "artist_character_art"
  | "artist_banner"
  | "audio_preview"
  | "stem"
  | "instrumental"
  | "vocal"
  | "custom_audio"
  | "promo_graphic"
  | "gallery_image"
  | "video_thumbnail"
  | "social_preview"
  | "logo"
  | "fallback_image"
  | "video"
  | "lyric_video"
  | "short_clip"
  | "animation"
  | "custom_image"
  | "custom";
export type MediaAssetMetadataValue =
  | string
  | number
  | boolean
  | null
  | MediaAssetMetadataValue[]
  | { [key: string]: MediaAssetMetadataValue };
export type MediaAssetStatus = "draft" | "published" | "archived";

export interface MediaAssetRecord {
  assetId: string;
  ownerType: MediaAssetOwnerType;
  ownerId: string;
  assetType: MediaAssetType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  largeUrl?: string;
  altText?: string;
  credit?: string;
  status: MediaAssetStatus;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
