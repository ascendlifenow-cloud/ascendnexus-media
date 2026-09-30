import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicSongRelease } from "../../../src/models/release";
import { isPublishedState, publicSafeUrl } from "./publicUrlMapper";

export const mapReleaseRecordToPublicSongRelease = (release: PublicSongRelease, artist?: ArtistPublicProfile): (PublicSongRelease & { artist?: ArtistPublicProfile }) | null => {
  if (release.status !== "published" || !isPublishedState(release)) return null;
  if (artist && artist.status !== "active") return null;
  const coverArtUrl = publicSafeUrl(release.coverArtUrl);
  if (!coverArtUrl) return null;
  const audioPreviewUrl = publicSafeUrl(release.audioPreviewUrl);
  return {
    releaseId: release.releaseId,
    songId: release.songId,
    artistId: release.artistId,
    artist,
    title: release.title,
    slug: release.slug,
    coverArtUrl,
    audioPreviewUrl,
    releaseDate: release.releaseDate,
    genre: release.genre,
    styleTags: Array.isArray(release.styleTags) ? release.styleTags : [],
    status: "published",
    externalLinks: release.externalLinks ?? {},
    featured: release.featured,
    featuredSortOrder: release.featuredSortOrder,
    featuredLabel: release.featuredLabel,
    featuredDescription: release.featuredDescription,
    featuredPlacement: release.featuredPlacement,
    promoImageUrl: publicSafeUrl(release.promoImageUrl),
  };
};
