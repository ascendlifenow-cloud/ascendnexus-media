export type MediaAssetLinkEntityType =
  | "artist"
  | "release"
  | "gallery_item"
  | "homepage_section"
  | "seo_metadata"
  | "social_metadata"
  | "site_config"
  | "custom";

export type MediaAssetLinkStatus = "active" | "replaced" | "detached" | "archived";

export type MediaAssetLinkFieldKey =
  | "profileImage"
  | "profileThumbnailUrl"
  | "profileBannerUrl"
  | "characterArtUrl"
  | "coverArtUrl"
  | "coverArtThumbnailUrl"
  | "coverArtLargeUrl"
  | "audioPreviewUrl"
  | "fullSongUrl"
  | "imageUrl"
  | "thumbnailUrl"
  | "heroImageUrl"
  | "socialImageUrl"
  | "brandLogoUrl"
  | "defaultCoverArtUrl"
  | "defaultArtistImageUrl"
  | "defaultSocialImageUrl"
  | "custom";

export type MediaAssetLinkIntendedUse =
  | "artist_profile_image"
  | "artist_character_art"
  | "artist_banner"
  | "release_cover_art"
  | "release_audio_preview"
  | "release_full_song"
  | "gallery_image"
  | "homepage_hero"
  | "seo_image"
  | "social_preview_image"
  | "site_logo"
  | "site_fallback_image"
  | "custom";

export interface MediaAssetLink {
  linkId: string;
  assetId: string;
  entityType: MediaAssetLinkEntityType;
  entityId: string;
  fieldKey: MediaAssetLinkFieldKey;
  intendedUse: MediaAssetLinkIntendedUse;
  status: MediaAssetLinkStatus;
  linkedAt: string;
  linkedBy?: string;
  unlinkedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
