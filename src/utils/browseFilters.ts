import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { getActiveArtistsSorted } from "./artistFilters";
import { filterPublishedReleases } from "./releaseFiltering";
import { sortReleasesNewestFirst } from "./releaseSorting";

export interface BrowseFilters {
  genre?: string;
  tag?: string;
}

export interface FilteredBrowseSong {
  release: PublicSongRelease;
  artist?: ArtistPublicProfile;
}

export const normalizeGenreValue = (genre: string | null | undefined): string =>
  (genre ?? "").trim().toLowerCase();

export const normalizeTagValue = (tag: string | null | undefined): string =>
  (tag ?? "").trim().toLowerCase();

export const matchesGenreFilter = (release: PublicSongRelease, genre?: string | null): boolean => {
  const normalizedGenre = normalizeGenreValue(genre);
  if (!normalizedGenre) return true;
  return normalizeGenreValue(release.genre) === normalizedGenre;
};

export const matchesStyleTagFilter = (release: PublicSongRelease, tag?: string | null): boolean => {
  const normalizedTag = normalizeTagValue(tag);
  if (!normalizedTag) return true;
  return (release.styleTags ?? []).some((styleTag) => normalizeTagValue(styleTag) === normalizedTag);
};

const getActiveArtistMap = (artists: readonly ArtistPublicProfile[] | null | undefined) =>
  new Map(getActiveArtistsSorted(artists).map((artist) => [artist.artistId, artist]));

const getPublicBrowsableReleases = (
  releases: readonly PublicSongRelease[] | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): FilteredBrowseSong[] => {
  const activeArtistById = getActiveArtistMap(artists);
  return sortReleasesNewestFirst(filterPublishedReleases(releases))
    .map((release) => ({ release, artist: activeArtistById.get(release.artistId) }))
    .filter((item) => Boolean(item.artist));
};

export const getAvailableGenres = (
  releases: readonly PublicSongRelease[] | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined = [],
): string[] =>
  Array.from(
    new Set(
      getPublicBrowsableReleases(releases, artists)
        .map(({ release }) => release.genre?.trim())
        .filter((genre): genre is string => Boolean(genre)),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const getAvailableStyleTags = (
  releases: readonly PublicSongRelease[] | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined = [],
): string[] =>
  Array.from(
    new Set(
      getPublicBrowsableReleases(releases, artists)
        .flatMap(({ release }) => release.styleTags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const getGenreCounts = (
  releases: readonly PublicSongRelease[] | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined = [],
): Record<string, number> =>
  getPublicBrowsableReleases(releases, artists).reduce<Record<string, number>>((counts, { release }) => {
    const genre = release.genre?.trim();
    if (genre) counts[genre] = (counts[genre] ?? 0) + 1;
    return counts;
  }, {});

export const getStyleTagCounts = (
  releases: readonly PublicSongRelease[] | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined = [],
): Record<string, number> =>
  getPublicBrowsableReleases(releases, artists).reduce<Record<string, number>>((counts, { release }) => {
    (release.styleTags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
    return counts;
  }, {});

export const filterSongsByGenreAndTag = (
  releases: readonly PublicSongRelease[] | null | undefined,
  filters: BrowseFilters,
  artists: readonly ArtistPublicProfile[] | null | undefined = [],
): FilteredBrowseSong[] =>
  getPublicBrowsableReleases(releases, artists).filter(({ release }) =>
    matchesGenreFilter(release, filters.genre) && matchesStyleTagFilter(release, filters.tag),
  );
