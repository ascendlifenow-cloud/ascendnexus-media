import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import { getAvailableGenres, getAvailableStyleTags } from "../utils/browseFilters";
import { sortReleasesNewestFirst, sortReleasesOldestFirst } from "../utils/releaseSorting";
import { publicMediaApiClient } from "./public/PublicMediaApiClient";

export type ReleaseCatalogSortMode = "newest" | "oldest" | "title" | "artist";

export interface CatalogReleaseItem {
  release: PublicSongRelease;
  artist: ArtistPublicProfile;
}

export interface ReleaseCatalogFilters {
  query?: string;
  artist?: string;
  genre?: string;
  tag?: string;
  sort?: ReleaseCatalogSortMode;
}

export interface ReleaseCatalogData {
  artists: ArtistPublicProfile[];
  releases: CatalogReleaseItem[];
  genres: string[];
  styleTags: string[];
  artistCounts: Record<string, number>;
  genreCounts: Record<string, number>;
  styleTagCounts: Record<string, number>;
}

const normalize = (value: string | null | undefined): string => (value ?? "").trim().toLowerCase();

const getReleaseDateTime = (release: PublicSongRelease): number => {
  const parsed = new Date(`${release.releaseDate}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export class ReleaseCatalogService {
  async getCatalogData(): Promise<ReleaseCatalogData> {
    const [artists, releases] = await Promise.all([
      publicMediaApiClient.listArtists(),
      publicMediaApiClient.listReleases(),
    ]);
    const activeArtistById = new Map(artists.map((artist) => [artist.artistId, artist]));
    const catalogReleases = releases
      .map((release) => {
        const artist = activeArtistById.get(release.artistId);
        return artist ? { release, artist } : null;
      })
      .filter((item): item is CatalogReleaseItem => Boolean(item));

    return {
      artists,
      releases: this.sortCatalogReleases(catalogReleases, "newest"),
      genres: getAvailableGenres(releases, artists),
      styleTags: getAvailableStyleTags(releases, artists),
      artistCounts: this.getArtistCounts(catalogReleases),
      genreCounts: this.getGenreCounts(catalogReleases),
      styleTagCounts: this.getStyleTagCounts(catalogReleases),
    };
  }

  async getCatalogReleases(filters: ReleaseCatalogFilters = {}): Promise<CatalogReleaseItem[]> {
    const { releases } = await this.getCatalogData();
    const filtered = this.filterCatalogReleases(releases, filters);
    return this.sortCatalogReleases(filtered, filters.sort ?? "newest");
  }

  async getAvailableCatalogArtists(): Promise<ArtistPublicProfile[]> {
    const { artists } = await this.getCatalogData();
    return artists;
  }

  async getAvailableCatalogGenres(): Promise<string[]> {
    const { genres } = await this.getCatalogData();
    return genres;
  }

  async getAvailableCatalogStyleTags(): Promise<string[]> {
    const { styleTags } = await this.getCatalogData();
    return styleTags;
  }

  filterCatalogReleases(
    releases: readonly CatalogReleaseItem[],
    filters: ReleaseCatalogFilters = {},
  ): CatalogReleaseItem[] {
    const query = normalize(filters.query);
    const artistFilter = normalize(filters.artist);
    const genreFilter = normalize(filters.genre);
    const tagFilter = normalize(filters.tag);

    return releases.filter(({ release, artist }) => {
      const matchesQuery = query
        ? [
            release.title,
            artist.displayName,
            release.genre,
            ...(release.styleTags ?? []),
          ].some((value) => normalize(value).includes(query))
        : true;
      const matchesArtist = artistFilter
        ? normalize(artist.slug) === artistFilter || normalize(artist.artistId) === artistFilter
        : true;
      const matchesGenre = genreFilter ? normalize(release.genre) === genreFilter : true;
      const matchesTag = tagFilter
        ? (release.styleTags ?? []).some((tag) => normalize(tag) === tagFilter)
        : true;

      return matchesQuery && matchesArtist && matchesGenre && matchesTag;
    });
  }

  sortCatalogReleases(
    releases: readonly CatalogReleaseItem[],
    sortMode: ReleaseCatalogSortMode = "newest",
  ): CatalogReleaseItem[] {
    const items = [...releases];

    if (sortMode === "oldest") {
      return this.sortItemsByReleaseOrder(items, sortReleasesOldestFirst(items.map(({ release }) => release)));
    }

    if (sortMode === "title") {
      return items.sort((a, b) => a.release.title.localeCompare(b.release.title));
    }

    if (sortMode === "artist") {
      return items.sort((a, b) => {
        const artistDelta = a.artist.displayName.localeCompare(b.artist.displayName);
        return artistDelta || a.release.title.localeCompare(b.release.title);
      });
    }

    return this.sortItemsByReleaseOrder(items, sortReleasesNewestFirst(items.map(({ release }) => release))).sort((a, b) => {
      const aDate = getReleaseDateTime(a.release);
      const bDate = getReleaseDateTime(b.release);
      if (aDate === 0 && bDate !== 0) return 1;
      if (bDate === 0 && aDate !== 0) return -1;
      return 0;
    });
  }

  private sortItemsByReleaseOrder(
    items: CatalogReleaseItem[],
    sortedReleases: PublicSongRelease[],
  ): CatalogReleaseItem[] {
    const releaseOrder = new Map(sortedReleases.map((release, index) => [release.releaseId, index]));
    return items.sort((a, b) => (releaseOrder.get(a.release.releaseId) ?? 0) - (releaseOrder.get(b.release.releaseId) ?? 0));
  }

  private getArtistCounts(items: readonly CatalogReleaseItem[]): Record<string, number> {
    return items.reduce<Record<string, number>>((counts, { artist }) => {
      counts[artist.slug] = (counts[artist.slug] ?? 0) + 1;
      return counts;
    }, {});
  }

  private getGenreCounts(items: readonly CatalogReleaseItem[]): Record<string, number> {
    return items.reduce<Record<string, number>>((counts, { release }) => {
      if (release.genre) counts[release.genre] = (counts[release.genre] ?? 0) + 1;
      return counts;
    }, {});
  }

  private getStyleTagCounts(items: readonly CatalogReleaseItem[]): Record<string, number> {
    return items.reduce<Record<string, number>>((counts, { release }) => {
      (release.styleTags ?? []).forEach((tag) => {
        counts[tag] = (counts[tag] ?? 0) + 1;
      });
      return counts;
    }, {});
  }
}
