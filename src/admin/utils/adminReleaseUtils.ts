import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../models/admin";
import type { ReleaseStatus } from "../../models/release";
import { getReleaseAdminStats } from "./adminStats";
import { getFormattedAdminDate } from "./adminArtistUtils";

export type AdminReleaseStatusFilter = "all" | ReleaseStatus;
export type AdminReleaseFeaturedFilter = "all" | "featured" | "not_featured";
export type AdminReleaseSortMode =
  | "releaseDateNewest"
  | "releaseDateOldest"
  | "title"
  | "artist"
  | "updatedAt"
  | "status"
  | "featuredSortOrder";

export interface AdminReleaseFiltersState {
  statusFilter: AdminReleaseStatusFilter;
  artistFilter: string;
  featuredFilter: AdminReleaseFeaturedFilter;
  genreFilter: string;
}

export interface AdminReleaseMissingDataFlags {
  missingCoverArt: boolean;
  missingAudioPreview: boolean;
  missingExternalLinks: boolean;
  missingSlug: boolean;
  missingTitle: boolean;
  missingArtist: boolean;
  missingReleaseDate: boolean;
  missingSeoMetadata: boolean;
  missingSocialMetadata: boolean;
}

export interface AdminReleaseJoinedRecord {
  release: SongReleaseAdminRecord;
  artist: ArtistAdminRecord | null;
}

export type ReleasePublicVisibilityState = "public" | "not_public" | "artist_not_public";

const getDateValue = (value?: string): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

const getFieldValue = (value?: string): string => value?.trim().toLowerCase() ?? "";

const hasExternalLinks = (release: SongReleaseAdminRecord): boolean =>
  Object.values(release.externalLinks ?? {}).some((value) => typeof value === "string" && value.trim().length > 0);

const hasMetadataString = (release: SongReleaseAdminRecord, key: string): boolean => {
  const value = release.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0;
};

export const hasReleaseAudioAsset = (release: SongReleaseAdminRecord): boolean =>
  Boolean(
    release.audioPreviewUrl?.trim() ||
    hasMetadataString(release, "audioPreviewAssetId") ||
    hasMetadataString(release, "audioPreviewStorageObjectId") ||
    hasMetadataString(release, "fullSongAssetId") ||
    hasMetadataString(release, "fullSongStorageObjectId") ||
    hasMetadataString(release, "fullSongUrl"),
  );

export const joinAdminReleaseWithArtist = (
  release: SongReleaseAdminRecord,
  artists: readonly ArtistAdminRecord[],
): AdminReleaseJoinedRecord => ({
  release,
  artist: artists.find((artist) => artist.artistId === release.artistId) ?? null,
});

export const joinAdminReleasesWithArtists = (
  releases: readonly SongReleaseAdminRecord[],
  artists: readonly ArtistAdminRecord[],
): AdminReleaseJoinedRecord[] => releases.map((release) => joinAdminReleaseWithArtist(release, artists));

export const searchAdminReleases = (
  releases: readonly SongReleaseAdminRecord[],
  artists: readonly ArtistAdminRecord[],
  query: string,
): SongReleaseAdminRecord[] => {
  const value = query.trim().toLowerCase();
  if (!value) return [...releases];

  return releases.filter((release) => {
    const artist = artists.find((item) => item.artistId === release.artistId);
    return [
      release.title,
      release.slug,
      release.genre,
      release.featuredLabel,
      release.description,
      artist?.displayName,
      artist?.name,
      ...(release.styleTags ?? []),
    ]
      .filter(Boolean)
      .some((field) => getFieldValue(field).includes(value));
  });
};

export const filterAdminReleases = (
  releases: readonly SongReleaseAdminRecord[],
  filters: AdminReleaseFiltersState,
): SongReleaseAdminRecord[] =>
  releases.filter((release) => {
    const statusMatches = filters.statusFilter === "all" || release.status === filters.statusFilter;
    const artistMatches = filters.artistFilter === "all" || release.artistId === filters.artistFilter;
    const featuredMatches =
      filters.featuredFilter === "all" ||
      (filters.featuredFilter === "featured" ? Boolean(release.featured) : !release.featured);
    const genreMatches = filters.genreFilter === "all" || release.genre === filters.genreFilter;
    return statusMatches && artistMatches && featuredMatches && genreMatches;
  });

