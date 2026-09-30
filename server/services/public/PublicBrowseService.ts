import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicGalleryItem } from "../../../src/models/gallery";
import type { PublicSongRelease } from "../../../src/models/release";
import { paginatePublicItems } from "../../utils/public/publicQueryValidationUtils";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { publicArtistService } from "./PublicArtistService";
import { publicGalleryDeliveryService } from "./PublicGalleryDeliveryService";
import { publicReleaseService } from "./PublicReleaseService";

type BrowseMode = "all" | "artists" | "releases" | "genres" | "styles" | "featured" | "latest" | "gallery";
type BrowseSort = "newest" | "oldest" | "title_asc" | "title_desc" | "featured" | "sortOrder";

interface BrowseFilters {
  mode?: string;
  entityType?: string;
  artist?: string;
  artistId?: string;
  genre?: string;
  styleTag?: string;
  tag?: string;
  releaseYear?: string;
  year?: string;
  featured?: string | boolean;
  mediaType?: string;
  sort?: string;
  page?: string | number;
  pageSize?: string | number;
}

const allowedModes = new Set<BrowseMode>(["all", "artists", "releases", "genres", "styles", "featured", "latest", "gallery"]);
const allowedSorts = new Set<BrowseSort>(["newest", "oldest", "title_asc", "title_desc", "featured", "sortOrder"]);
const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();
const asArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const unique = <T>(values: T[]) => [...new Set(values)];
const boolFilter = (value: unknown) => value === true || value === "true" ? true : value === false || value === "false" ? false : undefined;

const parsePositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const releaseTitle = (release: PublicSongRelease) => release.title ?? "";
const artistTitle = (artist: ArtistPublicProfile) => artist.displayName || artist.name || "";
const galleryTitle = (item: PublicGalleryItem) => item.title ?? "";

export class PublicBrowseService {
  async browsePublicContent(filters: BrowseFilters = {}) {
    const mode = this.parseMode(filters.mode ?? filters.entityType);
    const sort = this.parseSort(filters.sort);
    const page = parsePositiveInt(filters.page, 1, 10000);
    const pageSize = parsePositiveInt(filters.pageSize, 24, 72);
    const [artists, releases, gallery] = await Promise.all([
      publicArtistService.listActivePublishedArtists(),
      publicReleaseService.listPublishedReleases(),
      publicGalleryDeliveryService.listPublishedGalleryItems({ mediaType: filters.mediaType }),
    ]);

    const filteredArtists = this.filterArtists(artists, filters);
    const filteredReleases = this.sortReleases(this.filterReleases(releases, artists, filters), sort);
    const filteredGallery = this.sortGallery(this.filterGallery(gallery, filters), sort);
    const releasePage = paginatePublicItems(filteredReleases, page, pageSize);
    const artistPage = paginatePublicItems(filteredArtists, page, pageSize);
    const galleryPage = paginatePublicItems(filteredGallery, page, pageSize);
    const catalogs = this.buildCatalogs(artists, releases, gallery);

    return {
      mode,
      sort,
      activeFilters: {
        artist: filters.artist ?? filters.artistId,
        genre: filters.genre,
        styleTag: filters.styleTag ?? filters.tag,
        releaseYear: filters.releaseYear ?? filters.year,
        featured: boolFilter(filters.featured),
        mediaType: filters.mediaType,
      },
      sections: {
        artists: mode === "all" || mode === "artists" ? { items: artistPage.items, pagination: artistPage.pagination } : { items: [], pagination: artistPage.pagination },
        releases: mode === "all" || mode === "releases" || mode === "featured" || mode === "latest" ? { items: releasePage.items, pagination: releasePage.pagination } : { items: [], pagination: releasePage.pagination },
        gallery: mode === "all" || mode === "gallery" ? { items: galleryPage.items, pagination: galleryPage.pagination } : { items: [], pagination: galleryPage.pagination },
        genres: mode === "genres" ? catalogs.genres : [],
        styles: mode === "styles" ? catalogs.styleTags : [],
      },
      catalogs,
      featured: {
        artists: artists.filter((artist) => artist.featured).slice(0, 12),
        releases: releases.filter((release) => release.featured).slice(0, 12),
        gallery: gallery.filter((item) => item.featured).slice(0, 12),
      },
      latest: {
        releases: this.sortReleases(releases, "newest").slice(0, 24),
      },
      pagination: mode === "artists" ? artistPage.pagination : mode === "gallery" ? galleryPage.pagination : releasePage.pagination,
      artists: filteredArtists,
      releases: filteredReleases,
      gallery: filteredGallery,
      genreCounts: catalogs.genreCounts,
      styleTagCounts: catalogs.styleTagCounts,
      genres: catalogs.genres.map((item) => item.value),
      styleTags: catalogs.styleTags.map((item) => item.value),
      meta: {
        source: "published_public_content",
        privateAudioMastersExcluded: true,
        checkedAt: new Date().toISOString(),
      },
    };
  }

