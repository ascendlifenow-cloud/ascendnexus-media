import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicSongRelease } from "../../../src/models/release";
import { publicSafeUrl, isPublishedState } from "./publicUrlMapper";

export const mapArtistRecordToPublicProfile = (artist: ArtistPublicProfile, releases: PublicSongRelease[] = []): ArtistPublicProfile & { latestRelease?: PublicSongRelease; releaseCount?: number } | null => {
  if (artist.status !== "active" || !isPublishedState(artist)) return null;
  const profileImage = publicSafeUrl(artist.profileImage);
  const artistReleases = releases.filter((release) => release.artistId === artist.artistId && release.status === "published");
  return {
    artistId: artist.artistId,
    name: artist.name,
    slug: artist.slug,
    displayName: artist.displayName,
    bio: artist.bio,
    profileImage: profileImage ?? "",
    status: "active",
    sortOrder: artist.sortOrder,
    musicStyle: artist.musicStyle,
    featured: artist.featured,
    externalLinks: artist.externalLinks,
    latestRelease: artistReleases[0],
    releaseCount: artistReleases.length,
  };
};
