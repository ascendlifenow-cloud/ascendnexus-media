import { homepageRepository } from "../HomepageRepository";
import { siteConfigRepository } from "../SiteConfigRepository";

export class PublicSiteRepository {
  getPublishedSiteConfiguration() {
    return siteConfigRepository.getPublished();
  }

  getPublishedHomepageConfiguration() {
    return homepageRepository.getPublished();
  }
}

export const publicSiteRepository = new PublicSiteRepository();
