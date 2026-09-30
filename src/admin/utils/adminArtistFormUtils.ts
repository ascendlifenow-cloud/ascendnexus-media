import type { ArtistExternalLinks } from "../../models/artist";
import type { ArtistAdminRecord, ArtistAdminStatus, CreateArtistDto, UpdateArtistDto } from "../../models/admin";
import type { SeoMetadata } from "../../models/seo";
import type { SocialShareMetadata, SocialShareType, TwitterCardType } from "../../models/social";

export interface AdminArtistFormState {
  artistId?: string;
  displayName: string;
  name: string;
  slug: string;
  shortBio: string;
  bio: string;
  profileImage: string;
  profileThumbnailUrl: string;
  profileBannerUrl: string;
  profileImageAssetId: string;
  profileImageStorageObjectId: string;
  profileThumbnailAssetId: string;
  profileThumbnailStorageObjectId: string;
  profileBannerAssetId: string;
  profileBannerStorageObjectId: string;
  characterArtUrl: string;
  characterArtAssetId: string;
  characterArtStorageObjectId: string;
  previousArtistImageAssetIdsInput: string;
  pendingArtistArtworkAssignment: boolean;
  status: ArtistAdminStatus;
  sortOrder: string;
  featured: boolean;
  featuredSortOrder: string;
  genresInput: string;
  styleTagsInput: string;
  externalLinks: Required<Record<keyof ArtistExternalLinks, string>>;
  seoTitle: string;
  seoDescription: string;
  seoCanonicalPath: string;
  seoImageUrl: string;
  seoNoIndex: boolean;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  socialImageAlt: string;
  socialType: SocialShareType;
  twitterCard: TwitterCardType;
}

export interface AdminArtistFormValidation {
  valid: boolean;
  errors: Record<string, string>;
  missingFields: string[];
}

const emptyLinks: AdminArtistFormState["externalLinks"] = {
  spotify: "",
  appleMusic: "",
  youtube: "",
  suno: "",
  soundCloud: "",
  tikTok: "",
  instagram: "",
  website: "",
};

export const slugifyArtistValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const validateArtistSlug = (slug: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());

const parseList = (value: string): string[] =>
  [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];

const safeUrl = (value: string): boolean => {
  const url = value.trim();
  if (!url) return true;
  if (/^javascript:/i.test(url)) return false;
  if (url.includes("..")) return false;
  if (/^[a-z0-9][a-z0-9/_\-.,?=&%]+$/i.test(url)) return true;
  return url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/");
};

const buildArtistMetadata = (state: AdminArtistFormState): Record<string, string | number | boolean | null> | undefined => {
  const metadata: Record<string, string | number | boolean | null> = {};
  if (state.profileImageAssetId.trim()) metadata.profileImageAssetId = state.profileImageAssetId.trim();
  if (state.profileImageStorageObjectId.trim()) metadata.profileImageStorageObjectId = state.profileImageStorageObjectId.trim();
  if (state.profileThumbnailAssetId.trim()) metadata.profileThumbnailAssetId = state.profileThumbnailAssetId.trim();
  if (state.profileThumbnailStorageObjectId.trim()) metadata.profileThumbnailStorageObjectId = state.profileThumbnailStorageObjectId.trim();
  if (state.profileBannerAssetId.trim()) metadata.profileBannerAssetId = state.profileBannerAssetId.trim();
  if (state.profileBannerStorageObjectId.trim()) metadata.profileBannerStorageObjectId = state.profileBannerStorageObjectId.trim();
  if (state.characterArtUrl.trim()) metadata.characterArtUrl = state.characterArtUrl.trim();
  if (state.characterArtAssetId.trim()) metadata.characterArtAssetId = state.characterArtAssetId.trim();
  if (state.characterArtStorageObjectId.trim()) metadata.characterArtStorageObjectId = state.characterArtStorageObjectId.trim();
  if (state.previousArtistImageAssetIdsInput.trim()) metadata.previousArtistImageAssetIds = state.previousArtistImageAssetIdsInput.trim();
  if (state.pendingArtistArtworkAssignment) metadata.pendingArtistArtworkAssignment = true;
  return Object.keys(metadata).length ? metadata : undefined;
};

export const createEmptyArtistFormState = (): AdminArtistFormState => ({
  displayName: "",
  name: "",
  slug: "",
  shortBio: "",
  bio: "",
  profileImage: "",
  profileThumbnailUrl: "",
  profileBannerUrl: "",
  profileImageAssetId: "",
  profileImageStorageObjectId: "",
  profileThumbnailAssetId: "",
  profileThumbnailStorageObjectId: "",
  profileBannerAssetId: "",
  profileBannerStorageObjectId: "",
  characterArtUrl: "",
  characterArtAssetId: "",
  characterArtStorageObjectId: "",
  previousArtistImageAssetIdsInput: "",
  pendingArtistArtworkAssignment: false,
  status: "draft",
  sortOrder: "100",
  featured: false,
  featuredSortOrder: "",
  genresInput: "",
  styleTagsInput: "",
  externalLinks: emptyLinks,
  seoTitle: "",
  seoDescription: "",
  seoCanonicalPath: "",
  seoImageUrl: "",
  seoNoIndex: false,
  socialTitle: "",
  socialDescription: "",
  socialImageUrl: "",
  socialImageAlt: "",
  socialType: "profile",
  twitterCard: "summary_large_image",
});

