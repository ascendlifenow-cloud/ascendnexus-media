import type { MediaAssetRecord, MediaAssetType } from "../../models/admin";
import type {
  MediaAssetAssignmentState,
  MediaAssetLink,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkIntendedUse,
  MediaAssetPublicVisibility,
} from "../../models/media";
import { getMediaCategoryFromAssetType } from "./mediaTypeUtils";
import { isSafePublicMediaUrl } from "./publicSafeUrlUtils";

export interface MediaAssetCompatibilityResult {
  compatible: boolean;
  warnings: string[];
  blockingIssues: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

const imageTypes: MediaAssetType[] = ["cover_art", "artist_profile", "artist_character_art", "artist_banner", "promo_graphic", "gallery_image", "video_thumbnail", "social_preview", "logo", "fallback_image", "custom_image"];
const audioTypes: MediaAssetType[] = ["audio_preview", "full_song", "stem", "instrumental", "vocal", "custom_audio"];

const fieldLabels: Record<MediaAssetLinkFieldKey, string> = {
  profileImage: "Profile Image",
  profileThumbnailUrl: "Profile Thumbnail",
  profileBannerUrl: "Profile Banner",
  characterArtUrl: "Character Art",
  coverArtUrl: "Cover Art",
  coverArtThumbnailUrl: "Cover Thumbnail",
  coverArtLargeUrl: "Large Cover Art",
  audioPreviewUrl: "Audio Preview",
  fullSongUrl: "Full Song",
  imageUrl: "Image",
  thumbnailUrl: "Thumbnail",
  heroImageUrl: "Hero Image",
  socialImageUrl: "Social Image",
  brandLogoUrl: "Brand Logo",
  defaultCoverArtUrl: "Default Cover Art",
  defaultArtistImageUrl: "Default Artist Image",
  defaultSocialImageUrl: "Default Social Image",
  custom: "Custom Field",
};

const intendedUseFieldMap: Partial<Record<MediaAssetLinkIntendedUse, MediaAssetLinkFieldKey>> = {
  artist_profile_image: "profileImage",
  artist_character_art: "characterArtUrl",
  artist_banner: "profileBannerUrl",
  release_cover_art: "coverArtUrl",
  release_audio_preview: "audioPreviewUrl",
  release_full_song: "fullSongUrl",
  gallery_image: "imageUrl",
  homepage_hero: "heroImageUrl",
  seo_image: "socialImageUrl",
  social_preview_image: "socialImageUrl",
  site_logo: "brandLogoUrl",
  site_fallback_image: "defaultCoverArtUrl",
};

const createLinkId = (): string => `media-link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const buildMediaAssetLink = (
  assetId: string,
  entityType: MediaAssetLinkEntityType,
  entityId: string,
  fieldKey: MediaAssetLinkFieldKey,
  intendedUse: MediaAssetLinkIntendedUse,
  metadata: Record<string, string | number | boolean | null> = {},
): MediaAssetLink => ({
  linkId: createLinkId(),
  assetId,
  entityType,
  entityId,
  fieldKey,
  intendedUse,
  status: "active",
  linkedAt: new Date().toISOString(),
  metadata,
});

export const getMediaAssetCategory = (asset: Pick<MediaAssetRecord, "assetType">): ReturnType<typeof getMediaCategoryFromAssetType> =>
  getMediaCategoryFromAssetType(asset.assetType);

const requiresImage = (fieldKey: MediaAssetLinkFieldKey, intendedUse?: MediaAssetLinkIntendedUse): boolean =>
  ["profileImage", "profileThumbnailUrl", "profileBannerUrl", "characterArtUrl", "coverArtUrl", "coverArtThumbnailUrl", "coverArtLargeUrl", "imageUrl", "thumbnailUrl", "heroImageUrl", "socialImageUrl", "brandLogoUrl", "defaultCoverArtUrl", "defaultArtistImageUrl", "defaultSocialImageUrl"].includes(fieldKey) ||
  Boolean(intendedUse && ["artist_profile_image", "artist_character_art", "artist_banner", "release_cover_art", "gallery_image", "homepage_hero", "seo_image", "social_preview_image", "site_logo", "site_fallback_image"].includes(intendedUse));

const requiresAudio = (fieldKey: MediaAssetLinkFieldKey, intendedUse?: MediaAssetLinkIntendedUse): boolean =>
  ["audioPreviewUrl", "fullSongUrl"].includes(fieldKey) ||
  Boolean(intendedUse && ["release_audio_preview", "release_full_song"].includes(intendedUse));

export const isAssetCompatibleWithField = (
  asset: MediaAssetRecord,
  entityType: MediaAssetLinkEntityType,
  fieldKey: MediaAssetLinkFieldKey,
  intendedUse?: MediaAssetLinkIntendedUse,
): MediaAssetCompatibilityResult => {
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const category = getMediaAssetCategory(asset);
  if (requiresImage(fieldKey, intendedUse) && category !== "image") blockingIssues.push(`${formatMediaLinkFieldLabel(fieldKey)} requires an image asset.`);
  if (requiresAudio(fieldKey, intendedUse) && category !== "audio") blockingIssues.push(`${formatMediaLinkFieldLabel(fieldKey)} requires an audio asset.`);
  if (entityType === "release" && fieldKey === "coverArtUrl" && !["cover_art", ...imageTypes].includes(asset.assetType)) warnings.push("Release cover art works best with a cover art image asset.");
  if (entityType === "release" && fieldKey === "audioPreviewUrl" && !["audio_preview", ...audioTypes].includes(asset.assetType)) warnings.push("Release previews work best with an audio preview asset.");
  if (entityType === "release" && fieldKey === "fullSongUrl" && !["full_song", "custom_audio"].includes(asset.assetType)) warnings.push("Full song links should usually use a full song audio asset.");
  if (entityType === "artist" && fieldKey === "profileImage" && asset.assetType !== "artist_profile") warnings.push("Artist profile images work best with an artist profile asset.");
  if (fieldKey === "brandLogoUrl" && !["logo", "custom_image"].includes(asset.assetType)) warnings.push("Site logos work best with logo or custom image assets.");
  if (asset.status === "archived") blockingIssues.push("Archived media assets cannot be linked.");
  return {
    compatible: blockingIssues.length === 0,
    warnings,
    blockingIssues,
    metadata: {
      assetType: asset.assetType,
      mediaCategory: category,
      fieldKey,
      entityType,
    },
  };
};

export const getEntityFieldForIntendedUse = (intendedUse: MediaAssetLinkIntendedUse): MediaAssetLinkFieldKey =>
  intendedUseFieldMap[intendedUse] ?? "custom";

export const getEntityUrlFromAsset = (asset: MediaAssetRecord): string =>
  asset.url || asset.largeUrl || asset.thumbnailUrl || "";

export const getAssignmentState = (activeLinks: readonly MediaAssetLink[], previousLinks: readonly MediaAssetLink[]): MediaAssetAssignmentState => {
  if (activeLinks.length > 1) return "multi_assigned";
  if (activeLinks.length === 1) return "assigned";
  if (previousLinks.some((link) => link.status === "replaced")) return "replaced";
  if (previousLinks.some((link) => link.status === "detached")) return "detached";
  if (previousLinks.some((link) => link.status === "archived")) return "archived";
  return "unassigned";
};

export const getPublicReferenceState = (asset: MediaAssetRecord | null | undefined, activeLinks: readonly MediaAssetLink[]): MediaAssetPublicVisibility => {
  if (!asset) return "unknown";
  if (asset.status === "archived") return "blocked";
  if (!activeLinks.length) return "not_public";
  if (asset.metadata?.storage && typeof asset.metadata.storage === "object" && !Array.isArray(asset.metadata.storage)) {
    const accessLevel = asset.metadata.storage.accessLevel;
    if (accessLevel === "admin_only" || accessLevel === "private") return "admin_only";
  }
  return asset.status === "published" ? "public" : "not_public";
};

export const buildLinkedAssetMetadata = (
  asset: MediaAssetRecord,
  link: MediaAssetLink,
  previousLinkId?: string,
): Record<string, string | number | boolean | null> => {
  const url = getEntityUrlFromAsset(asset);
  return {
    mediaAssetId: asset.assetId,
    mediaAssetType: asset.assetType,
    mediaAssetUrl: isSafePublicMediaUrl(url) ? url : null,
    mediaAssetLinkId: link.linkId,
    mediaAssetFieldKey: link.fieldKey,
    mediaAssetIntendedUse: link.intendedUse,
    previousMediaAssetLinkId: previousLinkId ?? null,
  };
};

export const formatMediaLinkFieldLabel = (fieldKey: MediaAssetLinkFieldKey): string => fieldLabels[fieldKey] ?? fieldKey;
