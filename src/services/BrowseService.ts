import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import {
  filterSongsByGenreAndTag,
  getAvailableGenres,
  getAvailableStyleTags,
  getGenreCounts,
  getStyleTagCounts,
  type BrowseFilters,
  type FilteredBrowseSong,
} from "../utils/browseFilters";
import { publicMediaApiClient } from "./public/PublicMediaApiClient";

export interface BrowseCatalogData {
  artists: ArtistPublicProfile[];
  releases: PublicSongRelease[];
  genres: string[];
  styleTags: string[];
  genreCounts: Record<string, number>;
  styleTagCounts: Record<string, number>;
}

export class BrowseService {
  async getBrowseCatalogData(): Promise<BrowseCatalogData> {
    const [artists, releases] = await Promise.all([
      publicMediaApiClient.listArtists(),
      publicMediaApiClient.listReleases(),
    ]);

    return {
      artists,
      releases,
      genres: getAvailableGenres(releases, artists),
      styleTags: getAvailableStyleTags(releases, artists),
      genreCounts: getGenreCounts(releases, artists),
      styleTagCounts: getStyleTagCounts(releases, artists),
    };
  }

  async getAvailableGenres(): Promise<string[]> {
    const { genres } = await this.getBrowseCatalogData();
    return genres;
  }

  async getAvailableStyleTags(): Promise<string[]> {
    const { styleTags } = await this.getBrowseCatalogData();
    return styleTags;
  }

  async getGenreCounts(): Promise<Record<string, number>> {
    const { genreCounts } = await this.getBrowseCatalogData();
    return genreCounts;
  }

  async getStyleTagCounts(): Promise<Record<string, number>> {
    const { styleTagCounts } = await this.getBrowseCatalogData();
    return styleTagCounts;
  }

  async getFilteredSongs(filters: BrowseFilters): Promise<FilteredBrowseSong[]> {
    const { releases, artists } = await this.getBrowseCatalogData();
    return filterSongsByGenreAndTag(releases, filters, artists);
  }
}
