import type {
  AdminMetadataEntityType,
  AdminMetadataRecord,
  AdminMetadataStatus,
  ArtistAdminRecord,
  PublicSiteConfig,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { SeoMetadata, SiteSeoDefaults } from "../../models/seo";
import type { SocialShareMetadata } from "../../models/social";
import { buildSocialShareMetadata } from "../../utils/socialShareMetadata";
import { buildDefaultSeoMetadata, routeSeoMetadata } from "../../utils/seoMetadata";
import { siteSeoDefaults } from "../../utils/siteSeoDefaults";

export type AdminMetadataEntityTypeFilter = "all" | AdminMetadataEntityType;
export type AdminMetadataStatusFilter = "all" | AdminMetadataStatus | "missing_title" | "missing_description" | "missing_image";
export type AdminMetadataSortMode = "needsReview" | "entityType" | "title" | "missingFields" | "updatedAt" | "noIndex";

export interface AdminMetadataWarning {
  metadataRecordId: string;
  entityLabel: string;
  message: string;
  severity: "warning" | "info";
}

const entityTypeLabels: Record<AdminMetadataEntityType, string> = {
  site_default: "Site Default",
  page: "Page",
  artist: "Artist",
  release: "Release",
  song: "Song",
  gallery: "Gallery",
  search: "Search",
  browse: "Browse",
  custom: "Custom",
};

const getRouteRecords = (): Array<{ key: string; label: string; entityType: AdminMetadataEntityType; path?: string; metadata: SeoMetadata }> => [
  { key: "home", label: "Homepage", entityType: "page", path: "/", metadata: routeSeoMetadata.home },
  { key: "artists", label: "Artist Directory", entityType: "page", path: "/artists", metadata: routeSeoMetadata.artists },
  { key: "releases", label: "Song Catalog", entityType: "page", path: "/songs", metadata: routeSeoMetadata.releases },
  { key: "search", label: "Search", entityType: "search", path: "/search", metadata: routeSeoMetadata.search },
  { key: "browse", label: "Browse", entityType: "browse", path: "/browse", metadata: routeSeoMetadata.browse },
  { key: "gallery", label: "Gallery", entityType: "gallery", path: "/gallery", metadata: routeSeoMetadata.gallery },
  { key: "contact", label: "Contact", entityType: "page", path: "/contact", metadata: routeSeoMetadata.contact },
  { key: "not-found", label: "404 Page", entityType: "page", metadata: routeSeoMetadata.notFound },
];

const getString = (value?: string): string => value?.trim() ?? "";

const siteDefaultsToSeoMetadata = (defaults: SiteSeoDefaults | SeoMetadata | undefined): SeoMetadata => {
  if (defaults && "title" in defaults) return defaults;
  const resolved = defaults && "defaultTitle" in defaults ? defaults : siteSeoDefaults;
  return buildDefaultSeoMetadata({
    title: resolved.defaultTitle,
    description: resolved.defaultDescription,
    imageUrl: resolved.defaultImage,
    imageAlt: `${resolved.siteName} default social image`,
    canonicalPath: resolved.basePath || "/",
    type: "website",
  });
};

export const formatMetadataEntityType = (entityType: AdminMetadataEntityType): string =>
  entityTypeLabels[entityType] ?? "Custom";

export const getMetadataPublicPath = (record: Pick<AdminMetadataRecord, "entityType" | "entitySlug" | "publicPath">): string | undefined => {
  if (record.publicPath) return record.publicPath;
  if (record.entityType === "artist" && record.entitySlug) return `/artists/${record.entitySlug}`;
  if ((record.entityType === "release" || record.entityType === "song") && record.entitySlug) return `/songs/${record.entitySlug}`;
  return undefined;
};

export const getMetadataMissingFields = (
  seoMetadata?: SeoMetadata,
  socialMetadata?: SocialShareMetadata,
): string[] => {
  const fields: string[] = [];
  if (!getString(seoMetadata?.title)) fields.push("SEO title");
  if (!getString(seoMetadata?.description)) fields.push("SEO description");
  if (!getString(socialMetadata?.title)) fields.push("Social title");
  if (!getString(socialMetadata?.description)) fields.push("Social description");
  if (!getString(socialMetadata?.imageUrl || seoMetadata?.imageUrl)) fields.push("Social image");
  if (!getString(socialMetadata?.imageAlt || seoMetadata?.imageAlt)) fields.push("Image alt text");
  if (!getString(seoMetadata?.canonicalPath) && !getString(socialMetadata?.url)) fields.push("Canonical path");
  return fields;
};

export const getMetadataStatus = (
  missingFields: readonly string[],
  noIndex: boolean,
  entityState?: "draft" | "archived" | "published" | "active",
): AdminMetadataStatus => {
  if (entityState === "draft") return "draft";
  if (entityState === "archived") return "archived";
  if (noIndex) return "no_index";
  if (missingFields.some((field) => ["SEO title", "SEO description", "Social title", "Social description"].includes(field))) {
    return "missing_required";
  }
  if (missingFields.length) return "needs_review";
  return "complete";
};

export const validateAdminMetadataRecord = (record: AdminMetadataRecord): AdminMetadataRecord => {
  const missingFields = getMetadataMissingFields(record.seoMetadata, record.socialMetadata);
  const noIndex = Boolean(record.noIndex || record.seoMetadata?.noIndex);
  return {
    ...record,
    missingFields,
    noIndex,
    status: getMetadataStatus(missingFields, noIndex, record.metadata?.entityState as "draft" | "archived" | "published" | "active" | undefined),
  };
};

export const buildPageMetadataRecords = (): AdminMetadataRecord[] =>
  getRouteRecords().map((route) =>
    validateAdminMetadataRecord({
      metadataRecordId: `metadata-page-${route.key}`,
      entityType: route.entityType,
      entityId: route.key,
      entitySlug: route.key,
      entityLabel: route.label,
      publicPath: route.path,
      seoMetadata: route.metadata,
      socialMetadata: buildSocialShareMetadata(route.metadata),
      status: "complete",
      missingFields: [],
      noIndex: Boolean(route.metadata.noIndex),
      metadata: { routeKey: route.key },
    }),
  );

export const buildArtistMetadataRecords = (artists: readonly ArtistAdminRecord[]): AdminMetadataRecord[] =>
  artists.map((artist) =>
    validateAdminMetadataRecord({
      metadataRecordId: `metadata-artist-${artist.artistId}`,
      entityType: "artist",
      entityId: artist.artistId,
      entitySlug: artist.slug,
      entityLabel: artist.displayName || artist.name || "Untitled Artist",
      publicPath: artist.status === "active" && artist.slug ? `/artists/${artist.slug}` : undefined,
      seoMetadata: artist.seoMetadata,
      socialMetadata: artist.socialMetadata,
      status: "needs_review",
      missingFields: [],
      noIndex: artist.status !== "active",
      updatedAt: artist.updatedAt,
      metadata: { entityState: artist.status === "active" ? "active" : artist.status },
    }),
  );

export const buildReleaseMetadataRecords = (releases: readonly SongReleaseAdminRecord[]): AdminMetadataRecord[] =>
  releases.map((release) =>
    validateAdminMetadataRecord({
      metadataRecordId: `metadata-release-${release.releaseId}`,
      entityType: "song",
      entityId: release.releaseId,
      entitySlug: release.slug,
      entityLabel: release.title || "Untitled Release",
      publicPath: release.status === "published" && release.slug ? `/songs/${release.slug}` : undefined,
      seoMetadata: release.seoMetadata,
      socialMetadata: release.socialMetadata,
      status: "needs_review",
      missingFields: [],
      noIndex: release.status !== "published",
      updatedAt: release.updatedAt,
      metadata: { entityState: release.status, songId: release.songId, artistId: release.artistId },
    }),
  );

export const buildAdminMetadataRecords = (
  siteConfig: PublicSiteConfig | undefined,
  artists: readonly ArtistAdminRecord[],
  releases: readonly SongReleaseAdminRecord[],
): AdminMetadataRecord[] => [
  validateAdminMetadataRecord({
    metadataRecordId: "metadata-site-default",
    entityType: "site_default",
    entityId: "site-default",
    entityLabel: "Site Defaults",
    publicPath: "/",
    seoMetadata: siteDefaultsToSeoMetadata(siteConfig?.seoDefaults),
    socialMetadata: buildSocialShareMetadata(siteDefaultsToSeoMetadata(siteConfig?.seoDefaults)),
    status: "complete",
    missingFields: [],
    noIndex: false,
    updatedAt: siteConfig?.updatedAt,
  }),
  ...buildPageMetadataRecords(),
  ...buildArtistMetadataRecords(artists),
  ...buildReleaseMetadataRecords(releases),
];

export const searchAdminMetadataRecords = (
  records: readonly AdminMetadataRecord[],
  query: string,
): AdminMetadataRecord[] => {
  const value = query.trim().toLowerCase();
  if (!value) return [...records];
  return records.filter((record) =>
    [
      record.entityLabel,
      record.entitySlug,
      record.publicPath,
      record.seoMetadata?.title,
      record.seoMetadata?.description,
      record.seoMetadata?.canonicalPath,
      record.seoMetadata?.imageAlt,
      record.socialMetadata?.title,
      record.socialMetadata?.description,
      record.socialMetadata?.imageAlt,
      formatMetadataEntityType(record.entityType),
    ]
      .filter(Boolean)
      .some((field) => field?.toLowerCase().includes(value)),
  );
};

export const filterAdminMetadataRecords = (
  records: readonly AdminMetadataRecord[],
  entityTypeFilter: AdminMetadataEntityTypeFilter,
  statusFilter: AdminMetadataStatusFilter,
): AdminMetadataRecord[] =>
  records.filter((record) => {
    const typeMatches = entityTypeFilter === "all" || record.entityType === entityTypeFilter;
    const statusMatches =
      statusFilter === "all" ||
      record.status === statusFilter ||
      (statusFilter === "missing_title" && record.missingFields.some((field) => field.includes("title"))) ||
      (statusFilter === "missing_description" && record.missingFields.some((field) => field.includes("description"))) ||
      (statusFilter === "missing_image" && record.missingFields.some((field) => field.includes("image")));
    return typeMatches && statusMatches;
  });

export const sortAdminMetadataRecords = (
  records: readonly AdminMetadataRecord[],
  sortMode: AdminMetadataSortMode,
): AdminMetadataRecord[] => {
  const reviewWeight = (record: AdminMetadataRecord) =>
    record.status === "missing_required" ? 0 : record.status === "needs_review" ? 1 : record.status === "no_index" ? 2 : 3;

  return [...records].sort((a, b) => {
    if (sortMode === "entityType") return a.entityType.localeCompare(b.entityType) || a.entityLabel.localeCompare(b.entityLabel);
    if (sortMode === "title") return a.entityLabel.localeCompare(b.entityLabel);
    if (sortMode === "missingFields") return b.missingFields.length - a.missingFields.length || a.entityLabel.localeCompare(b.entityLabel);
    if (sortMode === "updatedAt") return (new Date(b.updatedAt ?? 0).getTime() || 0) - (new Date(a.updatedAt ?? 0).getTime() || 0);
    if (sortMode === "noIndex") return Number(b.noIndex) - Number(a.noIndex) || a.entityLabel.localeCompare(b.entityLabel);
    return reviewWeight(a) - reviewWeight(b) || a.entityType.localeCompare(b.entityType) || a.entityLabel.localeCompare(b.entityLabel);
  });
};

export const getAdminMetadataStats = (records: readonly AdminMetadataRecord[]) => ({
  total: records.length,
  complete: records.filter((record) => record.status === "complete").length,
  missingSeoTitles: records.filter((record) => record.missingFields.includes("SEO title")).length,
  missingDescriptions: records.filter((record) =>
    record.missingFields.some((field) => field.includes("description")),
  ).length,
  missingSocialImages: records.filter((record) => record.missingFields.includes("Social image")).length,
  noIndex: records.filter((record) => record.noIndex || record.status === "no_index").length,
  artistMetadata: records.filter((record) => record.entityType === "artist").length,
  releaseMetadata: records.filter((record) => record.entityType === "song" || record.entityType === "release").length,
});

export const getMetadataWarnings = (records: readonly AdminMetadataRecord[]): AdminMetadataWarning[] =>
  records.flatMap((record) => {
    const warnings: AdminMetadataWarning[] = record.missingFields.map((field) => ({
      metadataRecordId: record.metadataRecordId,
      entityLabel: record.entityLabel,
      message: `Missing ${field}`,
      severity: "warning",
    }));
    if ((record.seoMetadata?.title?.length ?? 0) > 70) warnings.push({ metadataRecordId: record.metadataRecordId, entityLabel: record.entityLabel, message: "SEO title may be too long", severity: "info" });
    if ((record.seoMetadata?.description?.length ?? 0) > 160) warnings.push({ metadataRecordId: record.metadataRecordId, entityLabel: record.entityLabel, message: "SEO description may be too long", severity: "info" });
    if (!record.publicPath && !record.noIndex) warnings.push({ metadataRecordId: record.metadataRecordId, entityLabel: record.entityLabel, message: "Missing public path readiness", severity: "warning" });
    if (record.status === "draft" || record.status === "archived") warnings.push({ metadataRecordId: record.metadataRecordId, entityLabel: record.entityLabel, message: "Draft or archived entity is marked Not Public", severity: "info" });
    return warnings;
  });
