import type { MediaAssetType } from "../../models/admin";
import type { MediaCategory, PublicAssetPolicy, MediaAssetLinkEntityType, MediaAssetLinkFieldKey } from "../../models/media";

const imageTypes: MediaAssetType[] = ["artist_profile", "artist_character_art", "artist_banner", "cover_art", "promo_graphic", "gallery_image", "video_thumbnail", "social_preview", "logo", "fallback_image", "custom_image"];
const audioTypes: MediaAssetType[] = ["audio_preview", "full_song", "custom_audio"];

const policy = (
  entityType: MediaAssetLinkEntityType,
  fieldKey: MediaAssetLinkFieldKey,
  allowedAssetTypes: MediaAssetType[],
  allowedMediaCategories: MediaCategory[],
  options: Partial<Omit<PublicAssetPolicy, "policyId" | "entityType" | "fieldKey" | "allowedAssetTypes" | "allowedMediaCategories" | "requiredAssetTypes">> = {},
  requiredAssetTypes: MediaAssetType[] = [],
): PublicAssetPolicy => ({
  policyId: `${entityType}-${fieldKey}`,
  entityType,
  fieldKey,
  requiredAssetTypes,
  allowedAssetTypes,
  allowedMediaCategories,
  requiresEntityPublic: options.requiresEntityPublic ?? true,
  requiresAssetPublished: options.requiresAssetPublished ?? true,
  requiresStoragePublic: options.requiresStoragePublic ?? true,
  allowAdminPreview: options.allowAdminPreview ?? true,
  allowFallback: options.allowFallback ?? true,
  blockingIfMissing: options.blockingIfMissing ?? false,
  metadata: options.metadata,
});

export const defaultPublicAssetPolicies: PublicAssetPolicy[] = [
  policy("artist", "profileImage", ["artist_profile", "artist_character_art", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("artist", "profileBannerUrl", ["artist_banner", "promo_graphic", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("artist", "characterArtUrl", ["artist_character_art", "artist_profile", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("release", "coverArtUrl", ["cover_art", "promo_graphic", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("release", "audioPreviewUrl", ["audio_preview", "custom_audio"], ["audio"]),
  policy("release", "fullSongUrl", ["full_song", "custom_audio"], ["audio"], { allowFallback: false, blockingIfMissing: false, metadata: { requiresPublicPlaybackAllowed: true } }),
  policy("gallery_item", "imageUrl", ["gallery_image", "cover_art", "artist_profile", "promo_graphic", "video_thumbnail", "custom_image"], ["image"], { blockingIfMissing: true, requiresAssetPublished: false }),
  policy("gallery_item", "thumbnailUrl", ["gallery_image", "cover_art", "artist_profile", "promo_graphic", "video_thumbnail", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("homepage_section", "heroImageUrl", ["promo_graphic", "gallery_image", "social_preview", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("homepage_section", "custom", ["promo_graphic", "gallery_image", "social_preview", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("seo_metadata", "socialImageUrl", ["social_preview", "cover_art", "artist_profile", "promo_graphic", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("social_metadata", "socialImageUrl", ["social_preview", "cover_art", "artist_profile", "promo_graphic", "custom_image"], ["image"], { requiresAssetPublished: false }),
  policy("site_config", "brandLogoUrl", ["logo", "custom_image"], ["image"], { requiresEntityPublic: false, requiresAssetPublished: false }),
  policy("site_config", "defaultCoverArtUrl", ["cover_art", "fallback_image", "custom_image"], ["image"], { requiresEntityPublic: false, requiresAssetPublished: false }),
  policy("site_config", "defaultArtistImageUrl", ["artist_profile", "fallback_image", "custom_image"], ["image"], { requiresEntityPublic: false, requiresAssetPublished: false }),
  policy("site_config", "defaultSocialImageUrl", ["social_preview", "fallback_image", "custom_image"], ["image"], { requiresEntityPublic: false, requiresAssetPublished: false }),
];

export const getPublicAssetPolicy = (
  entityType: MediaAssetLinkEntityType,
  fieldKey: MediaAssetLinkFieldKey,
): PublicAssetPolicy =>
  defaultPublicAssetPolicies.find((item) => item.entityType === entityType && item.fieldKey === fieldKey) ??
  policy(entityType, fieldKey, [...imageTypes, ...audioTypes], ["image", "audio", "video", "custom"], { allowFallback: true, blockingIfMissing: false });
