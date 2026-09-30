import type { AdminMetadataRecord } from "../../models/admin";
import type { SeoMetadata, SeoMetadataType } from "../../models/seo";
import type { SocialShareMetadata, SocialShareType, TwitterCardType } from "../../models/social";
import { socialShareDefaults } from "../../utils/socialShareMetadata";

export type MetadataReadinessState = "complete" | "needs_review" | "missing_required" | "not_public" | "no_index";
export type MetadataImageState = "valid" | "missing" | "invalid_url" | "fallback_used";

export interface AdminMetadataFormState {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImageUrl: string;
  seoImageAlt: string;
  canonicalPath: string;
  seoType: SeoMetadataType;
  noIndex: boolean;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  socialImageAlt: string;
  socialType: SocialShareType;
  twitterCard: TwitterCardType;
  twitterSite: string;
  twitterCreator: string;
}

export interface AdminMetadataFormValidation {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
  missingFields: string[];
  readiness: MetadataReadinessState;
}

export interface MetadataPreviewModel {
  searchTitle: string;
  searchDescription: string;
  publicPath: string;
  socialTitle: string;
  socialDescription: string;
  imageUrl: string;
  imageAlt: string;
  imageState: MetadataImageState;
  siteName: string;
  socialType: SocialShareType;
  twitterCard: TwitterCardType;
  noIndex: boolean;
}

export const socialTypeLabels: Record<SocialShareType, string> = {
  website: "Website",
  "music.song": "Music Song",
  profile: "Profile",
  article: "Article",
  gallery: "Gallery",
  custom: "Custom",
};

export const twitterCardLabels: Record<TwitterCardType, string> = {
  summary: "Summary",
  summary_large_image: "Summary Large Image",
  player: "Player",
};

export const sanitizeMetadataFormText = (value: string | null | undefined): string =>
  (value ?? "").replace(/\s+/g, " ").trim();