export const sortAdminReleases = (
  releases: readonly SongReleaseAdminRecord[],
  artists: readonly ArtistAdminRecord[],
  sortMode: AdminReleaseSortMode,
): SongReleaseAdminRecord[] =>
  [...releases].sort((a, b) => {
    const artistA = artists.find((artist) => artist.artistId === a.artistId)?.displayName ?? "";
    const artistB = artists.find((artist) => artist.artistId === b.artistId)?.displayName ?? "";

    if (sortMode === "releaseDateOldest") return getDateValue(a.releaseDate) - getDateValue(b.releaseDate);
    if (sortMode === "title") return a.title.localeCompare(b.title);
    if (sortMode === "artist") return artistA.localeCompare(artistB) || a.title.localeCompare(b.title);
    if (sortMode === "updatedAt") return getDateValue(b.updatedAt) - getDateValue(a.updatedAt);
    if (sortMode === "status") return a.status.localeCompare(b.status) || a.title.localeCompare(b.title);
    if (sortMode === "featuredSortOrder") {
      const orderA = a.featuredSortOrder ?? Number.POSITIVE_INFINITY;
      const orderB = b.featuredSortOrder ?? Number.POSITIVE_INFINITY;
      return orderA - orderB || a.title.localeCompare(b.title);
    }
    return getDateValue(b.releaseDate) - getDateValue(a.releaseDate) || a.title.localeCompare(b.title);
  });

export const getAvailableAdminReleaseGenres = (releases: readonly SongReleaseAdminRecord[]): string[] =>
  [...new Set(releases.map((release) => release.genre).filter((genre) => genre.trim().length > 0))].sort((a, b) =>
    a.localeCompare(b),
  );

export const getAdminReleaseStats = (releases: readonly SongReleaseAdminRecord[]) => {
  const baseStats = getReleaseAdminStats(releases);

  return {
    ...baseStats,
    missingCoverArt: releases.filter((release) => getReleaseMissingDataFlags(release).missingCoverArt).length,
    missingAudioPreview: releases.filter((release) => getReleaseMissingDataFlags(release).missingAudioPreview).length,
    missingExternalLinks: releases.filter((release) => getReleaseMissingDataFlags(release).missingExternalLinks).length,
  };
};

export const getReleasePublicVisibilityState = (
  release: SongReleaseAdminRecord,
  artist: ArtistAdminRecord | null,
): ReleasePublicVisibilityState => {
  if (release.status !== "published" || !release.slug.trim()) return "not_public";
  if (!artist || artist.status !== "active") return "artist_not_public";
  return "public";
};

export const getReleaseMissingDataFlags = (
  release: SongReleaseAdminRecord,
  artist?: ArtistAdminRecord | null,
): AdminReleaseMissingDataFlags => ({
  missingCoverArt: !release.coverArtUrl?.trim(),
  missingAudioPreview: !hasReleaseAudioAsset(release),
  missingExternalLinks: !hasExternalLinks(release),
  missingSlug: !release.slug?.trim(),
  missingTitle: !release.title?.trim(),
  missingArtist: !release.artistId?.trim() || artist === null,
  missingReleaseDate: getDateValue(release.releaseDate) === Number.NEGATIVE_INFINITY,
  missingSeoMetadata: !release.seoMetadata,
  missingSocialMetadata: !release.socialMetadata,
});

export const getReleaseMissingDataLabels = (
  release: SongReleaseAdminRecord,
  artist?: ArtistAdminRecord | null,
): string[] => {
  const flags = getReleaseMissingDataFlags(release, artist);
  const labels: string[] = [];
  if (flags.missingCoverArt) labels.push("Cover");
  if (flags.missingAudioPreview) labels.push("Audio");
  if (flags.missingExternalLinks) labels.push("Links");
  if (flags.missingSlug) labels.push("Slug");
  if (flags.missingTitle) labels.push("Title");
  if (flags.missingArtist) labels.push("Artist");
  if (flags.missingReleaseDate) labels.push("Date");
  if (flags.missingSeoMetadata) labels.push("SEO");
  if (flags.missingSocialMetadata) labels.push("Social");
  return labels;
};

export const getFormattedReleaseDate = getFormattedAdminDate;
