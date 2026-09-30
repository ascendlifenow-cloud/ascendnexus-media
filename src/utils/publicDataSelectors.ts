import type { ArtistPublicProfile } from "../models/artist";
import type { ArtistReleaseGroup, ArtistSpotlightItem, FeaturedReleaseItem } from "../models/homepage";
import type { PublicSongRelease } from "../models/release";
import { getActiveArtistsSorted } from "./artistFilters";
import {
  filterPublishedReleases,
  filterPublishedReleasesByArtistId,
  filterReleasesByArtistId,
  type ReleaseInput,
} from "./releaseFiltering";
import { getReleaseGroupsForActiveArtists } from "./releaseGrouping";
import { sortReleasesNewestFirst } from "./releaseSorting";

export const getLatestReleases = (releases: ReleaseInput, limit?: number): PublicSongRelease[] => {
  const sorted = sortReleasesNewestFirst(filterPublishedReleases(releases));
  return typeof limit === "number" ? sorted.slice(0, Math.max(0, limit)) : sorted;
};

export const getLatestReleasesByArtist = (
  releases: ReleaseInput,
  artistId: string | null | undefined,
  limit?: number,
): PublicSongRelease[] => {
  const sorted = sortReleasesNewestFirst(filterPublishedReleasesByArtistId(releases, artistId));
  return typeof limit === "number" ? sorted.slice(0, Math.max(0, limit)) : sorted;
};

export const getLatestThreeReleasesByArtist = (
  releases: ReleaseInput,
  artistId: string | null | undefined,
): PublicSongRelease[] => getLatestReleasesByArtist(releases, artistId, 3);

export const getHomepageLatestReleaseGroups = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  releases: ReleaseInput,
): ArtistReleaseGroup[] => getReleaseGroupsForActiveArtists(artists, releases, 3);

const parseReleaseDateTime = (date: string | undefined): number => {
  if (!date) return 0;
  const parsed = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseFeatureBoundaryTime = (date: string | undefined, endOfDay = false): number | undefined => {
  if (!date) return undefined;
  const parsed = new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
};

const isFeatureWindowActive = (release: PublicSongRelease, now = Date.now()): boolean => {
  const start = parseFeatureBoundaryTime(release.featuredStartDate);
  const end = parseFeatureBoundaryTime(release.featuredEndDate, true);

  if (typeof start === "number" && start > now) return false;
  if (typeof end === "number" && end < now) return false;
  return true;
};

const hasFeaturedSignal = (release: PublicSongRelease): boolean =>
  release.featured === true ||
  Boolean(
    release.featuredPlacement ||
      release.featuredLabel?.trim() ||
      release.featuredDescription?.trim() ||
      release.promoImageUrl?.trim() ||
      typeof release.featuredSortOrder === "number",
  );

const findActiveArtistForRelease = (
  release: PublicSongRelease,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): ArtistPublicProfile | undefined => getActiveArtistsSorted(artists).find((artist) => artist.artistId === release.artistId);

export const isReleaseFeatureEligible = (
  release: PublicSongRelease | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): boolean => {
  if (!release || release.status !== "published" || !release.slug?.trim()) return false;
  if (!findActiveArtistForRelease(release, artists)) return false;
  return isFeatureWindowActive(release);
};

export const sortFeaturedReleases = (releases: ReleaseInput): PublicSongRelease[] =>
  (Array.isArray(releases) ? [...releases] : []).sort((a, b) => {
    const aOrder = typeof a.featuredSortOrder === "number" ? a.featuredSortOrder : Number.POSITIVE_INFINITY;
    const bOrder = typeof b.featuredSortOrder === "number" ? b.featuredSortOrder : Number.POSITIVE_INFINITY;

    if (aOrder !== bOrder) return aOrder - bOrder;
    return parseReleaseDateTime(b.releaseDate) - parseReleaseDateTime(a.releaseDate);
  });

export const getFeaturedReleases = (
  releases: ReleaseInput,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): PublicSongRelease[] =>
  sortFeaturedReleases(
    filterPublishedReleases(releases).filter((release) => hasFeaturedSignal(release) && isReleaseFeatureEligible(release, artists)),
  );

export const getHomepageFeaturedReleases = (
  releases: ReleaseInput,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): PublicSongRelease[] =>
  getFeaturedReleases(releases, artists).filter(
    (release) => !release.featuredPlacement || release.featuredPlacement === "homepage" || release.featuredPlacement === "global",
  );

export const getPrimaryHomepageFeaturedRelease = (
  releases: ReleaseInput,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): PublicSongRelease | undefined => {
  const homepageFeatured = getHomepageFeaturedReleases(releases, artists)[0];
  if (homepageFeatured) return homepageFeatured;

  const anyFeatured = getFeaturedReleases(releases, artists)[0];
  if (anyFeatured) return anyFeatured;

  return getLatestReleases(releases).find((release) => isReleaseFeatureEligible(release, artists));
};

export const getFeaturedReleaseForArtist = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
  artists?: readonly ArtistPublicProfile[] | null,
): PublicSongRelease | undefined => {
  if (!artistId) return undefined;
  const artistReleases = filterPublishedReleasesByArtistId(releases, artistId);
  const eligibleReleases = artists
    ? artistReleases.filter((release) => isReleaseFeatureEligible(release, artists))
    : artistReleases.filter((release) => release.slug?.trim());
  const featuredRelease = sortFeaturedReleases(
    eligibleReleases.filter(
      (release) =>
        hasFeaturedSignal(release) &&
        (release.featured === true || release.featuredPlacement === "artist" || release.featuredPlacement === "global"),
    ),
  )[0];

  return featuredRelease ?? sortReleasesNewestFirst(eligibleReleases)[0];
};

