import { mapSiteConfigToPublicSiteConfiguration } from "../../mappers/public/mapSiteConfigToPublicSiteConfiguration";
import { metadataValidationService } from "./MetadataValidationService";

export interface MetadataResolutionContext {
  routeTitle: string;
  routeDescription: string;
  entityTitle?: string;
  entityDescription?: string;
  customTitle?: string;
  customDescription?: string;
  explicitImageUrl?: string;
  entityImageUrl?: string;
  routeImageUrl?: string;
  imageAlt?: string;
}

const nonEmpty = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

export class MetadataInheritanceService {
  async getSiteDefaults() {
    return mapSiteConfigToPublicSiteConfiguration();
  }

  async resolve(context: MetadataResolutionContext) {
    const site = await this.getSiteDefaults();
    const title = nonEmpty(context.customTitle) ?? nonEmpty(context.entityTitle) ?? nonEmpty(context.routeTitle) ?? site.siteName;
    const description = nonEmpty(context.customDescription) ?? nonEmpty(context.entityDescription) ?? nonEmpty(context.routeDescription) ?? site.siteDescription;
    const imageUrl = [context.explicitImageUrl, context.entityImageUrl, context.routeImageUrl, site.defaultSocialImageUrl]
      .find((candidate) => nonEmpty(candidate) && metadataValidationService.isPublicSafeUrl(candidate));
    return {
      title: title.includes(site.siteName) ? title : `${title} | ${site.siteName}`,
      description,
      imageUrl,
      imageAlt: nonEmpty(context.imageAlt) ?? title,
      siteName: site.siteName,
      inheritanceTrace: {
        title: nonEmpty(context.customTitle) ? "custom" : nonEmpty(context.entityTitle) ? "entity" : nonEmpty(context.routeTitle) ? "route" : "site",
        description: nonEmpty(context.customDescription) ? "custom" : nonEmpty(context.entityDescription) ? "entity" : nonEmpty(context.routeDescription) ? "route" : "site",
        image: nonEmpty(context.explicitImageUrl) ? "explicit" : nonEmpty(context.entityImageUrl) ? "entity" : nonEmpty(context.routeImageUrl) ? "route" : "site",
      },
    };
  }
}

export const metadataInheritanceService = new MetadataInheritanceService();
