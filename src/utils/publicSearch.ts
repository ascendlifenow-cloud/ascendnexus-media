import type { ArtistPublicProfile } from "../models/artist";
import type { PublicGalleryItem } from "../models/gallery";
import type { PublicSongRelease } from "../models/release";
import { getActiveArtistsSorted } from "./artistFilters";
import { filterPublishedReleases } from "./releaseFiltering";
import { sortReleasesNewestFirst } from "./releaseSorting";

export interface SearchableSongResult {
  release: PublicSongRelease;
  artist?: ArtistPublicProfile;
}

export interface PublicCatalogSearchResults {
  artists: ArtistPublicProfile[];
  songs: SearchableSongResult[];
  gallery?: PublicGalleryItem[];
  groups?: Record<string, unknown>;
  availableFilters?: Record<string, unknown>;
  totalArtists: number;
  totalSongs: number;
  totalGallery?: number;
  totalResults: number;
}

export const normalizeSearchQuery = (query: string | null | undefined): string =>
  (query ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export const matchesSearchText = (query: string | null | undefined, ...values: Array<string | readonly string[] | null | undefined>): boolean => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return true;

  const searchableText = values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
};

export const searchArtists = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  query: string | null | undefined,
): ArtistPublicProfile[] => {
  const activeArtists = getActiveArtistsSorted(artists);
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return activeArtists;

  return activeArtists.filter((artist) =>
    matchesSearchText(normalizedQuery, artist.displayName, artist.name, artist.bio, artist.musicStyle),
  );
};

export const searchSongs = (
  releases: readonly PublicSongRelease[] | null | undefined,
  query: string | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined = [],
): SearchableSongResult[] => {
  const normalizedQuery = normalizeSearchQuery(query);
  const artistById = new Map((artists ?? []).map((artist) => [artist.artistId, artist]));
  const publishedReleases = sortReleasesNewestFirst(filterPublishedReleases(releases));

  return publishedReleases
    .map((release) => ({ release, artist: artistById.get(release.artistId) }))
    .filter(({ release, artist }) => {
      if (!normalizedQuery) return true;
      return matchesSearchText(
        normalizedQuery,
        release.title,
        release.genre,
        release.styleTags,
        artist?.displayName,
        artist?.name,
      );
    });
};

export const searchPublicCatalog = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  releases: readonly PublicSongRelease[] | null | undefined,
  query: string | null | undefined,
): PublicCatalogSearchResults => {
  const artistResults = searchArtists(artists, query);
  const songResults = searchSongs(releases, query, artists);

  return {
    artists: artistResults,
    songs: songResults,
    totalArtists: artistResults.length,
    totalSongs: songResults.length,
    totalResults: artistResults.length + songResults.length,
  };
};

export const highlightSearchMatch = (value: string, query: string | null | undefined): string => {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return value;
  return value;
};
