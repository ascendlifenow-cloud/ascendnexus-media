import type { ArtistPublicProfile } from "../../../src/models/artist";
import type { PublicGalleryItem } from "../../../src/models/gallery";
import type { PublicSongRelease } from "../../../src/models/release";
import { paginatePublicItems, sanitizePublicSearchQuery } from "../../utils/public/publicQueryValidationUtils";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { publicArtistService } from "./PublicArtistService";
import { publicGalleryDeliveryService } from "./PublicGalleryDeliveryService";
import { publicReleaseService } from "./PublicReleaseService";

export type PublicSearchEntityType = "artist" | "release" | "gallery_item";
export type PublicSearchSort = "relevance" | "newest" | "oldest" | "title_asc" | "title_desc" | "featured";

interface PublicSearchParams {
  q?: string;
  type?: string;
  types?: string;
  page?: string | number;
  pageSize?: string | number;
  sort?: string;
  genre?: string;
  styleTag?: string;
  tag?: string;
  artistId?: string;
  artist?: string;
  releaseYear?: string;
  year?: string;
  featured?: string | boolean;
  hasPreview?: string | boolean;
}

interface RankedItem<T> {
  item: T;
  score: number;
  entityType: PublicSearchEntityType;
  title: string;
  date?: string;
  featured?: boolean;
}

const allowedTypes = new Set<PublicSearchEntityType>(["artist", "release", "gallery_item"]);
const allowedSorts = new Set<PublicSearchSort>(["relevance", "newest", "oldest", "title_asc", "title_desc", "featured"]);
const normalize = (value: unknown) => sanitizePublicSearchQuery(String(value ?? "")).toLowerCase();
const tokenize = (value: string) => normalize(value).split(/\s+/).filter(Boolean).slice(0, 8);
const asArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const boolFilter = (value: unknown) => value === true || value === "true" ? true : value === false || value === "false" ? false : undefined;

