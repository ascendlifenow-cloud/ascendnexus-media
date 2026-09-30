import type { ArtistPublicProfile } from "../models/artist";
import type { PublicSongRelease } from "../models/release";
import {
  searchArtists,
  searchPublicCatalog,
  searchSongs,
  type PublicCatalogSearchResults,
  type SearchableSongResult,
} from "../utils/publicSearch";
import { ArtistService } from "./ArtistService";
import { ReleaseService } from "./ReleaseService";

export class PublicSearchService {
  constructor(
    private readonly artistService = new ArtistService(),
    private readonly releaseService = new ReleaseService(),
  ) {}

  async searchCatalog(query: string): Promise<PublicCatalogSearchResults> {
    const [artists, releases] = await Promise.all([
      this.artistService.getActiveArtists(),
      this.releaseService.getPublishedReleases(),
    ]);

    return searchPublicCatalog(artists, releases, query);
  }

  async searchArtists(query: string): Promise<ArtistPublicProfile[]> {
    const artists = await this.artistService.getActiveArtists();
    return searchArtists(artists, query);
  }

  async searchSongs(query: string): Promise<SearchableSongResult[]> {
    const [artists, releases] = await Promise.all([
      this.artistService.getActiveArtists(),
      this.releaseService.getPublishedReleases(),
    ]);
    return searchSongs(releases, query, artists);
  }

  async getSearchableArtists(): Promise<ArtistPublicProfile[]> {
    return this.artistService.getActiveArtists();
  }

  async getSearchableSongs(): Promise<PublicSongRelease[]> {
    return this.releaseService.getPublishedReleases();
  }
}
