import type { ArtistPublicProfile, ArtistStatus } from "../models/artist";
import type { PublicSongRelease, ReleaseStatus } from "../models/release";

const artistStatuses: ArtistStatus[] = ["active", "archived"];
const releaseStatuses: ReleaseStatus[] = ["draft", "published", "archived"];

export const slugifyPublicValue = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const ensureUniqueSlugs = (slugs: string[]) => new Set(slugs).size === slugs.length;

export const getArtistByIdFromSeed = (artists: ArtistPublicProfile[], artistId: string) =>
  artists.find((artist) => artist.artistId === artistId);

export const getReleaseByIdFromSeed = (releases: PublicSongRelease[], releaseId: string) =>
  releases.find((release) => release.releaseId === releaseId);

export const validateArtistSeed = (artists: ArtistPublicProfile[]) => {
  const slugs = artists.map((artist) => artist.slug);
  return (
    ensureUniqueSlugs(slugs) &&
    artists.every(
      (artist) =>
        Boolean(artist.artistId) &&
        Boolean(artist.name) &&
        Boolean(artist.slug) &&
        artist.slug === slugifyPublicValue(artist.slug) &&
        artistStatuses.includes(artist.status) &&
        Number.isFinite(artist.sortOrder),
    )
  );
};

export const validateReleaseSeed = (releases: PublicSongRelease[], artists: ArtistPublicProfile[]) => {
  const slugs = releases.map((release) => release.slug);
  return (
    ensureUniqueSlugs(slugs) &&
    releases.every(
      (release) =>
        Boolean(release.releaseId) &&
        Boolean(release.songId) &&
        Boolean(release.artistId) &&
        Boolean(release.slug) &&
        release.slug === slugifyPublicValue(release.slug) &&
        releaseStatuses.includes(release.status) &&
        Boolean(getArtistByIdFromSeed(artists, release.artistId)) &&
        Array.isArray(release.styleTags) &&
        !Number.isNaN(new Date(`${release.releaseDate}T00:00:00`).getTime()),
    )
  );
};