const parsePositiveInt = (value: unknown, fallback: number, max: number) => {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const unique = <T>(values: T[]) => [...new Set(values)];

const textScore = (query: string, fields: Array<{ value: unknown; weight: number }>) => {
  const terms = tokenize(query);
  if (!terms.length) return 0;
  let score = 0;
  for (const { value, weight } of fields) {
    const haystack = normalize(value);
    if (!haystack) continue;
    if (haystack === query) score += weight * 8;
    if (haystack.startsWith(query)) score += weight * 5;
    if (haystack.includes(query)) score += weight * 3;
    for (const term of terms) {
      if (haystack === term) score += weight * 4;
      else if (haystack.startsWith(term)) score += weight * 2;
      else if (haystack.includes(term)) score += weight;
    }
  }
  return score;
};

const releaseArtistName = (release: PublicSongRelease, artists: ArtistPublicProfile[]) =>
  artists.find((artist) => artist.artistId === release.artistId || artist.slug === release.artistSlug)?.displayName ?? release.artistName ?? "";

const releaseHasPublicPreview = (release: PublicSongRelease) => Boolean(release.audioPreviewUrl || release.audioPreview);

const toSongResult = (release: PublicSongRelease, artists: ArtistPublicProfile[]) => ({
  release,
  artist: artists.find((artist) => artist.artistId === release.artistId || artist.slug === release.artistSlug),
});

export class PublicSearchService {
  async searchPublicContent(input: string | PublicSearchParams = {}) {
    const params = typeof input === "string" ? { q: input } : input;
    const query = sanitizePublicSearchQuery(params.q ?? "");
    const selectedTypes = this.parseTypes(params);
    const page = parsePositiveInt(params.page, 1, 10000);
    const pageSize = parsePositiveInt(params.pageSize, 12, 48);
    const sort = this.parseSort(params.sort);
    const [artists, releases, gallery] = await Promise.all([
      publicArtistService.listActivePublishedArtists(),
      publicReleaseService.listPublishedReleases(),
      publicGalleryDeliveryService.listPublishedGalleryItems(),
    ]);

    const artistResults = selectedTypes.has("artist") ? this.rankArtists(artists, query, params) : [];
    const releaseResults = selectedTypes.has("release") ? this.rankReleases(releases, artists, query, params) : [];
    const galleryResults = selectedTypes.has("gallery_item") ? this.rankGallery(gallery, query, params) : [];
    const unified = this.sortRanked([...artistResults, ...releaseResults, ...galleryResults], sort);
    const paged = paginatePublicItems(unified, page, pageSize);
    const totalResults = artistResults.length + releaseResults.length + galleryResults.length;

    return {
      query,
      normalizedQuery: normalize(query),
      entityTypes: [...selectedTypes],
      sort,
      results: paged.items.map((result) => this.toUnifiedResult(result, artists)),
      groups: {
        artists: this.group("artist", artistResults, artists),
        releases: this.group("release", releaseResults, artists),
        galleryItems: this.group("gallery_item", galleryResults, artists),
      },
      availableFilters: this.buildAvailableFilters(artists, releases, gallery),
      pagination: paged.pagination,
      totalResults,
      totalArtists: artistResults.length,
      totalSongs: releaseResults.length,
      totalGallery: galleryResults.length,
      artists: artistResults.map((result) => result.item),
      songs: releaseResults.map((result) => toSongResult(result.item, artists)),
      gallery: galleryResults.map((result) => result.item),
      meta: {
        minQueryLength: 2,
        ranking: "weighted_exact_prefix_contains",
        source: "published_public_content",
        checkedAt: new Date().toISOString(),
      },
    };
  }

  async suggestPublicContent(input: PublicSearchParams = {}) {
    const query = sanitizePublicSearchQuery(input.q ?? "");
    const limit = parsePositiveInt(input.pageSize ?? input.limit, 8, 20);
    if (normalize(query).length < 2) return { query, suggestions: [], checkedAt: new Date().toISOString() };
    const [artists, releases, gallery] = await Promise.all([
      publicArtistService.listActivePublishedArtists(),
      publicReleaseService.listPublishedReleases(),
      publicGalleryDeliveryService.listPublishedGalleryItems(),
    ]);
    const ranked = [
      ...this.rankArtists(artists, query, input),
      ...this.rankReleases(releases, artists, query, input),
      ...this.rankGallery(gallery, query, input),
    ].sort((a, b) => b.score - a.score).slice(0, limit);
    return {
      query,
      suggestions: ranked.map((result) => ({
        entityType: result.entityType,
        label: result.title,
        url: this.destinationFor(result.item, result.entityType),
        score: result.score,
      })),
      checkedAt: new Date().toISOString(),
    };
  }

  async getRelatedReleases(releaseSlugOrId: string, limit = 6) {
    const [artists, releases] = await Promise.all([
      publicArtistService.listActivePublishedArtists(),
      publicReleaseService.listPublishedReleases(),
    ]);
    const release = releases.find((item) => item.releaseId === releaseSlugOrId || item.slug === releaseSlugOrId);
    if (!release) throw createPublicError("PUBLIC_RESOURCE_NOT_FOUND", "Public resource was not found.", 404);
    const tagSet = new Set(asArray(release.styleTags).map(normalize));
    const related = releases
      .filter((item) => item.releaseId !== release.releaseId)
      .map((item) => {
        const sharedTags = asArray(item.styleTags).filter((tag) => tagSet.has(normalize(tag))).length;
        const sameArtist = item.artistId === release.artistId ? 10 : 0;
        const sameGenre = normalize(item.genre) && normalize(item.genre) === normalize(release.genre) ? 5 : 0;
        return { item, score: sameArtist + sameGenre + sharedTags * 2, entityType: "release" as const, title: item.title, date: item.releaseDate, featured: item.featured };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || b.date?.localeCompare(a.date ?? "") || 0)
      .slice(0, limit);
    return { releaseId: release.releaseId, related: related.map((item) => toSongResult(item.item, artists)), checkedAt: new Date().toISOString() };
  }

  private parseTypes(params: PublicSearchParams) {
    const raw = (params.types ?? params.type ?? "artist,release,gallery_item").split(",").map((value) => value.trim()).filter(Boolean);
    const selected = new Set<PublicSearchEntityType>();
    for (const value of raw) {
      const normalized = value === "song" || value === "songs" || value === "release" || value === "releases" ? "release" : value === "gallery" ? "gallery_item" : value;
      if (!allowedTypes.has(normalized as PublicSearchEntityType)) throw createPublicError("PUBLIC_INVALID_FILTER", "Unsupported search entity type.", 400);
      selected.add(normalized as PublicSearchEntityType);
    }
    return selected.size ? selected : new Set<PublicSearchEntityType>(["artist", "release", "gallery_item"]);
  }

  private parseSort(value: unknown): PublicSearchSort {
    const sort = String(value ?? "relevance") as PublicSearchSort;
    if (!allowedSorts.has(sort)) throw createPublicError("PUBLIC_SORT_INVALID", "Unsupported sort field.", 400);
    return sort;
  }

  private rankArtists(artists: ArtistPublicProfile[], query: string, params: PublicSearchParams): RankedItem<ArtistPublicProfile>[] {
    const genre = normalize(params.genre);
    const styleTag = normalize(params.styleTag ?? params.tag);
    const featured = boolFilter(params.featured);
    return artists
      .filter((artist) => !genre || asArray(artist.genres).some((item) => normalize(item) === genre))
      .filter((artist) => !styleTag || asArray(artist.styleTags).some((item) => normalize(item) === styleTag))
      .filter((artist) => featured === undefined || Boolean(artist.featured) === featured)
      .map((artist) => ({
        item: artist,
        entityType: "artist" as const,
        title: artist.displayName || artist.name,
        featured: artist.featured,
        score: query ? textScore(query, [
          { value: artist.displayName, weight: 8 },
          { value: artist.name, weight: 6 },
          { value: artist.slug, weight: 5 },
          { value: artist.shortBio ?? artist.bio, weight: 2 },
          { value: [...asArray(artist.genres), ...asArray(artist.styleTags)].join(" "), weight: 3 },
        ]) : 1,
      }))
      .filter((result) => !query || result.score > 0);
  }

  private rankReleases(releases: PublicSongRelease[], artists: ArtistPublicProfile[], query: string, params: PublicSearchParams): RankedItem<PublicSongRelease>[] {
    const genre = normalize(params.genre);
    const styleTag = normalize(params.styleTag ?? params.tag);
    const artist = normalize(params.artistId ?? params.artist);
    const year = String(params.releaseYear ?? params.year ?? "");
    const featured = boolFilter(params.featured);
    const hasPreview = boolFilter(params.hasPreview);
    return releases
      .filter((release) => !genre || normalize(release.genre) === genre)
      .filter((release) => !styleTag || asArray(release.styleTags).some((tag) => normalize(tag) === styleTag))
      .filter((release) => !artist || normalize(release.artistId) === artist || normalize(releaseArtistName(release, artists)) === artist || normalize(release.artistSlug) === artist)
      .filter((release) => !year || release.releaseDate?.startsWith(year))
      .filter((release) => featured === undefined || Boolean(release.featured) === featured)
      .filter((release) => hasPreview === undefined || releaseHasPublicPreview(release) === hasPreview)
      .map((release) => ({
        item: release,
        entityType: "release" as const,
        title: release.title,
        date: release.releaseDate,
        featured: release.featured,
        score: query ? textScore(query, [
          { value: release.title, weight: 8 },
          { value: release.slug, weight: 5 },
          { value: release.description, weight: 2 },
          { value: release.genre, weight: 4 },
          { value: asArray(release.styleTags).join(" "), weight: 3 },
          { value: releaseArtistName(release, artists), weight: 5 },
        ]) : 1,
      }))
      .filter((result) => !query || result.score > 0);
  }

  private rankGallery(gallery: PublicGalleryItem[], query: string, params: PublicSearchParams): RankedItem<PublicGalleryItem>[] {
    const featured = boolFilter(params.featured);
    return gallery
      .filter((item) => featured === undefined || Boolean(item.featured) === featured)
      .map((item) => ({
        item,
        entityType: "gallery_item" as const,
        title: item.title,
        featured: item.featured,
        score: query ? textScore(query, [
          { value: item.title, weight: 8 },
          { value: item.slug, weight: 5 },
          { value: item.description ?? item.caption, weight: 2 },
          { value: item.mediaType, weight: 3 },
        ]) : 1,
      }))
      .filter((result) => !query || result.score > 0);
  }

  private sortRanked<T>(items: RankedItem<T>[], sort: PublicSearchSort) {
    const byTitle = (a: RankedItem<T>, b: RankedItem<T>) => a.title.localeCompare(b.title);
    if (sort === "title_asc") return [...items].sort(byTitle);
    if (sort === "title_desc") return [...items].sort((a, b) => byTitle(b, a));
    if (sort === "newest") return [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.score - a.score);
    if (sort === "oldest") return [...items].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || b.score - a.score);
    if (sort === "featured") return [...items].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.score - a.score);
    return [...items].sort((a, b) => b.score - a.score || byTitle(a, b));
  }

  private group<T>(entityType: PublicSearchEntityType, items: RankedItem<T>[], artists: ArtistPublicProfile[]) {
    const sorted = this.sortRanked(items, "relevance");
    return {
      entityType,
      total: sorted.length,
      hasMore: sorted.length > 6,
      items: sorted.slice(0, 6).map((item) => this.toUnifiedResult(item, artists)),
    };
  }

  private toUnifiedResult<T>(result: RankedItem<T>, artists: ArtistPublicProfile[]) {
    const item = result.item as Record<string, unknown>;
    return {
      entityType: result.entityType,
      id: String(item.artistId ?? item.releaseId ?? item.galleryItemId ?? item.slug),
      title: result.title,
      slug: String(item.slug ?? ""),
      url: this.destinationFor(result.item, result.entityType),
      score: result.score,
      featured: result.featured,
      item: result.entityType === "release" ? toSongResult(result.item as PublicSongRelease, artists) : result.item,
    };
  }

  private destinationFor(item: unknown, entityType: PublicSearchEntityType) {
    const slug = String((item as Record<string, unknown>).slug ?? "");
    if (entityType === "artist") return `/artists/${slug}`;
    if (entityType === "gallery_item") return `/gallery/${slug}`;
    return `/songs/${slug}`;
  }

  private buildAvailableFilters(artists: ArtistPublicProfile[], releases: PublicSongRelease[], gallery: PublicGalleryItem[]) {
    const genres = unique([...artists.flatMap((artist) => asArray(artist.genres)), ...releases.map((release) => release.genre).filter(Boolean) as string[]]).sort((a, b) => a.localeCompare(b));
    const styleTags = unique([...artists.flatMap((artist) => asArray(artist.styleTags)), ...releases.flatMap((release) => asArray(release.styleTags))]).sort((a, b) => a.localeCompare(b));
    const releaseYears = unique(releases.map((release) => release.releaseDate?.slice(0, 4)).filter(Boolean) as string[]).sort((a, b) => b.localeCompare(a));
    const mediaTypes = unique(gallery.map((item) => item.mediaType).filter(Boolean) as string[]).sort((a, b) => a.localeCompare(b));
    return { genres, styleTags, releaseYears, mediaTypes, entityTypes: [...allowedTypes], sorts: [...allowedSorts] };
  }
}

export const publicSearchDeliveryService = new PublicSearchService();
