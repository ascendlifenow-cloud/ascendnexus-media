import type { ArtistPublicProfile } from "../models/artist";
import type { GalleryMediaType, PublicGalleryItem } from "../models/gallery";
import type { PublicSongRelease } from "../models/release";
import { getActiveArtistsSorted } from "./artistFilters";
import { filterPublishedReleases, type ReleaseInput } from "./releaseFiltering";
import { sortReleasesNewestFirst } from "./releaseSorting";

type ArtistInput = readonly ArtistPublicProfile[] | null | undefined;
type GalleryInput = readonly PublicGalleryItem[] | null | undefined;

const toGalleryArray = (items: GalleryInput): PublicGalleryItem[] => (Array.isArray(items) ? [...items] : []);

const parseDateTime = (date: string | undefined): number => {
  if (!date) return 0;
  const parsed = new Date(`${date}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getGalleryItemAltText = (
  item: PublicGalleryItem,
  artist?: ArtistPublicProfile,
  release?: PublicSongRelease,
): string => {
  if (item.altText?.trim()) return item.altText;
  if (item.mediaType === "cover_art" && release) {
    return `${release.title} cover art${artist ? ` by ${artist.displayName}` : ""}`;
  }
  if (item.mediaType === "artist_profile" && artist) {
    return `${artist.displayName} artist profile image`;
  }
  return `${item.title} gallery visual`;
};

export const buildGalleryItemsFromArtists = (artists: ArtistInput): PublicGalleryItem[] =>
  getActiveArtistsSorted(artists)
    .filter((artist) => Boolean(artist.artistId && artist.slug && artist.displayName))
    .map((artist) => ({
      galleryItemId: `gallery-artist-${artist.artistId}`,
      sourceType: "artist",
      sourceId: artist.artistId,
      title: artist.displayName,
      slug: `${artist.slug}-artist-profile`,
      description: artist.bio,
      imageUrl: artist.profileImage,
      thumbnailUrl: artist.profileImage,
      altText: `${artist.displayName} artist profile image`,
      artistId: artist.artistId,
      mediaType: "artist_profile",
      status: "published",
      sortOrder: artist.sortOrder,
      createdAt: "2026-01-01",
      metadata: {
        artistSlug: artist.slug,
        musicStyle: artist.musicStyle,
      },
    }));

export const buildGalleryItemsFromReleases = (releases: ReleaseInput, artists?: ArtistInput): PublicGalleryItem[] => {
  const activeArtists = getActiveArtistsSorted(artists);
  const activeArtistIds = new Set(activeArtists.map((artist) => artist.artistId));

  return sortReleasesNewestFirst(filterPublishedReleases(releases))
    .filter((release) => !artists || activeArtistIds.has(release.artistId))
    .filter((release) => Boolean(release.releaseId && release.slug && release.title))
    .map((release, index) => {
      const artist = activeArtists.find((activeArtist) => activeArtist.artistId === release.artistId);

      return {
        galleryItemId: `gallery-release-${release.releaseId}`,
        sourceType: "release",
        sourceId: release.releaseId,
        title: release.title,
        slug: `${release.slug}-cover-art`,
        description: release.featuredDescription,
        imageUrl: release.coverArtUrl,
        thumbnailUrl: release.coverArtUrl,
        altText: getGalleryItemAltText(
          {
            galleryItemId: `gallery-release-${release.releaseId}`,
            sourceType: "release",
            sourceId: release.releaseId,
            title: release.title,
            slug: `${release.slug}-cover-art`,
            artistId: release.artistId,
            releaseId: release.releaseId,
            mediaType: "cover_art",
            status: "published",
          },
          artist,
          release,
        ),
        artistId: release.artistId,
        releaseId: release.releaseId,
        mediaType: "cover_art",
        status: "published",
        sortOrder: 1000 + index,
        createdAt: release.releaseDate,
        metadata: {
          releaseSlug: release.slug,
          artistSlug: artist?.slug ?? null,
          artistName: artist?.displayName ?? null,
          genre: release.genre,
        },
      };
    });
};

export const filterPublishedGalleryItems = (items: GalleryInput): PublicGalleryItem[] =>
  toGalleryArray(items).filter((item) => isGalleryItemVisible(item));

export const filterGalleryItemsByMediaType = (
  items: GalleryInput,
  mediaType: GalleryMediaType | "all" | null | undefined,
): PublicGalleryItem[] => {
  const publishedItems = filterPublishedGalleryItems(items);
  if (!mediaType || mediaType === "all") return publishedItems;
  return publishedItems.filter((item) => item.mediaType === mediaType);
};

export const sortGalleryItems = (items: GalleryInput): PublicGalleryItem[] =>
  toGalleryArray(items).sort((a, b) => {
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : Number.POSITIVE_INFINITY;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const dateDelta = parseDateTime(b.createdAt) - parseDateTime(a.createdAt);
    if (dateDelta !== 0) return dateDelta;

    return (a.title || "").localeCompare(b.title || "");
  });

export const isGalleryItemVisible = (item: PublicGalleryItem | null | undefined): item is PublicGalleryItem =>
  Boolean(item?.galleryItemId && item.sourceId && item.slug && item.title && item.status === "published");

export const buildPublicGalleryItems = (
  artists: ArtistInput,
  releases: ReleaseInput,
): PublicGalleryItem[] =>
  sortGalleryItems([
    ...buildGalleryItemsFromArtists(artists),
    ...buildGalleryItemsFromReleases(releases, artists),
  ]);
