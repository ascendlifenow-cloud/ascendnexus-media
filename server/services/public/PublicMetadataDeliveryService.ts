import { seoMetadataRepository, socialMetadataRepository } from "../../repositories/MetadataRepository";
import { canonicalUrlService } from "../metadata/CanonicalUrlService";
import { metadataInheritanceService } from "../metadata/MetadataInheritanceService";
import { metadataValidationService } from "../metadata/MetadataValidationService";
import { publicRouteMetadataCatalog } from "../metadata/PublicRouteMetadataCatalog";
import { robotsDirectiveService } from "../metadata/RobotsDirectiveService";
import { structuredDataService } from "../metadata/StructuredDataService";
import { publicArtistService } from "./PublicArtistService";
import { publicGalleryDeliveryService } from "./PublicGalleryDeliveryService";
import { publicReleaseService } from "./PublicReleaseService";

export interface PublicMetadataPayload {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  noIndex: boolean;
  openGraph: {
    title: string;
    description: string;
    type: string;
    url: string;
    siteName: string;
    image?: string;
    imageAlt?: string;
  };
  twitterCard: {
    card: string;
    title: string;
    description: string;
    image?: string;
    imageAlt?: string;
  };
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  metadataVersion?: string;
  lastModified?: string;
}

const safeText = (value: unknown, fallback = "") => String(typeof value === "string" ? value : fallback).replace(/[<>]/g, "").trim();

export class PublicMetadataDeliveryService {
  async getMetadataForPath(rawPath: string): Promise<PublicMetadataPayload | undefined> {
    if (!publicRouteMetadataCatalog.isAllowedPublicPath(rawPath)) return undefined;
    const path = publicRouteMetadataCatalog.normalizePath(rawPath);
    const { definition, params } = publicRouteMetadataCatalog.matchPath(path);
    const canonicalPath = this.resolveCanonicalPath(definition.canonicalPath, params);
    const canonicalUrl = canonicalUrlService.buildCanonicalUrl(canonicalPath);
    const site = await metadataInheritanceService.getSiteDefaults();

    const entity = await this.resolveEntity(definition.routeKey, params);
    if ((definition.routeKey === "artist" || definition.routeKey === "release" || definition.routeKey === "gallery_item") && !entity) return undefined;

    const publishedSeo = entity?.entityType && entity.entityId
      ? await seoMetadataRepository.getPublishedByEntity(entity.entityType, entity.entityId)
      : await seoMetadataRepository.getPublishedByPath(path);
    const publishedSocial = entity?.entityType && entity.entityId
      ? await socialMetadataRepository.getPublishedByEntity(entity.entityType, entity.entityId)
      : await socialMetadataRepository.getPublishedByPath(path);

    const resolved = await metadataInheritanceService.resolve({
      routeTitle: definition.defaultTitle,
      routeDescription: definition.defaultDescription,
      entityTitle: entity?.title,
      entityDescription: entity?.description,
      customTitle: publishedSeo?.title,
      customDescription: publishedSeo?.description,
      explicitImageUrl: publishedSocial?.imageUrl ?? publishedSeo?.imageUrl,
      entityImageUrl: entity?.imageUrl,
      routeImageUrl: site.defaultSocialImageUrl,
      imageAlt: publishedSocial?.imageAlt ?? publishedSeo?.imageAlt ?? entity?.imageAlt,
    });

    const robotsDirectives = robotsDirectiveService.resolveDefaults(definition.indexable && !publishedSeo?.robots?.includes("noindex"));
    const robots = publishedSeo?.robots || robotsDirectiveService.serialize(robotsDirectives);
    const imageUrl = metadataValidationService.isPublicSafeUrl(resolved.imageUrl) ? resolved.imageUrl : undefined;
    const structuredData = structuredDataService.sanitizeStructuredData(publishedSeo?.structuredData ?? this.buildStructuredData(definition.routeKey, entity?.raw, canonicalUrl, site));
    const validation = metadataValidationService.validate({
      title: resolved.title,
      description: resolved.description,
      canonicalUrl,
      imageUrl,
      robots: robotsDirectives,
      openGraphType: String(publishedSocial?.openGraph?.type ?? definition.openGraphType),
      twitterCard: String(publishedSocial?.twitterCard?.card ?? definition.twitterCard),
      structuredData,
      entityPublic: true,
    });
    if (!validation.valid) return undefined;

    return {
      title: safeText(resolved.title),
      description: safeText(resolved.description),
      canonicalUrl,
      robots,
      noIndex: robots.includes("noindex"),
      openGraph: {
        title: safeText(String(publishedSocial?.openGraph?.title ?? publishedSocial?.title ?? resolved.title)),
        description: safeText(String(publishedSocial?.openGraph?.description ?? publishedSocial?.description ?? resolved.description)),
        type: String(publishedSocial?.openGraph?.type ?? definition.openGraphType),
        url: canonicalUrl,
        siteName: resolved.siteName,
        image: imageUrl,
        imageAlt: imageUrl ? safeText(resolved.imageAlt, resolved.title) : undefined,
      },
      twitterCard: {
        card: String(publishedSocial?.twitterCard?.card ?? definition.twitterCard),
        title: safeText(String(publishedSocial?.twitterCard?.title ?? publishedSocial?.title ?? resolved.title)),
        description: safeText(String(publishedSocial?.twitterCard?.description ?? publishedSocial?.description ?? resolved.description)),
        image: imageUrl,
        imageAlt: imageUrl ? safeText(resolved.imageAlt, resolved.title) : undefined,
      },
      structuredData,
      metadataVersion: String(publishedSeo?.schemaVersion ?? publishedSocial?.schemaVersion ?? 1),
      lastModified: publishedSeo?.updatedAt ?? publishedSocial?.updatedAt ?? new Date().toISOString(),
    };
  }

