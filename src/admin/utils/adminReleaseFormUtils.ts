import type { ReleaseExternalLinks, ReleaseStatus, FeaturedReleasePlacement } from "../../models/release";
import type { ArtistAdminRecord, CreateReleaseDto, SongReleaseAdminRecord, UpdateReleaseDto } from "../../models/admin";
import type { SeoMetadata } from "../../models/seo";
import type { SocialShareMetadata, TwitterCardType } from "../../models/social";

export type ReleasePublicVisibilityState = "public" | "not_public" | "needs_required_fields" | "artist_not_public";

export interface AdminReleaseFormState {
  releaseId?: string;
  title: string;
  slug: string;
  songId: string;
  artistId: string;
  releaseDate: string;
  genre: string;
  description: string;
  coverArtUrl: string;
  coverArtThumbnailUrl: string;
  coverArtLargeUrl: string;
  coverArtAlt: string;
  coverArtAssetId: string;
  coverArtStorageObjectId: string;
  previousCoverArtAssetIdsInput: string;
  pendingCoverArtAssignment: boolean;
  audioPreviewUrl: string;
  audioPreviewAssetId: string;
  audioPreviewStorageObjectId: string;
  audioPreviewOriginalFileName: string;
  audioPreviewDuration: string;
  audioPreviewFileSizeBytes: string;
  audioPreviewMimeType: string;
  previousAudioPreviewAssetIdsInput: string;
  pendingAudioPreviewAssignment: boolean;
  fullSongAssetId: string;
  fullSongStorageObjectId: string;
  fullSongUrl: string;
  fullSongOriginalFileName: string;
  fullSongDuration: string;
  fullSongFileSizeBytes: string;
  fullSongMimeType: string;
  previousFullSongAssetIdsInput: string;
  pendingFullSongAssignment: boolean;
  fullSongPublicPlaybackAllowed: boolean;
  styleTagsInput: string;
  lyrics: string;
  internalNotes: string;
  externalLinks: Required<Record<keyof ReleaseExternalLinks, string>>;
  featured: boolean;
  featuredSortOrder: string;
  featuredLabel: string;
  featuredDescription: string;
  featuredPlacement: FeaturedReleasePlacement;
  seoTitle: string;
  seoDescription: string;
  seoCanonicalPath: string;
  seoImageUrl: string;
  seoNoIndex: boolean;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  socialImageAlt: string;
  twitterCard: TwitterCardType;
  status: ReleaseStatus;
}