  private parseMode(value: unknown): BrowseMode {
    const raw = String(value ?? "all");
    const normalized = raw === "artist" ? "artists" : raw === "release" || raw === "song" ? "releases" : raw === "gallery_item" ? "gallery" : raw;
    if (!allowedModes.has(normalized as BrowseMode)) throw createPublicError("PUBLIC_INVALID_FILTER", "Unsupported browse mode.", 400);
    return normalized as BrowseMode;
  }

  private parseSort(value: unknown): BrowseSort {
    const sort = String(value ?? "newest") as BrowseSort;
    if (!allowedSorts.has(sort)) throw createPublicError("PUBLIC_SORT_INVALID", "Unsupported sort field.", 400);
    return sort;
  }

  private filterArtists(artists: ArtistPublicProfile[], filters: BrowseFilters) {
    const genre = normalize(filters.genre);
    const tag = normalize(filters.styleTag ?? filters.tag);
    const featured = boolFilter(filters.featured);
    return artists
      .filter((artist) => !genre || asArray(artist.genres).some((item) => normalize(item) === genre))
      .filter((artist) => !tag || asArray(artist.styleTags).some((item) => normalize(item) === tag))
      .filter((artist) => featured === undefined || Boolean(artist.featured) === featured)
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || artistTitle(a).localeCompare(artistTitle(b)));
  }

  private filterReleases(releases: PublicSongRelease[], artists: ArtistPublicProfile[], filters: BrowseFilters) {
    const artist = normalize(filters.artistId ?? filters.artist);
    const genre = normalize(filters.genre);
    const tag = normalize(filters.styleTag ?? filters.tag);
    const year = String(filters.releaseYear ?? filters.year ?? "");
    const featured = boolFilter(filters.featured);
    return releases
      .filter((release) => {
        if (!artist) return true;
        const assigned = artists.find((item) => item.artistId === release.artistId);
        return normalize(release.artistId) === artist || normalize(assigned?.slug) === artist || normalize(assigned?.displayName) === artist;
      })
      .filter((release) => !genre || normalize(release.genre) === genre)
      .filter((release) => !tag || asArray(release.styleTags).some((item) => normalize(item) === tag))
      .filter((release) => !year || release.releaseDate?.startsWith(year))
      .filter((release) => featured === undefined || Boolean(release.featured) === featured);
  }

  private filterGallery(gallery: PublicGalleryItem[], filters: BrowseFilters) {
    const featured = boolFilter(filters.featured);
    return gallery.filter((item) => featured === undefined || Boolean(item.featured) === featured);
  }

  private sortReleases(releases: PublicSongRelease[], sort: BrowseSort) {
    if (sort === "oldest") return [...releases].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
    if (sort === "title_asc") return [...releases].sort((a, b) => releaseTitle(a).localeCompare(releaseTitle(b)));
    if (sort === "title_desc") return [...releases].sort((a, b) => releaseTitle(b).localeCompare(releaseTitle(a)));
    if (sort === "featured") return [...releases].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.releaseDate.localeCompare(a.releaseDate));
    return [...releases].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  }

  private sortGallery(gallery: PublicGalleryItem[], sort: BrowseSort) {
    if (sort === "title_asc") return [...gallery].sort((a, b) => galleryTitle(a).localeCompare(galleryTitle(b)));
    if (sort === "title_desc") return [...gallery].sort((a, b) => galleryTitle(b).localeCompare(galleryTitle(a)));
    if (sort === "featured") return [...gallery].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
    return [...gallery].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || galleryTitle(a).localeCompare(galleryTitle(b)));
  }

  private buildCatalogs(artists: ArtistPublicProfile[], releases: PublicSongRelease[], gallery: PublicGalleryItem[]) {
    const genreCounts: Record<string, number> = {};
    const styleTagCounts: Record<string, number> = {};
    for (const value of [...artists.flatMap((artist) => asArray(artist.genres)), ...releases.map((release) => release.genre).filter(Boolean) as string[]]) {
      genreCounts[value] = (genreCounts[value] ?? 0) + 1;
    }
    for (const value of [...artists.flatMap((artist) => asArray(artist.styleTags)), ...releases.flatMap((release) => asArray(release.styleTags))]) {
      styleTagCounts[value] = (styleTagCounts[value] ?? 0) + 1;
    }
    return {
      genres: unique(Object.keys(genreCounts)).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, count: genreCounts[value] })),
      styleTags: unique(Object.keys(styleTagCounts)).sort((a, b) => a.localeCompare(b)).map((value) => ({ value, count: styleTagCounts[value] })),
      releaseYears: unique(releases.map((release) => release.releaseDate?.slice(0, 4)).filter(Boolean) as string[]).sort((a, b) => b.localeCompare(a)),
      mediaTypes: unique(gallery.map((item) => item.mediaType).filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b)),
      genreCounts,
      styleTagCounts,
    };
  }
}

export const publicBrowseService = new PublicBrowseService();
