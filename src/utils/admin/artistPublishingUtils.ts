import type {
  ArtistAdminRecord,
  ArtistLinkedAssetKey,
  ArtistLinkedAssetReadinessState,
  ArtistMetadataReadinessState,
  ArtistPublishReadiness,
  MediaAssetRecord,
} from "../../models/admin";
import type { ArtistExternalLinks, ArtistPublicProfile } from "../../models/artist";
import type { MediaAssetVisibilityState } from "../../models/media";
import { mapArtistAdminToPublicProfile } from "./adminMappers";
import { validateArtistSlug } from "../../admin/utils/adminArtistFormUtils";
import { isSafePublicMediaUrl } from "../media/publicSafeUrlUtils";

type VisibilityByKey = Partial<Record<ArtistLinkedAssetKey, MediaAssetVisibilityState>>;

const compact = (items: Array<string | undefined | null | false>): string[] =>
  items.filter((item): item is string => Boolean(item));

const hasUnsafeUrl = (value: string | undefined): boolean =>
  Boolean(value?.trim()) && !isSafePublicMediaUrl(value);

const metadataString = (artist: ArtistAdminRecord, key: string): string | undefined => {
  const value = artist.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

export const validateArtistRequiredFields = (artist: ArtistAdminRecord): string[] => compact([
  artist.displayName?.trim() ? undefined : "Display Name",
  artist.name?.trim() ? undefined : "Name",
  artist.slug?.trim() ? undefined : "Slug",
  artist.bio?.trim() || artist.shortBio?.trim() ? undefined : "Bio",
]);

const labelForKey: Record<ArtistLinkedAssetKey, string> = {
  profileImage: "Profile Image",
  characterArt: "Character Art",
  bannerImage: "Banner Image",
  thumbnailImage: "Thumbnail Image",
  seoImage: "SEO Image",
  socialImage: "Social Image",
};

const assetTypeForKey: Record<ArtistLinkedAssetKey, string[]> = {
  profileImage: ["artist_profile"],
  characterArt: ["artist_character_art"],
  bannerImage: ["artist_banner"],
  thumbnailImage: ["artist_profile"],
  seoImage: ["social_preview", "promo_graphic", "artist_profile", "custom_image"],
  socialImage: ["social_preview", "promo_graphic", "artist_profile", "custom_image"],
};

const requiredForKey = (_key: ArtistLinkedAssetKey): boolean => false;

const urlForKey = (artist: ArtistAdminRecord, key: ArtistLinkedAssetKey): string | undefined => {
  if (key === "profileImage") return artist.profileImage;
  if (key === "thumbnailImage") return artist.profileThumbnailUrl;
  if (key === "bannerImage") return artist.profileBannerUrl;
  if (key === "characterArt") return metadataString(artist, "characterArtUrl");
  if (key === "seoImage") return artist.seoMetadata?.imageUrl;
  return artist.socialMetadata?.imageUrl;
};

const assetIdForKey = (artist: ArtistAdminRecord, key: ArtistLinkedAssetKey): string | undefined => {
  if (key === "profileImage") return metadataString(artist, "profileImageAssetId");
  if (key === "thumbnailImage") return metadataString(artist, "profileThumbnailAssetId");
  if (key === "bannerImage") return metadataString(artist, "profileBannerAssetId");
  if (key === "characterArt") return metadataString(artist, "characterArtAssetId");
  if (key === "seoImage") return metadataString(artist, "seoImageAssetId");
  return metadataString(artist, "socialImageAssetId");
};

const findAsset = (
  artist: ArtistAdminRecord,
  mediaAssets: readonly MediaAssetRecord[],
  key: ArtistLinkedAssetKey,
): MediaAssetRecord | undefined => {
  const explicitId = assetIdForKey(artist, key);
  if (explicitId) return mediaAssets.find((asset) => asset.assetId === explicitId);
  const expectedTypes = assetTypeForKey[key];
  return mediaAssets.find((asset) => asset.ownerType === "artist" && asset.ownerId === artist.artistId && expectedTypes.includes(asset.assetType));
};

export const validateArtistLinkedMediaReadiness = (
  artist: ArtistAdminRecord,
  mediaAssets: readonly MediaAssetRecord[] = [],
  visibilityByKey: VisibilityByKey = {},
): Record<ArtistLinkedAssetKey, ArtistLinkedAssetReadinessState> => {
  const keys: ArtistLinkedAssetKey[] = ["profileImage", "characterArt", "bannerImage", "thumbnailImage", "seoImage", "socialImage"];
  return keys.reduce((states, key) => {
    const asset = findAsset(artist, mediaAssets, key);
    const url = urlForKey(artist, key);
    const visibility = visibilityByKey[key];
    const present = Boolean(asset || url?.trim());
    const required = requiredForKey(key);
    const blockingIssues = compact([
      required && !present ? `${labelForKey[key]} is required before activation.` : undefined,
      hasUnsafeUrl(url) ? `${labelForKey[key]} URL is not public-safe.` : undefined,
      asset?.status === "archived" ? `${labelForKey[key]} asset is archived.` : undefined,
      asset?.metadata?.deletedAt ? `${labelForKey[key]} asset is soft-deleted.` : undefined,
      asset && !assetTypeForKey[key].includes(asset.assetType) ? `${labelForKey[key]} asset type is incompatible.` : undefined,
      visibility && !visibility.publicAllowed && key !== "characterArt" ? `${labelForKey[key]} asset is not public-ready: ${visibility.reason}` : undefined,
      visibility && !visibility.publicAllowed && key === "characterArt" && url?.trim() ? "Character art is linked to a public field but is not public-ready." : undefined,
    ]);
    const warnings = compact([
      key === "profileImage" && !present ? "Profile image is missing; configured fallback may be used." : undefined,
      key === "characterArt" && !present ? "Character art is optional and not uploaded yet." : undefined,
      key === "bannerImage" && !present ? "Banner image is optional and not uploaded yet." : undefined,
      key === "thumbnailImage" && !present ? "Thumbnail image is optional and not uploaded yet." : undefined,
      key === "seoImage" && !present ? "SEO image is missing." : undefined,
      key === "socialImage" && !present ? "Social image is missing." : undefined,
    ]);
    states[key] = {
      key,
      label: labelForKey[key],
      assetId: asset?.assetId,
      url,
      present,
      required,
      publicAllowed: blockingIssues.length === 0 && (visibility?.publicAllowed ?? !hasUnsafeUrl(url)),
      visibility: visibility?.visibility ?? (present ? "unknown" : "missing"),
      blockingIssues,
      warnings,
    };
    return states;
  }, {} as Record<ArtistLinkedAssetKey, ArtistLinkedAssetReadinessState>);
};

export const validateArtistPublicMappingSafety = (
  artist: ArtistAdminRecord,
): { publicArtist: ArtistPublicProfile | null; blockingIssues: string[] } => {
  const publicArtist = mapArtistAdminToPublicProfile({ ...artist, status: "active" });
  const blockingIssues = compact([
    publicArtist ? undefined : "Public artist profile mapping could not be created safely.",
    hasUnsafeUrl(artist.profileImage) ? "Public mapping would receive unsafe profile image URL." : undefined,
    hasUnsafeUrl(artist.profileThumbnailUrl) ? "Public mapping would receive unsafe thumbnail URL." : undefined,
    hasUnsafeUrl(artist.profileBannerUrl) ? "Public mapping would receive unsafe banner URL." : undefined,
    metadataString(artist, "characterArtUrl") && hasUnsafeUrl(metadataString(artist, "characterArtUrl")) ? "Character art URL is not public-safe." : undefined,
  ]);
  return { publicArtist, blockingIssues };
};

const validateExternalLinks = (links: ArtistExternalLinks | undefined): string[] =>
  Object.entries(links ?? {})
    .filter(([, url]) => typeof url === "string" && url.trim() && !isSafePublicMediaUrl(url))
    .map(([platform]) => `External link for ${platform} is not public-safe.`);

const validateMetadataState = (artist: ArtistAdminRecord): ArtistMetadataReadinessState => {
  const seoImageUnsafe = hasUnsafeUrl(artist.seoMetadata?.imageUrl);
  const socialImageUnsafe = hasUnsafeUrl(artist.socialMetadata?.imageUrl);
  return {
    seoTitlePresent: Boolean(artist.seoMetadata?.title?.trim()),
    seoDescriptionPresent: Boolean(artist.seoMetadata?.description?.trim()),
    seoImageSafe: !seoImageUnsafe,
    socialTitlePresent: Boolean(artist.socialMetadata?.title?.trim()),
    socialDescriptionPresent: Boolean(artist.socialMetadata?.description?.trim()),
    socialImageSafe: !socialImageUnsafe,
    warnings: compact([
      artist.seoMetadata?.title?.trim() ? undefined : "SEO title is missing.",
      artist.seoMetadata?.description?.trim() ? undefined : "SEO description is missing.",
      artist.socialMetadata?.title?.trim() ? undefined : "Social title is missing.",
      artist.socialMetadata?.description?.trim() ? undefined : "Social description is missing.",
      artist.socialMetadata?.imageUrl?.trim() ? undefined : "Social image is missing.",
    ]),
    blockingIssues: compact([
      seoImageUnsafe ? "SEO image URL is not public-safe." : undefined,
      socialImageUnsafe ? "Social image URL is not public-safe." : undefined,
    ]),
  };
};

export const buildArtistPublishReadiness = (
  artist: ArtistAdminRecord,
  mediaAssets: readonly MediaAssetRecord[] = [],
  visibilityByKey: VisibilityByKey = {},
): ArtistPublishReadiness => {
  const missingFields = validateArtistRequiredFields(artist);
  const linkedAssetStates = validateArtistLinkedMediaReadiness(artist, mediaAssets, visibilityByKey);
  const metadataState = validateMetadataState(artist);
  const mapping = validateArtistPublicMappingSafety(artist);
  const externalIssues = validateExternalLinks(artist.externalLinks);
  const slugIssue = artist.slug.trim() && !validateArtistSlug(artist.slug) ? "Artist slug is not URL-safe." : undefined;
  const blockingIssues = [
    ...Object.values(linkedAssetStates).flatMap((state) => state.blockingIssues),
    ...metadataState.blockingIssues,
    ...mapping.blockingIssues,
    ...externalIssues,
    ...compact([slugIssue]),
  ];
  const warnings = [
    ...Object.values(linkedAssetStates).flatMap((state) => state.warnings),
    ...metadataState.warnings,
  ];
  const ready = missingFields.length === 0 && blockingIssues.length === 0;
  return {
    artistId: artist.artistId,
    ready,
    publicVisibility: ready ? "public" : blockingIssues.length ? "blocked" : "needs_setup",
    blockingIssues,
    warnings,
    missingFields,
    linkedAssetStates,
    metadataState,
    checkedAt: new Date().toISOString(),
    metadata: {
      publicMappingReady: Boolean(mapping.publicArtist),
      externalIssueCount: externalIssues.length,
      warningCount: warnings.length,
    },
  };
};

export const getArtistPublishWarnings = (readiness: ArtistPublishReadiness): string[] => readiness.warnings;

export const getArtistPublishBlockingIssues = (readiness: ArtistPublishReadiness): string[] => readiness.blockingIssues;

export const formatArtistReadinessStatus = (readiness: ArtistPublishReadiness): string => {
  if (readiness.ready) return "Ready to Activate";
  if (readiness.missingFields.length) return "Needs Profile Data";
  if (readiness.blockingIssues.some((issue) => issue.toLowerCase().includes("media") || issue.toLowerCase().includes("asset") || issue.toLowerCase().includes("url"))) return "Media Blocked";
  if (Object.values(readiness.linkedAssetStates).some((state) => state.required && !state.present)) return "Needs Media";
  return "Needs Review";
};