export const mapArtistToFormState = (artist: ArtistAdminRecord): AdminArtistFormState => ({
  ...createEmptyArtistFormState(),
  artistId: artist.artistId,
  displayName: artist.displayName,
  name: artist.name,
  slug: artist.slug,
  shortBio: artist.shortBio ?? "",
  bio: artist.bio,
  profileImage: artist.profileImage,
  profileThumbnailUrl: artist.profileThumbnailUrl ?? "",
  profileBannerUrl: artist.profileBannerUrl ?? "",
  profileImageAssetId: typeof artist.metadata?.profileImageAssetId === "string" ? artist.metadata.profileImageAssetId : "",
  profileImageStorageObjectId: typeof artist.metadata?.profileImageStorageObjectId === "string" ? artist.metadata.profileImageStorageObjectId : "",
  profileThumbnailAssetId: typeof artist.metadata?.profileThumbnailAssetId === "string" ? artist.metadata.profileThumbnailAssetId : "",
  profileThumbnailStorageObjectId: typeof artist.metadata?.profileThumbnailStorageObjectId === "string" ? artist.metadata.profileThumbnailStorageObjectId : "",
  profileBannerAssetId: typeof artist.metadata?.profileBannerAssetId === "string" ? artist.metadata.profileBannerAssetId : "",
  profileBannerStorageObjectId: typeof artist.metadata?.profileBannerStorageObjectId === "string" ? artist.metadata.profileBannerStorageObjectId : "",
  characterArtUrl: typeof artist.metadata?.characterArtUrl === "string" ? artist.metadata.characterArtUrl : "",
  characterArtAssetId: typeof artist.metadata?.characterArtAssetId === "string" ? artist.metadata.characterArtAssetId : "",
  characterArtStorageObjectId: typeof artist.metadata?.characterArtStorageObjectId === "string" ? artist.metadata.characterArtStorageObjectId : "",
  previousArtistImageAssetIdsInput: typeof artist.metadata?.previousArtistImageAssetIds === "string" ? artist.metadata.previousArtistImageAssetIds : "",
  pendingArtistArtworkAssignment: Boolean(artist.metadata?.pendingArtistArtworkAssignment),
  status: artist.status,
  sortOrder: String(artist.sortOrder),
  featured: Boolean(artist.featured),
  featuredSortOrder: artist.featuredSortOrder !== undefined ? String(artist.featuredSortOrder) : "",
  genresInput: artist.genres?.join(", ") ?? "",
  styleTagsInput: artist.styleTags?.join(", ") ?? "",
  externalLinks: { ...emptyLinks, ...(artist.externalLinks ?? {}) },
  seoTitle: artist.seoMetadata?.title ?? "",
  seoDescription: artist.seoMetadata?.description ?? "",
  seoCanonicalPath: artist.seoMetadata?.canonicalPath ?? "",
  seoImageUrl: artist.seoMetadata?.imageUrl ?? "",
  seoNoIndex: Boolean(artist.seoMetadata?.noIndex),
  socialTitle: artist.socialMetadata?.title ?? "",
  socialDescription: artist.socialMetadata?.description ?? "",
  socialImageUrl: artist.socialMetadata?.imageUrl ?? "",
  socialImageAlt: artist.socialMetadata?.imageAlt ?? "",
  socialType: artist.socialMetadata?.type ?? "profile",
  twitterCard: artist.socialMetadata?.twitterCard ?? "summary_large_image",
});

const compactLinks = (links: AdminArtistFormState["externalLinks"]): ArtistExternalLinks | undefined => {
  const entries = Object.entries(links).filter(([, url]) => url.trim());
  return entries.length ? Object.fromEntries(entries) as ArtistExternalLinks : undefined;
};

const maybeSeo = (state: AdminArtistFormState): SeoMetadata | undefined => {
  if (!state.seoTitle && !state.seoDescription && !state.seoCanonicalPath && !state.seoImageUrl && !state.seoNoIndex) return undefined;
  return {
    title: state.seoTitle,
    description: state.seoDescription,
    canonicalPath: state.seoCanonicalPath || undefined,
    imageUrl: state.seoImageUrl || undefined,
    type: "artist",
    noIndex: state.seoNoIndex,
  };
};

const maybeSocial = (state: AdminArtistFormState): SocialShareMetadata | undefined => {
  if (!state.socialTitle && !state.socialDescription && !state.socialImageUrl && !state.socialImageAlt) return undefined;
  return {
    title: state.socialTitle,
    description: state.socialDescription,
    imageUrl: state.socialImageUrl,
    imageAlt: state.socialImageAlt || undefined,
    type: state.socialType,
    twitterCard: state.twitterCard,
  };
};