  private resolveCanonicalPath(pattern: string, params: Record<string, string>) {
    return Object.entries(params).reduce((current, [key, value]) => current.replace(`:${key}`, encodeURIComponent(value)), pattern);
  }

  private async resolveEntity(routeKey: string, params: Record<string, string>) {
    if (routeKey === "artist") {
      const artist = await publicArtistService.getPublishedArtistBySlug(params.artistSlug);
      return artist ? { entityType: "artist", entityId: artist.artistId, title: artist.displayName, description: artist.bio, imageUrl: artist.profileImage, imageAlt: `${artist.displayName} artwork`, raw: artist } : undefined;
    }
    if (routeKey === "release") {
      const release = await publicReleaseService.getPublishedReleaseBySlug(params.songSlug);
      if (!release) return undefined;
      const artist = (await publicArtistService.listActivePublishedArtists()).find((item) => item.artistId === release.artistId);
      return { entityType: "release", entityId: release.releaseId, title: artist ? `${release.title} by ${artist.displayName}` : release.title, description: release.featuredDescription ?? `${release.genre} release by Ascend Nexus Media.`, imageUrl: release.coverArtUrl, imageAlt: `${release.title} cover art`, raw: { release, artist } };
    }
    if (routeKey === "gallery_item") {
      const item = await publicGalleryDeliveryService.getPublishedGalleryItemBySlug(params.galleryItemSlug);
      return item ? { entityType: "gallery_item", entityId: item.galleryItemId, title: item.title, description: item.description, imageUrl: item.imageUrl, imageAlt: item.altText ?? item.title, raw: item } : undefined;
    }
    return undefined;
  }

  private buildStructuredData(routeKey: string, raw: unknown, canonicalUrl: string, site: { siteName: string; siteDescription?: string; defaultSocialImageUrl?: string }) {
    if (routeKey === "home") return [structuredDataService.buildWebsiteSchema(site, canonicalUrl), structuredDataService.buildOrganizationSchema(site, canonicalUrl)];
    if (routeKey === "artist" && raw) return structuredDataService.buildArtistSchema(raw as never, canonicalUrl);
    if (routeKey === "release" && raw && typeof raw === "object") {
      const data = raw as { release?: never; artist?: never };
      return structuredDataService.buildMusicRecordingSchema(data.release as never, data.artist as never, canonicalUrl);
    }
    if (routeKey === "gallery_item" && raw) return structuredDataService.buildImageObjectSchema(raw as never, canonicalUrl);
    if (["artists", "releases", "gallery"].includes(routeKey)) return structuredDataService.buildCollectionPageSchema(site.siteName, site.siteDescription ?? "", canonicalUrl);
    return undefined;
  }
}

export const publicMetadataDeliveryService = new PublicMetadataDeliveryService();