export const getFeaturedReleaseItem = (
  release: PublicSongRelease | null | undefined,
  artists: readonly ArtistPublicProfile[] | null | undefined,
): FeaturedReleaseItem | undefined => {
  if (!release || !isReleaseFeatureEligible(release, artists)) return undefined;
  const artist = findActiveArtistForRelease(release, artists);
  return artist ? { artist, release } : undefined;
};

export const getPrimaryHomepageFeaturedReleaseItem = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  releases: ReleaseInput,
): FeaturedReleaseItem | undefined => getFeaturedReleaseItem(getPrimaryHomepageFeaturedRelease(releases, artists), artists);

export const getHomepageSpotlightArtists = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  limit = 6,
): ArtistPublicProfile[] =>
  getActiveArtistsSorted(artists)
    .filter((artist) => Boolean(artist.slug?.trim()))
    .slice(0, Math.max(0, limit));

export const getArtistPublishedReleases = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
): PublicSongRelease[] => getLatestReleasesByArtist(releases, artistId);

export const getArtistFeaturedRelease = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
): PublicSongRelease | undefined => getFeaturedReleaseForArtist(artistId, releases);

export const getArtistStyleTagsFromReleases = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
): string[] =>
  Array.from(
    new Set(
      filterPublishedReleasesByArtistId(releases, artistId)
        .flatMap((release) => release.styleTags)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const getArtistGenresFromReleases = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
): string[] =>
  Array.from(
    new Set(
      filterPublishedReleasesByArtistId(releases, artistId)
        .map((release) => release.genre.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

export const getArtistLatestRelease = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
): PublicSongRelease | undefined => getArtistPublishedReleases(artistId, releases)[0];

export const getArtistSpotlightStyleTags = (
  artistId: string | null | undefined,
  releases: ReleaseInput,
  limit = 3,
): string[] => getArtistStyleTagsFromReleases(artistId, releases).slice(0, Math.max(0, limit));

export const getArtistSpotlightData = (
  artist: ArtistPublicProfile,
  releases: ReleaseInput,
): ArtistSpotlightItem => {
  const latestRelease = getArtistLatestRelease(artist.artistId, releases);
  const genres = getArtistGenresFromReleases(artist.artistId, releases);
  const styleTags = getArtistSpotlightStyleTags(artist.artistId, releases, 3);

  return {
    artist,
    latestRelease,
    primaryGenre: genres[0],
    styleTags,
  };
};

export const getHomepageArtistSpotlightData = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  releases: ReleaseInput,
  limit = 6,
): ArtistSpotlightItem[] => getHomepageSpotlightArtists(artists, limit).map((artist) => getArtistSpotlightData(artist, releases));

export const getMoreReleasesFromArtist = (
  releases: ReleaseInput,
  artistId: string | null | undefined,
  excludeReleaseId: string | null | undefined,
  limit = 3,
): PublicSongRelease[] => {
  if (!artistId) return [];
  return sortReleasesNewestFirst(filterPublishedReleasesByArtistId(releases, artistId))
    .filter((release) => release.releaseId !== excludeReleaseId)
    .slice(0, Math.max(0, limit));
};

export const getPublishedReleaseBySlug = (
  releases: ReleaseInput,
  slug: string | null | undefined,
): PublicSongRelease | null => {
  const key = slug?.trim();
  if (!key) return null;
  return filterPublishedReleases(releases).find((release) => release.slug === key || release.songId === key || release.releaseId === key) ?? null;
};

export const getPublicArtistBySlug = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  slug: string | null | undefined,
): ArtistPublicProfile | undefined => {
  if (!slug) return undefined;
  return getActiveArtistsSorted(artists).find((artist) => artist.slug === slug);
};

export const getArtistById = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  artistId: string | null | undefined,
): ArtistPublicProfile | undefined => {
  if (!artistId || !Array.isArray(artists)) return undefined;
  return artists.find((artist) => artist.artistId === artistId);
};

export const getReleaseBySlug = (
  releases: ReleaseInput,
  slug: string | null | undefined,
): PublicSongRelease | undefined => {
  const key = slug?.trim();
  if (!key) return undefined;
  return filterPublishedReleases(releases).find((release) => release.slug === key || release.songId === key || release.releaseId === key);
};

export { filterPublishedReleases, filterReleasesByArtistId, getActiveArtistsSorted, sortReleasesNewestFirst };
