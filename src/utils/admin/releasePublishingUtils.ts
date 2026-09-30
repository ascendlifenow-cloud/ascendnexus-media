import type {
  ArtistAdminRecord,
  MediaAssetRecord,
  ReleaseArtistReadinessState,
  ReleaseLinkedAssetKey,
  ReleaseLinkedAssetReadinessState,
  ReleaseMetadataReadinessState,
  ReleasePublishReadiness,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { MediaAssetVisibilityState } from "../../models/media";
import type { PublicSongRelease, ReleaseExternalLinks } from "../../models/release";
import { mapReleaseAdminToPublicRelease } from "./adminMappers";
import { validateReleaseSlug } from "../../admin/utils/adminReleaseFormUtils";
import { getMediaCategoryFromAssetType } from "../media/mediaTypeUtils";
import { isSafePublicMediaUrl } from "../media/publicSafeUrlUtils";

type VisibilityByKey = Partial<Record<ReleaseLinkedAssetKey, MediaAssetVisibilityState>>;

const isValidDate = (value: string): boolean => {
  const time = Date.parse(value);
  return Boolean(value.trim()) && Number.isFinite(time);
};

const compact = (items: Array<string | undefined | null | false>): string[] =>
  items.filter((item): item is string => Boolean(item));

const hasUnsafeUrl = (value: string | undefined): boolean =>
  Boolean(value?.trim()) && !isSafePublicMediaUrl(value);

const metadataString = (asset: MediaAssetRecord | undefined, key: string): string | undefined => {
  const value = asset?.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

const hasPromotableStorageObject = (asset: MediaAssetRecord | undefined): boolean => {
  if (!asset) return false;
  if (metadataString(asset, "storageObjectId") || metadataString(asset, "publicStorageObjectId")) return true;
  const storage = asset.metadata?.storage;
  if (storage && typeof storage === "object" && !Array.isArray(storage)) {
    const storageObjectId = (storage as Record<string, unknown>).storageObjectId;
    return typeof storageObjectId === "string" && Boolean(storageObjectId.trim());
  }
  return false;
};

const isPromotablePublicImageAsset = (asset: MediaAssetRecord | undefined): boolean =>
  Boolean(asset && getMediaCategoryFromAssetType(asset.assetType) === "image" && asset.status !== "archived" && !asset.metadata?.deletedAt && hasPromotableStorageObject(asset));

const getMetadataString = (release: SongReleaseAdminRecord, key: string): string | undefined => {
  const value = release.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
};

export const validateReleaseRequiredFields = (release: SongReleaseAdminRecord): string[] => compact([
  release.title?.trim() ? undefined : "Title",
  release.slug?.trim() ? undefined : "Slug",
  release.artistId?.trim() ? undefined : "Artist",
  release.releaseDate?.trim() && isValidDate(release.releaseDate) ? undefined : "Release Date",
  release.genre?.trim() ? undefined : "Genre",
]);

export const validateReleaseArtistReadiness = (
  release: SongReleaseAdminRecord,
  artist: ArtistAdminRecord | null | undefined,
): ReleaseArtistReadinessState => {
  const blockingIssues = compact([
    release.artistId?.trim() ? undefined : "Release needs an assigned artist.",
    release.artistId?.trim() && !artist ? "Assigned artist was not found." : undefined,
    artist && artist.status !== "active" ? "Assigned artist is not active." : undefined,
  ]);
  return {
    artistId: release.artistId || undefined,
    exists: Boolean(artist),
    active: artist?.status === "active",
    displayName: artist?.displayName,
    blockingIssues,
  };
};

const findAsset = (
  release: SongReleaseAdminRecord,
  mediaAssets: readonly MediaAssetRecord[],
  key: ReleaseLinkedAssetKey,
): MediaAssetRecord | undefined => {
  const explicitId =
    key === "coverArt" ? getMetadataString(release, "coverArtAssetId") :
      key === "audioPreview" ? getMetadataString(release, "audioPreviewAssetId") :
        key === "fullSong" ? getMetadataString(release, "fullSongAssetId") :
          key === "seoImage" ? getMetadataString(release, "seoImageAssetId") :
            getMetadataString(release, "socialImageAssetId");
  if (explicitId) return mediaAssets.find((asset) => asset.assetId === explicitId);
  if (key === "coverArt") return mediaAssets.find((asset) => asset.ownerType === "release" && asset.ownerId === release.releaseId && asset.assetType === "cover_art");
  if (key === "audioPreview") return mediaAssets.find((asset) => asset.ownerType === "release" && asset.ownerId === release.releaseId && asset.assetType === "audio_preview");
  if (key === "fullSong") return mediaAssets.find((asset) => asset.ownerType === "release" && asset.ownerId === release.releaseId && asset.assetType === "full_song");
  return undefined;
};

const urlForKey = (release: SongReleaseAdminRecord, key: ReleaseLinkedAssetKey): string | undefined => {
  if (key === "coverArt") return release.coverArtUrl;
  if (key === "audioPreview") return release.audioPreviewUrl;
  if (key === "fullSong") return getMetadataString(release, "fullSongUrl");
  if (key === "seoImage") return release.seoMetadata?.imageUrl;
  return release.socialMetadata?.imageUrl;
};

const labelForKey: Record<ReleaseLinkedAssetKey, string> = {
  coverArt: "Cover Art",
  audioPreview: "Audio Preview",
  fullSong: "Full Song",
  seoImage: "SEO Image",
  socialImage: "Social Image",
};

const requiredForKey = (key: ReleaseLinkedAssetKey): boolean => key === "coverArt";

const getComputedAssetVisibility = (
  key: ReleaseLinkedAssetKey,
  present: boolean,
  url: string | undefined,
  unsafeUrlCanBePromoted: boolean,
): string => {
  if (!present) return "missing";
  if (key === "fullSong") return "admin_only";
  if (unsafeUrlCanBePromoted) return "pending_public_promotion";
  if (!hasUnsafeUrl(url)) return "public";
  return "unknown";
};

export const validateReleaseLinkedMediaReadiness = (
  release: SongReleaseAdminRecord,
  mediaAssets: readonly MediaAssetRecord[] = [],
  visibilityByKey: VisibilityByKey = {},
): Record<ReleaseLinkedAssetKey, ReleaseLinkedAssetReadinessState> => {
  const keys: ReleaseLinkedAssetKey[] = ["coverArt", "audioPreview", "fullSong", "seoImage", "socialImage"];
  return keys.reduce((states, key) => {
    const asset = findAsset(release, mediaAssets, key);
    const url = urlForKey(release, key);
    const visibility = visibilityByKey[key];
    const present = Boolean(asset || url?.trim());
    const required = requiredForKey(key);
    const fullSongPublicPlaybackAllowed = release.metadata?.fullSongPublicPlaybackAllowed === true;
    const unsafeUrlCanBePromoted = key !== "fullSong" && hasUnsafeUrl(url) && isPromotablePublicImageAsset(asset);
    const blockingIssues = compact([
      required && !present ? `${labelForKey[key]} is required before publishing.` : undefined,
      key !== "fullSong" && hasUnsafeUrl(url) && !unsafeUrlCanBePromoted ? `${labelForKey[key]} URL is not public-safe.` : undefined,
      asset?.status === "archived" ? `${labelForKey[key]} asset is archived.` : undefined,
      asset?.metadata?.deletedAt ? `${labelForKey[key]} asset is soft-deleted.` : undefined,
      visibility && !visibility.publicAllowed && key !== "fullSong" ? `${labelForKey[key]} asset is not public-ready: ${visibility.reason}` : undefined,
      key === "fullSong" && url?.trim() && fullSongPublicPlaybackAllowed === true && hasUnsafeUrl(url) ? "Full song public playback URL is not safe." : undefined,
    ]);
    const warnings = compact([
      key === "coverArt" && !present ? "Cover art is missing; configured fallback may be used." : undefined,
      key === "audioPreview" && !present ? "Audio preview is missing; public song page will show preview coming soon." : undefined,
      key === "fullSong" && asset && !url?.trim() ? "Full song asset is linked for admin use and will not be exposed publicly." : undefined,
      key === "fullSong" && url?.trim() && fullSongPublicPlaybackAllowed !== true ? "Full song URL is stored for admin use and will not be exposed publicly." : undefined,
      unsafeUrlCanBePromoted ? `${labelForKey[key]} will be promoted to public storage when the release is saved.` : undefined,
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
      publicAllowed: blockingIssues.length === 0 && (key === "fullSong" ? fullSongPublicPlaybackAllowed !== true || !hasUnsafeUrl(url) : (visibility?.publicAllowed ?? (!hasUnsafeUrl(url) || unsafeUrlCanBePromoted))),
      visibility: visibility?.visibility ?? getComputedAssetVisibility(key, present, url, unsafeUrlCanBePromoted),
      blockingIssues,
      warnings,
    };
    return states;
  }, {} as Record<ReleaseLinkedAssetKey, ReleaseLinkedAssetReadinessState>);
};

export const validateReleasePublicMappingSafety = (
  release: SongReleaseAdminRecord,
  activeArtistIds: readonly string[],
  mediaAssets: readonly MediaAssetRecord[] = [],
): { publicRelease: PublicSongRelease | null; blockingIssues: string[] } => {
  const publicRelease = mapReleaseAdminToPublicRelease({ ...release, status: "published" }, activeArtistIds);
  const coverArtAsset = findAsset(release, mediaAssets, "coverArt");
  const coverArtUnsafeCanBePromoted = hasUnsafeUrl(release.coverArtUrl) && isPromotablePublicImageAsset(coverArtAsset);
  const blockingIssues = compact([
    publicRelease ? undefined : "Public release mapping could not be created safely.",
    hasUnsafeUrl(release.coverArtUrl) && !coverArtUnsafeCanBePromoted ? "Public mapping would receive unsafe cover art URL." : undefined,
    hasUnsafeUrl(release.audioPreviewUrl) ? "Public mapping would receive unsafe audio preview URL." : undefined,
  ]);
  return { publicRelease, blockingIssues };
};

const validateExternalLinks = (links: ReleaseExternalLinks): string[] =>
  Object.entries(links ?? {})
    .filter(([, url]) => typeof url === "string" && url.trim() && !isSafePublicMediaUrl(url))
    .map(([platform]) => `External link for ${platform} is not public-safe.`);

const validateMetadataState = (release: SongReleaseAdminRecord): ReleaseMetadataReadinessState => {
  const seoImageUnsafe = hasUnsafeUrl(release.seoMetadata?.imageUrl);
  const socialImageUnsafe = hasUnsafeUrl(release.socialMetadata?.imageUrl);
  return {
    seoTitlePresent: Boolean(release.seoMetadata?.title?.trim()),
    seoDescriptionPresent: Boolean(release.seoMetadata?.description?.trim()),
    seoImageSafe: !seoImageUnsafe,
    socialTitlePresent: Boolean(release.socialMetadata?.title?.trim()),
    socialDescriptionPresent: Boolean(release.socialMetadata?.description?.trim()),
    socialImageSafe: !socialImageUnsafe,
    warnings: compact([
      release.seoMetadata?.title?.trim() ? undefined : "SEO title is missing.",
      release.seoMetadata?.description?.trim() ? undefined : "SEO description is missing.",
      release.socialMetadata?.title?.trim() ? undefined : "Social title is missing.",
      release.socialMetadata?.description?.trim() ? undefined : "Social description is missing.",
      release.socialMetadata?.imageUrl?.trim() ? undefined : "Social image is missing.",
    ]),
    blockingIssues: compact([
      seoImageUnsafe ? "SEO image URL is not public-safe." : undefined,
      socialImageUnsafe ? "Social image URL is not public-safe." : undefined,
    ]),
  };
};

export const buildReleasePublishReadiness = (
  release: SongReleaseAdminRecord,
  artist: ArtistAdminRecord | null | undefined,
  mediaAssets: readonly MediaAssetRecord[] = [],
  visibilityByKey: VisibilityByKey = {},
): ReleasePublishReadiness => {
  const missingFields = validateReleaseRequiredFields(release);
  const artistState = validateReleaseArtistReadiness(release, artist);
  const linkedAssetStates = validateReleaseLinkedMediaReadiness(release, mediaAssets, visibilityByKey);
  const metadataState = validateMetadataState(release);
  const mapping = validateReleasePublicMappingSafety(release, artist?.status === "active" ? [artist.artistId] : [], mediaAssets);
  const externalIssues = validateExternalLinks(release.externalLinks);
  const slugIssue = release.slug.trim() && !validateReleaseSlug(release.slug) ? "Release slug is not URL-safe." : undefined;
  const blockingIssues = [
    ...artistState.blockingIssues,
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
    releaseId: release.releaseId,
    ready,
    publicVisibility: ready ? "public" : blockingIssues.length ? "blocked" : "needs_setup",
    blockingIssues,
    warnings,
    missingFields,
    linkedAssetStates,
    artistState,
    metadataState,
    checkedAt: new Date().toISOString(),
    metadata: {
      publicMappingReady: Boolean(mapping.publicRelease),
      externalIssueCount: externalIssues.length,
      warningCount: warnings.length,
    },
  };
};

export const getReleasePublishWarnings = (readiness: ReleasePublishReadiness): string[] => readiness.warnings;

export const getReleasePublishBlockingIssues = (readiness: ReleasePublishReadiness): string[] => readiness.blockingIssues;

export const formatReleaseReadinessStatus = (readiness: ReleasePublishReadiness): string => {
  if (readiness.ready) return "Ready to Publish";
  if (readiness.blockingIssues.some((issue) => issue.toLowerCase().includes("artist"))) return "Artist Not Public";
  if (readiness.blockingIssues.some((issue) => issue.toLowerCase().includes("asset") || issue.toLowerCase().includes("url"))) return "Media Blocked";
  if (readiness.missingFields.length) return "Missing Required Fields";
  return "Needs Review";
};