export interface AdminReleaseFormValidation {
  valid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

export const releaseExternalLinkLabels: Record<keyof ReleaseExternalLinks, string> = {
  spotify: "Spotify",
  appleMusic: "Apple Music",
  youtube: "YouTube",
  suno: "Suno",
  soundCloud: "SoundCloud",
  tikTok: "TikTok",
  instagram: "Instagram",
  website: "Website",
  customUrl: "Custom URL",
};

const emptyLinks: AdminReleaseFormState["externalLinks"] = {
  spotify: "",
  appleMusic: "",
  youtube: "",
  suno: "",
  soundCloud: "",
  tikTok: "",
  instagram: "",
  website: "",
  customUrl: "",
};

export const slugifyReleaseValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const validateReleaseSlug = (slug: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());

const parseList = (value: string): string[] =>
  [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];

const isValidDate = (value: string): boolean => {
  if (!value.trim()) return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
};

const safeUrl = (value: string): boolean => {
  const url = value.trim();
  if (!url) return true;
  if (/^javascript:/i.test(url)) return false;
  if (url.includes("..")) return false;
  if (/^[a-z0-9][a-z0-9/_\-.,?=&%]+$/i.test(url)) return true;
  return url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/");
};

const compactLinks = (links: AdminReleaseFormState["externalLinks"]): ReleaseExternalLinks => {
  const entries = Object.entries(links).filter(([, url]) => url.trim());
  return entries.length ? (Object.fromEntries(entries) as ReleaseExternalLinks) : {};
};

const buildReleaseMetadata = (state: AdminReleaseFormState): Record<string, string | number | boolean | null> | undefined => {
  const metadata: Record<string, string | number | boolean | null> = {};
  if (state.internalNotes.trim()) metadata.internalNotes = state.internalNotes.trim();
  if (state.coverArtAssetId.trim()) metadata.coverArtAssetId = state.coverArtAssetId.trim();
  if (state.coverArtStorageObjectId.trim()) metadata.coverArtStorageObjectId = state.coverArtStorageObjectId.trim();
  if (state.coverArtAlt.trim()) metadata.coverArtAlt = state.coverArtAlt.trim();
  if (state.previousCoverArtAssetIdsInput.trim()) metadata.previousCoverArtAssetIds = state.previousCoverArtAssetIdsInput.trim();
  if (state.pendingCoverArtAssignment) metadata.pendingCoverArtAssignment = true;
  if (state.audioPreviewAssetId.trim()) metadata.audioPreviewAssetId = state.audioPreviewAssetId.trim();
  if (state.audioPreviewStorageObjectId.trim()) metadata.audioPreviewStorageObjectId = state.audioPreviewStorageObjectId.trim();
  if (state.audioPreviewOriginalFileName.trim()) metadata.audioPreviewOriginalFileName = state.audioPreviewOriginalFileName.trim();
  if (state.audioPreviewDuration.trim()) metadata.audioPreviewDuration = Number(state.audioPreviewDuration);
  if (state.audioPreviewFileSizeBytes.trim()) metadata.audioPreviewFileSizeBytes = Number(state.audioPreviewFileSizeBytes);
  if (state.audioPreviewMimeType.trim()) metadata.audioPreviewMimeType = state.audioPreviewMimeType.trim();
  if (state.previousAudioPreviewAssetIdsInput.trim()) metadata.previousAudioPreviewAssetIds = state.previousAudioPreviewAssetIdsInput.trim();
  if (state.pendingAudioPreviewAssignment) metadata.pendingAudioPreviewAssignment = true;
  if (state.fullSongAssetId.trim()) metadata.fullSongAssetId = state.fullSongAssetId.trim();
  if (state.fullSongStorageObjectId.trim()) metadata.fullSongStorageObjectId = state.fullSongStorageObjectId.trim();
  if (state.fullSongOriginalFileName.trim()) metadata.fullSongOriginalFileName = state.fullSongOriginalFileName.trim();
  if (state.fullSongDuration.trim()) metadata.fullSongDuration = Number(state.fullSongDuration);
  if (state.fullSongFileSizeBytes.trim()) metadata.fullSongFileSizeBytes = Number(state.fullSongFileSizeBytes);
  if (state.fullSongMimeType.trim()) metadata.fullSongMimeType = state.fullSongMimeType.trim();
  if (state.previousFullSongAssetIdsInput.trim()) metadata.previousFullSongAssetIds = state.previousFullSongAssetIdsInput.trim();
  if (state.pendingFullSongAssignment) metadata.pendingFullSongAssignment = true;
  metadata.fullSongPublicPlaybackAllowed = state.fullSongPublicPlaybackAllowed;
  if (state.audioPreviewAssetId.trim() || state.fullSongAssetId.trim()) metadata.waveformReady = false;
  return Object.keys(metadata).length ? metadata : undefined;
};

const maybeSeo = (state: AdminReleaseFormState): SeoMetadata | undefined => {
  if (!state.seoTitle && !state.seoDescription && !state.seoCanonicalPath && !state.seoImageUrl && !state.seoNoIndex) return undefined;
  return {
    title: state.seoTitle,
    description: state.seoDescription,
    canonicalPath: state.seoCanonicalPath || undefined,
    imageUrl: state.seoImageUrl || undefined,
    type: "song",
    noIndex: state.seoNoIndex,
  };
};

const maybeSocial = (state: AdminReleaseFormState): SocialShareMetadata | undefined => {
  if (!state.socialTitle && !state.socialDescription && !state.socialImageUrl && !state.socialImageAlt) return undefined;
  return {
    title: state.socialTitle,
    description: state.socialDescription,
    imageUrl: state.socialImageUrl,
    imageAlt: state.socialImageAlt || undefined,
    type: "music.song",
    twitterCard: state.twitterCard,
    audioUrl: state.audioPreviewUrl || undefined,
    releaseDate: state.releaseDate || undefined,
  };
};

export const createEmptyReleaseFormState = (): AdminReleaseFormState => ({
  title: "",
  slug: "",
  songId: "",
  artistId: "",
  releaseDate: "",
  genre: "",
  description: "",
  coverArtUrl: "",
  coverArtThumbnailUrl: "",
  coverArtLargeUrl: "",
  coverArtAlt: "",
  coverArtAssetId: "",
  coverArtStorageObjectId: "",
  previousCoverArtAssetIdsInput: "",
  pendingCoverArtAssignment: false,
  audioPreviewUrl: "",
  audioPreviewAssetId: "",
  audioPreviewStorageObjectId: "",
  audioPreviewOriginalFileName: "",
  audioPreviewDuration: "",
  audioPreviewFileSizeBytes: "",
  audioPreviewMimeType: "",
  previousAudioPreviewAssetIdsInput: "",
  pendingAudioPreviewAssignment: false,
  fullSongAssetId: "",
  fullSongStorageObjectId: "",
  fullSongUrl: "",
  fullSongOriginalFileName: "",
  fullSongDuration: "",
  fullSongFileSizeBytes: "",
  fullSongMimeType: "",
  previousFullSongAssetIdsInput: "",
  pendingFullSongAssignment: false,
  fullSongPublicPlaybackAllowed: false,
  styleTagsInput: "",
  lyrics: "",
  internalNotes: "",
  externalLinks: emptyLinks,
  featured: false,
  featuredSortOrder: "",
  featuredLabel: "",
  featuredDescription: "",
  featuredPlacement: "homepage",
  seoTitle: "",
  seoDescription: "",
  seoCanonicalPath: "",
  seoImageUrl: "",
  seoNoIndex: false,
  socialTitle: "",
  socialDescription: "",
  socialImageUrl: "",
  socialImageAlt: "",
  twitterCard: "summary_large_image",
  status: "draft",
});

export const mapReleaseToFormState = (release: SongReleaseAdminRecord): AdminReleaseFormState => ({
  ...createEmptyReleaseFormState(),
  releaseId: release.releaseId,
  title: release.title,
  slug: release.slug,
  songId: release.songId,
  artistId: release.artistId,
  releaseDate: release.releaseDate,
  genre: release.genre,
  description: release.description ?? "",
  coverArtUrl: release.coverArtUrl ?? "",
  coverArtThumbnailUrl: release.coverArtThumbnailUrl ?? "",
  coverArtLargeUrl: release.coverArtLargeUrl ?? "",
  coverArtAlt: typeof release.metadata?.coverArtAlt === "string" ? release.metadata.coverArtAlt : "",
  coverArtAssetId: typeof release.metadata?.coverArtAssetId === "string" ? release.metadata.coverArtAssetId : "",
  coverArtStorageObjectId: typeof release.metadata?.coverArtStorageObjectId === "string" ? release.metadata.coverArtStorageObjectId : "",
  previousCoverArtAssetIdsInput: typeof release.metadata?.previousCoverArtAssetIds === "string" ? release.metadata.previousCoverArtAssetIds : "",
  pendingCoverArtAssignment: Boolean(release.metadata?.pendingCoverArtAssignment),
  audioPreviewUrl: release.audioPreviewUrl ?? "",
  audioPreviewAssetId: typeof release.metadata?.audioPreviewAssetId === "string" ? release.metadata.audioPreviewAssetId : "",
  audioPreviewStorageObjectId: typeof release.metadata?.audioPreviewStorageObjectId === "string" ? release.metadata.audioPreviewStorageObjectId : "",
  audioPreviewOriginalFileName: typeof release.metadata?.audioPreviewOriginalFileName === "string" ? release.metadata.audioPreviewOriginalFileName : "",
  audioPreviewDuration: release.metadata?.audioPreviewDuration !== undefined ? String(release.metadata.audioPreviewDuration) : "",
  audioPreviewFileSizeBytes: release.metadata?.audioPreviewFileSizeBytes !== undefined ? String(release.metadata.audioPreviewFileSizeBytes) : "",
  audioPreviewMimeType: typeof release.metadata?.audioPreviewMimeType === "string" ? release.metadata.audioPreviewMimeType : "",
  previousAudioPreviewAssetIdsInput: typeof release.metadata?.previousAudioPreviewAssetIds === "string" ? release.metadata.previousAudioPreviewAssetIds : "",
  pendingAudioPreviewAssignment: Boolean(release.metadata?.pendingAudioPreviewAssignment),
  fullSongAssetId: typeof release.metadata?.fullSongAssetId === "string" ? release.metadata.fullSongAssetId : "",
  fullSongStorageObjectId: typeof release.metadata?.fullSongStorageObjectId === "string" ? release.metadata.fullSongStorageObjectId : "",
  fullSongUrl: typeof release.metadata?.fullSongUrl === "string" ? release.metadata.fullSongUrl : "",
  fullSongOriginalFileName: typeof release.metadata?.fullSongOriginalFileName === "string" ? release.metadata.fullSongOriginalFileName : "",
  fullSongDuration: release.metadata?.fullSongDuration !== undefined ? String(release.metadata.fullSongDuration) : "",
  fullSongFileSizeBytes: release.metadata?.fullSongFileSizeBytes !== undefined ? String(release.metadata.fullSongFileSizeBytes) : "",
  fullSongMimeType: typeof release.metadata?.fullSongMimeType === "string" ? release.metadata.fullSongMimeType : "",
  previousFullSongAssetIdsInput: typeof release.metadata?.previousFullSongAssetIds === "string" ? release.metadata.previousFullSongAssetIds : "",
  pendingFullSongAssignment: Boolean(release.metadata?.pendingFullSongAssignment),
  fullSongPublicPlaybackAllowed: Boolean(release.metadata?.fullSongPublicPlaybackAllowed),
  styleTagsInput: release.styleTags?.join(", ") ?? "",
  lyrics: release.lyrics ?? "",
  internalNotes: typeof release.metadata?.internalNotes === "string" ? release.metadata.internalNotes : "",
  externalLinks: { ...emptyLinks, ...(release.externalLinks ?? {}) },
  featured: Boolean(release.featured),
  featuredSortOrder: release.featuredSortOrder !== undefined ? String(release.featuredSortOrder) : "",
  featuredLabel: release.featuredLabel ?? "",
  featuredDescription: release.featuredDescription ?? "",
  featuredPlacement: release.featuredPlacement ?? "homepage",
  seoTitle: release.seoMetadata?.title ?? "",
  seoDescription: release.seoMetadata?.description ?? "",
  seoCanonicalPath: release.seoMetadata?.canonicalPath ?? "",
  seoImageUrl: release.seoMetadata?.imageUrl ?? "",
  seoNoIndex: Boolean(release.seoMetadata?.noIndex),
  socialTitle: release.socialMetadata?.title ?? "",
  socialDescription: release.socialMetadata?.description ?? "",
  socialImageUrl: release.socialMetadata?.imageUrl ?? "",
  socialImageAlt: release.socialMetadata?.imageAlt ?? "",
  twitterCard: release.socialMetadata?.twitterCard ?? "summary_large_image",
  status: release.status,
});

export const validateReleasePublishReadiness = (state: AdminReleaseFormState, artist?: ArtistAdminRecord | null): string[] => {
  const missing = ["title", "slug", "artistId", "releaseDate"].filter(
    (field) => !String(state[field as keyof AdminReleaseFormState] ?? "").trim(),
  );
  if (artist && artist.status !== "active") missing.push("active artist");
  if (!artist && state.artistId.trim()) missing.push("valid artist");
  return missing;
};

export const validateReleaseExternalLinks = (state: AdminReleaseFormState): string[] =>
  Object.entries(state.externalLinks).filter(([, url]) => !safeUrl(url)).map(([platform]) => platform);

export const validateFeaturedReleaseReadiness = (state: AdminReleaseFormState, artist?: ArtistAdminRecord | null): string[] => {
  if (!state.featured) return [];
  const warnings: string[] = [];
  if (state.status !== "published") warnings.push("Featured releases must be published before they appear publicly.");
  if (artist && artist.status !== "active") warnings.push("Featured releases require an active artist for public placement.");
  if (state.featuredSortOrder && !Number.isFinite(Number(state.featuredSortOrder))) warnings.push("Featured sort order must be numeric.");
  return warnings;
};

export const getReleaseFormMissingFields = (state: AdminReleaseFormState): string[] => {
  const fields: string[] = [];
  if (!state.title.trim()) fields.push("Title");
  if (!state.slug.trim()) fields.push("Slug");
  if (!state.artistId.trim()) fields.push("Artist");
  if (!state.releaseDate.trim()) fields.push("Release Date");
  if (!state.genre.trim()) fields.push("Genre");
  if (!state.coverArtUrl.trim()) fields.push("Cover Art");
  if (!state.audioPreviewUrl.trim()) fields.push("Audio Preview");
  return fields;
};

export const getReleasePublicVisibilityState = (
  state: AdminReleaseFormState,
  artist?: ArtistAdminRecord | null,
): ReleasePublicVisibilityState => {
  if (state.status !== "published") return "not_public";
  if (!state.title.trim() || !state.slug.trim() || !state.artistId.trim() || !state.releaseDate.trim()) return "needs_required_fields";
  if (!artist || artist.status !== "active") return "artist_not_public";
  return "public";
};

export const validateReleaseForm = (
  state: AdminReleaseFormState,
  artist?: ArtistAdminRecord | null,
): AdminReleaseFormValidation => {
  const errors: Record<string, string> = {};
  if (!state.title.trim()) errors.title = "Title is required.";
  if (state.status === "published" && !state.slug.trim()) errors.slug = "Slug is required before publishing.";
  if (state.slug.trim() && !validateReleaseSlug(state.slug)) errors.slug = "Slug must be lowercase, URL-safe, and hyphen-separated.";
  if (!state.artistId.trim()) errors.artistId = "Artist is required before saving a release.";
  if (state.status === "published" && artist && artist.status !== "active") errors.artistId = "Published releases require an active artist.";
  if (state.status === "published" && !state.releaseDate.trim()) errors.releaseDate = "Release date is required before publishing.";
  if (state.releaseDate.trim() && !isValidDate(state.releaseDate)) errors.releaseDate = "Release date must be valid.";
  if (!["draft", "published", "archived"].includes(state.status)) errors.status = "Status is invalid.";
  if (!safeUrl(state.coverArtUrl)) errors.coverArtUrl = "Cover art URL is not safe.";
  if (!safeUrl(state.coverArtThumbnailUrl)) errors.coverArtThumbnailUrl = "Thumbnail URL is not safe.";
  if (!safeUrl(state.coverArtLargeUrl)) errors.coverArtLargeUrl = "Large cover art URL is not safe.";
  if (!safeUrl(state.audioPreviewUrl)) errors.audioPreviewUrl = "Audio preview URL is not safe.";
  Object.entries(state.externalLinks).forEach(([platform, url]) => {
    if (!safeUrl(url)) errors[`externalLinks.${platform}`] = `${releaseExternalLinkLabels[platform as keyof ReleaseExternalLinks]} URL is not safe.`;
  });
  if (state.featuredSortOrder && !Number.isFinite(Number(state.featuredSortOrder))) errors.featuredSortOrder = "Featured sort order must be numeric.";
  if (!safeUrl(state.seoImageUrl)) errors.seoImageUrl = "SEO image URL is not safe.";
  if (!safeUrl(state.socialImageUrl)) errors.socialImageUrl = "Social image URL is not safe.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    missingFields: getReleaseFormMissingFields(state),
  };
};

