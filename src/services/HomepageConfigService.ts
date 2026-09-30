import { defaultHomepageSectionsConfig } from "../data/homepageSections.config";
import type { HomepageContent } from "../models/homepage";
import type { HomepageSectionConfig } from "../models/homepage";
import {
  filterEnabledHomepageSections,
  sortHomepageSections,
} from "../utils/homepageSectionConfig";
import { publicMediaApiClient } from "./public/PublicMediaApiClient";

type HomepageConfigurationPayload = HomepageContent & {
  sections?: HomepageSectionConfig[];
};

export class HomepageConfigService {
  async getHomepageConfig(): Promise<HomepageSectionConfig[]> {
    try {
      const homepage = (await publicMediaApiClient.getHomepage()) as HomepageConfigurationPayload;
      if (Array.isArray(homepage.sections)) return sortHomepageSections(homepage.sections);
    } catch (error) {
      console.warn("[HomepageConfigService] Public homepage configuration unavailable; using configured fallback.", error);
    }
    return sortHomepageSections(defaultHomepageSectionsConfig);
  }

  async getEnabledHomepageSections(): Promise<HomepageSectionConfig[]> {
    const sections = await this.getHomepageConfig();
    return filterEnabledHomepageSections(sections);
  }

  async getHomepageSectionById(sectionId: string): Promise<HomepageSectionConfig | undefined> {
    const sections = await this.getHomepageConfig();
    return sections.find((section) => section.sectionId === sectionId);
  }
}