export const validateArtistForm = (state: AdminArtistFormState): AdminArtistFormValidation => {
  const errors: Record<string, string> = {};
  if (!state.displayName.trim()) errors.displayName = "Display name is required.";
  if (!state.name.trim()) errors.name = "Internal name is required.";
  if (state.status === "active" && !state.slug.trim()) errors.slug = "Slug is required before publishing.";
  if (state.slug.trim() && !validateArtistSlug(state.slug)) errors.slug = "Slug must be lowercase, URL-safe, and hyphen-separated.";
  if (state.status === "active" && !state.bio.trim()) errors.bio = "Bio is required before publishing.";
  if (!Number.isFinite(Number(state.sortOrder))) errors.sortOrder = "Sort order must be numeric.";
  if (state.featuredSortOrder && !Number.isFinite(Number(state.featuredSortOrder))) errors.featuredSortOrder = "Featured sort order must be numeric.";
  if (!safeUrl(state.profileImage)) errors.profileImage = "Profile image URL is not safe.";
  if (!safeUrl(state.profileThumbnailUrl)) errors.profileThumbnailUrl = "Thumbnail URL is not safe.";
  if (!safeUrl(state.profileBannerUrl)) errors.profileBannerUrl = "Banner URL is not safe.";
  if (!safeUrl(state.characterArtUrl)) errors.characterArtUrl = "Character art URL is not safe.";
  Object.entries(state.externalLinks).forEach(([platform, url]) => {
    if (!safeUrl(url)) errors[`externalLinks.${platform}`] = `${platform} URL is not safe.`;
  });
  if (!safeUrl(state.seoImageUrl)) errors.seoImageUrl = "SEO image URL is not safe.";
  if (!safeUrl(state.socialImageUrl)) errors.socialImageUrl = "Social image URL is not safe.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    missingFields: getArtistFormMissingFields(state),
  };
};

export const validateCreateArtistDto = (payload: CreateArtistDto): AdminArtistFormValidation =>
  validateArtistForm(mapArtistToFormState({ ...payload, artistId: payload.artistId ?? "new", createdAt: "", updatedAt: "" }));

export const validateUpdateArtistDto = (payload: UpdateArtistDto): AdminArtistFormValidation =>
  validateArtistForm({
    ...createEmptyArtistFormState(),
    ...payload,
    externalLinks: { ...emptyLinks, ...(payload.externalLinks ?? {}) },
    sortOrder: String(payload.sortOrder ?? 0),
    featuredSortOrder: String(payload.featuredSortOrder ?? ""),
  });

export const validateArtistPublishReadiness = (state: AdminArtistFormState): string[] =>
  ["displayName", "name", "slug", "bio"].filter((field) => !String(state[field as keyof AdminArtistFormState] ?? "").trim());

export const validateArtistExternalLinks = (state: AdminArtistFormState): string[] =>
  Object.entries(state.externalLinks).filter(([, url]) => !safeUrl(url)).map(([platform]) => platform);

export const getArtistFormMissingFields = (state: AdminArtistFormState): string[] => {
  const fields: string[] = [];
  if (!state.displayName.trim()) fields.push("Display Name");
  if (!state.name.trim()) fields.push("Name");
  if (!state.slug.trim()) fields.push("Slug");
  if (!state.bio.trim()) fields.push("Bio");
  if (!state.profileImage.trim()) fields.push("Profile Image");
  return fields;
};

export const getArtistFormPublicVisibilityState = (state: AdminArtistFormState): "public" | "not_public" | "needs_required_fields" => {
  if (state.status !== "active") return "not_public";
  return validateArtistPublishReadiness(state).length ? "needs_required_fields" : "public";
};

export const toCreateArtistDto = (state: AdminArtistFormState): CreateArtistDto => ({
  artistId: state.artistId,
  displayName: state.displayName.trim(),
  name: state.name.trim(),
  slug: state.slug.trim(),
  shortBio: state.shortBio.trim() || undefined,
  bio: state.bio.trim(),
  profileImage: state.profileImage.trim(),
  profileThumbnailUrl: state.profileThumbnailUrl.trim() || undefined,
  profileBannerUrl: state.profileBannerUrl.trim() || undefined,
  status: state.status,
  sortOrder: Number(state.sortOrder) || 0,
  featured: state.featured,
  featuredSortOrder: state.featuredSortOrder ? Number(state.featuredSortOrder) : undefined,
  genres: parseList(state.genresInput),
  styleTags: parseList(state.styleTagsInput),
  externalLinks: compactLinks(state.externalLinks),
  seoMetadata: maybeSeo(state),
  socialMetadata: maybeSocial(state),
  metadata: buildArtistMetadata(state),
});

export const toUpdateArtistDto = (state: AdminArtistFormState): UpdateArtistDto => toCreateArtistDto(state);
