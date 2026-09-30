import type { PublicSongRelease } from "../models/release";

export type ReleaseInput = readonly PublicSongRelease[] | null | undefined;

export const toReleaseArray = (releases: ReleaseInput): PublicSongRelease[] =>
  Array.isArray(releases) ? [...releases] : [];

export const isValidRelease = (release: PublicSongRelease | null | undefined): release is PublicSongRelease =>
  Boolean(release?.releaseId && release.songId && release.artistId && release.slug);

export const filterPublishedReleases = (releases: ReleaseInput): PublicSongRelease[] =>
  toReleaseArray(releases).filter((release) => isValidRelease(release) && release.status === "published");

export const filterReleasesByArtistId = (releases: ReleaseInput, artistId: string | null | undefined): PublicSongRelease[] => {
  if (!artistId) return [];
  return toReleaseArray(releases).filter((release) => isValidRelease(release) && release.artistId === artistId);
};

export const filterPublishedReleasesByArtistId = (
  releases: ReleaseInput,
  artistId: string | null | undefined,
): PublicSongRelease[] => filterPublishedReleases(filterReleasesByArtistId(releases, artistId));
