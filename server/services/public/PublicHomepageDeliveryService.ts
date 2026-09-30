import { getHomepageArtistSpotlightData, getFeaturedReleaseItem } from "../../../src/utils/publicDataSelectors";
import { mapHomepageConfigToPublicHomepageConfiguration } from "../../mappers/public/mapHomepageConfigToPublicHomepageConfiguration";
import { homepageRepository } from "../../repositories/HomepageRepository";
import { defaultHomepageSections } from "../site/siteConfigDefaults";
import { publicArtistService } from "./PublicArtistService";
import { publicGalleryDeliveryService } from "./PublicGalleryDeliveryService";
import { publicReleaseService } from "./PublicReleaseService";

export class PublicHomepageDeliveryService {
  async getPublicHomepage() {
    const [artists, releases, releaseGroups, featuredReleases, galleryItems, homepageConfig] = await Promise.all([
      publicArtistService.listActivePublishedArtists(),
      publicReleaseService.listPublishedReleases(),
      publicReleaseService.getLatestThreeReleasesPerArtist(),
      publicReleaseService.getFeaturedReleases(),
      publicGalleryDeliveryService.listPublishedGalleryItems(),
      homepageRepository.getPublished(),
    ]);
    return mapHomepageConfigToPublicHomepageConfiguration({
      artists,
      featuredRelease: featuredReleases[0] ? getFeaturedReleaseItem(featuredReleases[0], artists) : undefined,
      featuredArtists: artists.filter((artist) => artist.featured).slice(0, 6),
      spotlightArtists: getHomepageArtistSpotlightData(artists, releases, 6),
      releaseGroups,
      sections: ((homepageConfig?.sections ?? defaultHomepageSections()) as never[]).filter((section) => (section as { enabled?: boolean }).enabled !== false),
      galleryPreview: galleryItems.slice(0, 6),
      hero: homepageConfig?.hero,
      about: homepageConfig?.about,
      cta: homepageConfig?.cta,
    });
  }
}

export const publicHomepageDeliveryService = new PublicHomepageDeliveryService();
