import type { PublicSongRelease } from "../models/release";
import { isValidAudioPreviewUrl } from "./audioPreview";
import { getExternalLinkLabel as getNormalizedExternalLinkLabel } from "./externalLinksUtils";
import {
  filterPublishedReleases,
  getArtistFeaturedRelease,
  getArtistGenresFromReleases,
  getArtistStyleTagsFromReleases,
  getMoreReleasesFromArtist,
  sortReleasesNewestFirst,
} from "./publicDataSelectors";

export { filterPublishedReleases, getMoreReleasesFromArtist, sortReleasesNewestFirst };

export const getLatestArtistRelease = (releases: PublicSongRelease[]) =>
  getArtistFeaturedRelease(releases[0]?.artistId, releases);

export const getArtistGenres = (releases: PublicSongRelease[]) =>
  getArtistGenresFromReleases(releases[0]?.artistId, releases);

export const getArtistStyleTags = (releases: PublicSongRelease[]) =>
  getArtistStyleTagsFromReleases(releases[0]?.artistId, releases);

export const isPlayablePreviewAvailable = isValidAudioPreviewUrl;

export const getExternalLinkLabel = getNormalizedExternalLinkLabel;
