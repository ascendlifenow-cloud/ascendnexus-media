import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { nowIso } from "./operationsShared";

export class ArtistGrowthService {
  async buildRoadmap() {
    const [artists, releases] = await Promise.all([
      artistRepository.list({ includeArchived: true }),
      releaseRepository.list({ includeArchived: true }),
    ]);
    return {
      artists: artists.map((artist) => {
        const artistReleases = releases.filter((release) => release.artistId === artist.artistId);
        return {
          artistId: artist.artistId,
          name: artist.name,
          status: artist.status,
          publicationState: artist.publicationState,
          releaseCount: artistReleases.length,
          publishedReleaseCount: artistReleases.filter((release) => release.status === "published").length,
          nextRecommendedAction: artistReleases.length ? "Plan next release or campaign." : "Create first release workflow.",
        };
      }),
      checkedAt: nowIso(),
    };
  }
}

export const artistGrowthService = new ArtistGrowthService();
