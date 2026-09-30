import type { HomepageContent } from "../models/homepage";
import { getHomepageArtistSpotlightData } from "../utils/publicDataSelectors";
import { ArtistService } from "./ArtistService";
import { ReleaseService } from "./ReleaseService";

export class HomepageService {
  constructor(
    private readonly artistService = new ArtistService(),
    private readonly releaseService = new ReleaseService(),
  ) {}

  async getHomepageContent(): Promise<HomepageContent> {
    const artists = await this.artistService.getActiveArtists();
    const releases = await this.releaseService.getPublishedReleases();
    const featuredArtists = artists.slice(0, 6);
    const spotlightArtists = getHomepageArtistSpotlightData(artists, releases, 6);
    const featuredRelease = await this.releaseService.getPrimaryHomepageFeaturedRelease();
    const releaseGroups = await this.releaseService.getHomepageLatestReleaseGroups();

    return {
      artists,
      featuredRelease,
      featuredArtists,
      spotlightArtists,
      releaseGroups,
    };
  }
}