export const validateCreateReleaseDto = (payload: CreateReleaseDto): AdminReleaseFormValidation =>
  validateReleaseForm(mapReleaseToFormState({
    ...payload,
    releaseId: payload.releaseId ?? "new-release",
    songId: payload.songId ?? "new-song",
    createdAt: "",
    updatedAt: "",
  }));

export const validateUpdateReleaseDto = (payload: UpdateReleaseDto): AdminReleaseFormValidation =>
  validateReleaseForm({
    ...createEmptyReleaseFormState(),
    ...payload,
    releaseId: "existing-release",
    songId: "existing-song",
    externalLinks: { ...emptyLinks, ...(payload.externalLinks ?? {}) },
    styleTagsInput: payload.styleTags?.join(", ") ?? "",
    featuredSortOrder: payload.featuredSortOrder !== undefined ? String(payload.featuredSortOrder) : "",
  });

export const toCreateReleaseDto = (state: AdminReleaseFormState): CreateReleaseDto => ({
  releaseId: state.releaseId,
  songId: state.songId.trim() || undefined,
  title: state.title.trim(),
  slug: state.slug.trim(),
  artistId: state.artistId.trim(),
  releaseDate: state.releaseDate.trim(),
  genre: state.genre.trim(),
  description: state.description.trim() || undefined,
  lyrics: state.lyrics.trim() || undefined,
  coverArtUrl: state.coverArtUrl.trim() || undefined,
  coverArtThumbnailUrl: state.coverArtThumbnailUrl.trim() || undefined,
  coverArtLargeUrl: state.coverArtLargeUrl.trim() || undefined,
  audioPreviewUrl: state.audioPreviewUrl.trim() || undefined,
  styleTags: parseList(state.styleTagsInput),
  status: state.status,
  externalLinks: compactLinks(state.externalLinks),
  featured: state.featured,
  featuredSortOrder: state.featuredSortOrder ? Number(state.featuredSortOrder) : undefined,
  featuredLabel: state.featuredLabel.trim() || undefined,
  featuredDescription: state.featuredDescription.trim() || undefined,
  featuredPlacement: state.featuredPlacement,
  seoMetadata: maybeSeo(state),
  socialMetadata: maybeSocial(state),
  metadata: buildReleaseMetadata(state),
});

export const toUpdateReleaseDto = (state: AdminReleaseFormState): UpdateReleaseDto => toCreateReleaseDto(state);
