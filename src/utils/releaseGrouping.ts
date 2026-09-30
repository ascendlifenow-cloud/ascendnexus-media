import type { ArtistPublicProfile } from "../models/artist";
import type { ArtistReleaseGroup } from "../models/homepage";
import type { PublicSongRelease } from "../models/release";
import { getActiveArtistsSorted } from "./artistFilters";
import { filterPublishedReleasesByArtistId, isValidRelease, toReleaseArray, type ReleaseInput } from "./releaseFiltering";
import { sortReleasesNewestFirst } from "./releaseSorting";

interface ReleaseGroupOptions {
  includeEmpty?: boolean;
}

export const groupReleasesByArtistId = (releases: ReleaseInput): Record<string, PublicSongRelease[]> =>
  toReleaseArray(releases).reduce<Record<string, PublicSongRelease[]>>((groups, release) => {
    if (!isValidRelease(release)) return groups;
    const current = groups[release.artistId] ?? [];
    groups[release.artistId] = [...current, release];
    return groups;
  }, {});

export const getReleaseGroupsForActiveArtists = (
  artists: readonly ArtistPublicProfile[] | null | undefined,
  releases: ReleaseInput,
  limitPerArtist = 3,
  options: ReleaseGroupOptions = {},
): ArtistReleaseGroup[] =>
  getActiveArtistsSorted(artists).reduce<ArtistReleaseGroup[]>((groups, artist) => {
    const artistReleases = sortReleasesNewestFirst(filterPublishedReleasesByArtistId(releases, artist.artistId)).slice(
      0,
      Math.max(0, limitPerArtist),
    );

    if (artistReleases.length > 0 || options.includeEmpty) {
      groups.push({ artist, releases: artistReleases });
    }

    return groups;
  }, []);