export const truncateMetadataPreviewText = (value: string, maxLength: number): string => {
  const text = sanitizeMetadataFormText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}...` : text;
};

export const validateMetadataImageUrl = (value: string): boolean => {
  const url = value.trim();
  if (!url) return true;
  if (/^javascript:/i.test(url)) return false;
  return url.startsWith("/") || url.startsWith("./") || url.startsWith("../") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/");
};

export const validateCanonicalPath = (value: string): boolean => {
  const path = value.trim();
  if (!path) return true;
  if (/^javascript:/i.test(path)) return false;
  return path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://");
};

export const isMetadataRecordPublicSafe = (record: AdminMetadataRecord): boolean =>
  Boolean(record.publicPath && !record.noIndex && !["draft", "archived"].includes(record.status));

export const createMetadataFormState = (record: AdminMetadataRecord): AdminMetadataFormState => ({
  seoTitle: record.seoMetadata?.title ?? "",
  seoDescription: record.seoMetadata?.description ?? "",
  seoKeywords: record.seoMetadata?.keywords?.join(", ") ?? "",
  seoImageUrl: record.seoMetadata?.imageUrl ?? "",
  seoImageAlt: record.seoMetadata?.imageAlt ?? "",
  canonicalPath: record.seoMetadata?.canonicalPath ?? record.publicPath ?? "",
  seoType: record.seoMetadata?.type ?? (record.entityType === "artist" ? "artist" : record.entityType === "song" || record.entityType === "release" ? "song" : record.entityType === "gallery" ? "gallery" : "website"),
  noIndex: Boolean(record.noIndex || record.seoMetadata?.noIndex),
  socialTitle: record.socialMetadata?.title ?? "",
  socialDescription: record.socialMetadata?.description ?? "",
  socialImageUrl: record.socialMetadata?.imageUrl ?? "",
  socialImageAlt: record.socialMetadata?.imageAlt ?? "",
  socialType: record.socialMetadata?.type ?? (record.entityType === "artist" ? "profile" : record.entityType === "song" || record.entityType === "release" ? "music.song" : record.entityType === "gallery" ? "gallery" : "website"),
  twitterCard: record.socialMetadata?.twitterCard ?? "summary_large_image",
  twitterSite: record.socialMetadata?.twitterSite ?? "",
  twitterCreator: record.socialMetadata?.twitterCreator ?? "",
});

const parseKeywords = (value: string): string[] | undefined => {
  const keywords = [...new Set(value.split(",").map((item) => sanitizeMetadataFormText(item)).filter(Boolean))];
  return keywords.length ? keywords : undefined;
};

export const toSeoMetadataPayload = (state: AdminMetadataFormState): SeoMetadata => ({
  title: sanitizeMetadataFormText(state.seoTitle),
  description: sanitizeMetadataFormText(state.seoDescription),
  canonicalPath: sanitizeMetadataFormText(state.canonicalPath) || undefined,
  imageUrl: sanitizeMetadataFormText(state.seoImageUrl) || undefined,
  imageAlt: sanitizeMetadataFormText(state.seoImageAlt) || undefined,
  type: state.seoType,
  keywords: parseKeywords(state.seoKeywords),
  noIndex: state.noIndex,
});

export const toSocialMetadataPayload = (state: AdminMetadataFormState, record: AdminMetadataRecord): SocialShareMetadata => ({
  title: sanitizeMetadataFormText(state.socialTitle || state.seoTitle),
  description: sanitizeMetadataFormText(state.socialDescription || state.seoDescription),
  imageUrl: sanitizeMetadataFormText(state.socialImageUrl || state.seoImageUrl || socialShareDefaults.defaultImage),
  imageAlt: sanitizeMetadataFormText(state.socialImageAlt || state.seoImageAlt) || `${record.entityLabel} preview image`,
  url: sanitizeMetadataFormText(state.canonicalPath || record.publicPath) || undefined,
  type: state.socialType,
  twitterCard: state.twitterCard,
  twitterSite: sanitizeMetadataFormText(state.twitterSite) || undefined,
  twitterCreator: sanitizeMetadataFormText(state.twitterCreator) || undefined,
});

export const getMetadataFormMissingFields = (state: AdminMetadataFormState): string[] => {
  const fields: string[] = [];
  if (!state.seoTitle.trim()) fields.push("SEO title");
  if (!state.seoDescription.trim()) fields.push("SEO description");
  if (!state.socialTitle.trim()) fields.push("Social title");
  if (!state.socialDescription.trim()) fields.push("Social description");
  if (!state.socialImageUrl.trim() && !state.seoImageUrl.trim()) fields.push("Social image");
  if (!state.socialImageAlt.trim() && !state.seoImageAlt.trim()) fields.push("Image alt");
  return fields;
};

export const getMetadataReadinessState = (state: AdminMetadataFormState, record: AdminMetadataRecord): MetadataReadinessState => {
  if (!isMetadataRecordPublicSafe(record)) return "not_public";
  if (state.noIndex) return "no_index";
  const missing = getMetadataFormMissingFields(state);
  if (missing.some((field) => ["SEO title", "SEO description", "Social title", "Social description"].includes(field))) return "missing_required";
  if (missing.length) return "needs_review";
  return "complete";
};

export const validateSeoMetadataForm = (state: AdminMetadataFormState): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (state.seoImageUrl && !validateMetadataImageUrl(state.seoImageUrl)) errors.seoImageUrl = "SEO image URL is not safe.";
  if (!validateCanonicalPath(state.canonicalPath)) errors.canonicalPath = "Canonical path must be a route or http(s) URL.";
  return errors;
};

export const validateSocialMetadataForm = (state: AdminMetadataFormState): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (state.socialImageUrl && !validateMetadataImageUrl(state.socialImageUrl)) errors.socialImageUrl = "Social image URL is not safe.";
  if (!Object.keys(socialTypeLabels).includes(state.socialType)) errors.socialType = "Open Graph type is invalid.";
  if (!Object.keys(twitterCardLabels).includes(state.twitterCard)) errors.twitterCard = "Twitter card type is invalid.";
  return errors;
};

export const validateMetadataReadiness = (state: AdminMetadataFormState, record: AdminMetadataRecord): AdminMetadataFormValidation => {
  const errors = { ...validateSeoMetadataForm(state), ...validateSocialMetadataForm(state) };
  const warnings: string[] = [];
  if (!state.seoTitle.trim()) warnings.push("Missing SEO title; generated fallback will be used.");
  if (!state.seoDescription.trim()) warnings.push("Missing SEO description; generated fallback will be used.");
  if (!state.socialTitle.trim()) warnings.push("Missing social title; SEO title fallback will be used.");
  if (!state.socialDescription.trim()) warnings.push("Missing social description; SEO description fallback will be used.");
  if (!state.socialImageUrl.trim() && !state.seoImageUrl.trim()) warnings.push("Missing social image; default image fallback will be used.");
  if (!state.socialImageAlt.trim() && !state.seoImageAlt.trim()) warnings.push("Missing image alt text.");
  if (state.seoTitle.length > 60) warnings.push("SEO title is longer than the 60 character target.");
  if (state.seoDescription.length > 160) warnings.push("SEO description is longer than the 160 character target.");
  if (!isMetadataRecordPublicSafe(record)) warnings.push("Entity is not public-safe; no-index is recommended.");
  if (!record.publicPath) warnings.push("No public path is available.");
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
    missingFields: getMetadataFormMissingFields(state),
    readiness: getMetadataReadinessState(state, record),
  };
};

export const buildMetadataPreviewModel = (state: AdminMetadataFormState, record: AdminMetadataRecord): MetadataPreviewModel => {
  const imageUrl = sanitizeMetadataFormText(state.socialImageUrl || state.seoImageUrl || socialShareDefaults.defaultImage);
  const hasProvidedImage = Boolean(state.socialImageUrl.trim() || state.seoImageUrl.trim());
  return {
    searchTitle: truncateMetadataPreviewText(state.seoTitle || record.entityLabel || socialShareDefaults.defaultTitle, 70),
    searchDescription: truncateMetadataPreviewText(state.seoDescription || socialShareDefaults.defaultDescription, 180),
    publicPath: state.canonicalPath || record.publicPath || "No public path",
    socialTitle: truncateMetadataPreviewText(state.socialTitle || state.seoTitle || record.entityLabel, 80),
    socialDescription: truncateMetadataPreviewText(state.socialDescription || state.seoDescription || socialShareDefaults.defaultDescription, 140),
    imageUrl,
    imageAlt: state.socialImageAlt || state.seoImageAlt || `${record.entityLabel} preview image`,
    imageState: !imageUrl ? "missing" : !validateMetadataImageUrl(imageUrl) ? "invalid_url" : hasProvidedImage ? "valid" : "fallback_used",
    siteName: socialShareDefaults.siteName,
    socialType: state.socialType,
    twitterCard: state.twitterCard,
    noIndex: state.noIndex,
  };
};
