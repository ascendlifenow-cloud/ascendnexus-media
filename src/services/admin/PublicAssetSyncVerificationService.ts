import type {
  MediaAssetRecord,
  PublicAssetSyncCheck,
  PublicAssetSyncReport,
  PublishingEntityType,
} from "../../models/admin";
import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicGalleryItem } from "../../models/gallery";
import type { PublicSongRelease } from "../../models/release";
import {
  buildPublicAssetSyncCheck,
  getActualPublicMappedAssetUrl,
  getExpectedPublicAssetUrl,
  summarizeAssetSyncChecks,
} from "../../utils/admin/publicAssetSyncUtils";
import { isSafePublicMediaUrl } from "../../utils/media/publicSafeUrlUtils";
import { ArtistService } from "../ArtistService";
import { GalleryService } from "../GalleryService";
import { HomepageConfigService } from "../HomepageConfigService";
import { HomepageService } from "../HomepageService";
import { ReleaseService } from "../ReleaseService";
import { adminMediaService } from "./AdminMediaService";
import { recordPublishingAuditEvent } from "./AdminAuditService";
import { SeedBackedAdminGalleryService } from "./AdminGalleryService";
import { SeedBackedAdminMetadataService } from "./AdminMetadataService";
import { SeedBackedAdminSiteConfigService } from "./AdminSiteConfigService";
import { mediaCdnService } from "../media/MediaCdnService";

const imageAssetTypes = new Set(["cover_art", "artist_profile", "artist_banner", "artist_character_art", "promo_graphic", "gallery_image", "social_preview", "logo", "fallback_image", "custom_image"]);

export class PublicAssetSyncVerificationService {
  constructor(
    private readonly artistService = new ArtistService(),
    private readonly releaseService = new ReleaseService(),
    private readonly homepageService = new HomepageService(),
    private readonly homepageConfigService = new HomepageConfigService(),
    private readonly galleryService = new GalleryService(),
    private readonly galleryAdminService = new SeedBackedAdminGalleryService(),
    private readonly metadataService = new SeedBackedAdminMetadataService(),
    private readonly siteConfigService = new SeedBackedAdminSiteConfigService(),
  ) {}

  async runFullPublicAssetSyncCheck(): Promise<PublicAssetSyncReport> {
    try {
      recordPublishingAuditEvent("system", {
        actionType: "validate",
        entityId: "public-asset-sync",
        entityLabel: "Public Asset Sync",
        summary: "Public asset sync check started",
      });
      const checks = [
        ...await this.checkHomepageAssets(),
        ...await this.checkArtistAssets(),
        ...await this.checkReleaseAssets(),
        ...await this.checkGalleryAssets(),
        ...await this.checkSiteConfigAssets(),
        ...await this.checkSeoSocialAssets(),
      ];
      const report = this.buildSyncReport(checks);
      recordPublishingAuditEvent("system", {
        actionType: "validate",
        entityId: report.reportId,
        entityLabel: "Public Asset Sync",
        summary: report.blockingCount
          ? "Public asset sync blocking issues detected"
          : report.errorCount
            ? "Public asset sync found mismatches"
            : "Public asset sync check completed",
        metadata: {
          status: report.status,
          totalChecks: report.totalChecks,
          blockingCount: report.blockingCount,
          errorCount: report.errorCount,
          warningCount: report.warningCount,
        },
      });
      return report;
    } catch (error) {
      const check = this.errorCheck("/", "public_path", error);
      return this.buildSyncReport([check]);
    }
  }

  async checkHomepageAssets(): Promise<PublicAssetSyncCheck[]> {
    const [content, sections] = await Promise.all([
      this.homepageService.getHomepageContent(),
      this.homepageConfigService.getEnabledHomepageSections(),
    ]);
    const checks: PublicAssetSyncCheck[] = [];
    for (const section of sections) {
      if (section.sectionType === "featured_release" && content.featuredRelease) {
        checks.push(...this.releaseAssetChecks(content.featuredRelease.release, "/"));
        checks.push(this.artistImageCheck(content.featuredRelease.artist, "/"));
      }
      if (section.sectionType === "latest_releases") {
        content.releaseGroups.forEach((group) => group.releases.forEach((release) => checks.push(...this.releaseAssetChecks(release, "/"))));
      }
      if (section.sectionType === "artist_spotlight") {
        content.spotlightArtists.forEach((item) => checks.push(this.artistImageCheck(item.artist, "/")));
      }
      const heroImage = typeof section.configuration?.heroImageUrl === "string" ? section.configuration.heroImageUrl : undefined;
      if (section.sectionType === "hero" && heroImage) {
        checks.push(this.urlCheck("homepage_section", section.sectionId, undefined, "/", "heroImageUrl", heroImage, heroImage));
      }
    }
    return checks.length ? checks : [buildPublicAssetSyncCheck({
      entityType: "homepage_section",
      entityId: "homepage",
      publicPath: "/",
      fieldKey: "homepage",
      status: "not_applicable",
      severity: "info",
      message: "No homepage asset-bearing sections are enabled.",
    })];
  }

  async checkArtistAssets(artistId?: string): Promise<PublicAssetSyncCheck[]> {
    const artists = await this.artistService.getActiveArtists();
    return artists
      .filter((artist) => (artistId ? artist.artistId === artistId : true))
      .flatMap((artist) => [
        this.artistImageCheck(artist, `/artists/${artist.slug}`),
        this.urlCheck("artist", artist.artistId, artist.slug, `/artists/${artist.slug}`, "profileThumbnailUrl", (artist as { profileThumbnailUrl?: string }).profileThumbnailUrl, (artist as { profileThumbnailUrl?: string }).profileThumbnailUrl, false),
      ]);
  }

  async checkReleaseAssets(releaseId?: string): Promise<PublicAssetSyncCheck[]> {
    const releases = await this.releaseService.getPublishedReleases();
    return releases
      .filter((release) => (releaseId ? release.releaseId === releaseId : true))
      .flatMap((release) => this.releaseAssetChecks(release, `/songs/${release.slug}`));
  }

  async checkGalleryAssets(galleryItemId?: string): Promise<PublicAssetSyncCheck[]> {
    const items = await this.galleryService.getPublishedGalleryItems();
    const adminItems = await this.galleryAdminService.listGalleryItems();
    const draftOrArchived = adminItems.ok ? adminItems.data.filter((item) => item.status !== "published") : [];
    const publicChecks = items
      .filter((item) => (galleryItemId ? item.galleryItemId === galleryItemId : true))
      .flatMap((item) => this.galleryItemChecks(item));
    const blockedChecks = draftOrArchived.map((item) => buildPublicAssetSyncCheck({
      entityType: "gallery_item",
      entityId: item.galleryItemId,
      entitySlug: item.slug,
      publicPath: "/gallery",
      fieldKey: "visibility",
      status: items.some((publicItem) => publicItem.galleryItemId === item.galleryItemId) ? "blocked" : "not_applicable",
      severity: items.some((publicItem) => publicItem.galleryItemId === item.galleryItemId) ? "blocking" : "info",
      message: items.some((publicItem) => publicItem.galleryItemId === item.galleryItemId)
        ? "Draft or archived gallery item appears in public gallery output."
        : "Draft or archived gallery item is hidden from public gallery output.",
    }));
    return [...publicChecks, ...blockedChecks];
  }

  async checkSiteConfigAssets(): Promise<PublicAssetSyncCheck[]> {
    const config = await this.siteConfigService.getSiteConfig();
    if (!config.ok) return [this.errorCheck("/admin/settings", "site_config", config.error.message)];
    return [
      this.urlCheck("site_config", "site-config", undefined, "/", "brandLogoUrl", config.data.brandLogoUrl, config.data.brandLogoUrl, false),
      this.urlCheck("site_config", "site-config", undefined, "/", "defaultCoverArtUrl", config.data.defaultCoverArtUrl, config.data.defaultCoverArtUrl, false),
      this.urlCheck("site_config", "site-config", undefined, "/", "defaultArtistImageUrl", config.data.defaultArtistImageUrl, config.data.defaultArtistImageUrl, false),
      this.urlCheck("site_config", "site-config", undefined, "/", "defaultSocialImageUrl", config.data.defaultSocialImageUrl, config.data.defaultSocialImageUrl, false),
    ];
  }

  async checkSeoSocialAssets(): Promise<PublicAssetSyncCheck[]> {
    const records = await this.metadataService.listMetadataRecords();
    if (!records.ok) return [this.errorCheck("/admin/seo", "seo_metadata", records.error.message)];
    return records.data.flatMap((record) => {
      const publicPath = record.publicPath ?? "/";
      if (record.noIndex) {
        return [buildPublicAssetSyncCheck({
          entityType: "seo_metadata",
          entityId: record.metadataRecordId,
          entitySlug: record.entitySlug,
          publicPath,
          fieldKey: "noIndex",
          status: "not_applicable",
          severity: "info",
          message: "No-index metadata does not require public social preview assets.",
        })];
      }
      return [
        this.urlCheck("seo_metadata", record.metadataRecordId, record.entitySlug, publicPath, "seoImage", record.seoMetadata?.imageUrl, record.seoMetadata?.imageUrl, false),
        this.urlCheck("social_metadata", record.metadataRecordId, record.entitySlug, publicPath, "socialImage", record.socialMetadata?.imageUrl, record.socialMetadata?.imageUrl, false),
        this.urlCheck("social_metadata", record.metadataRecordId, record.entitySlug, publicPath, "audioUrl", record.socialMetadata?.audioUrl, record.socialMetadata?.audioUrl, false, true),
      ];
    });
  }

  async checkPublicPathAssets(publicPath: string): Promise<PublicAssetSyncCheck[]> {
    if (publicPath === "/") return this.checkHomepageAssets();
    if (publicPath === "/artists") return this.checkArtistAssets();
    if (publicPath.startsWith("/artists/")) {
      const slug = publicPath.replace("/artists/", "");
      const artist = await this.artistService.getArtistBySlug(slug);
      return artist ? [this.artistImageCheck(artist, publicPath)] : [this.errorCheck(publicPath, "artist", "Artist public path was not found.")];
    }
    if (publicPath === "/songs" || publicPath === "/browse" || publicPath === "/search") return this.checkReleaseAssets();
    if (publicPath.startsWith("/songs/")) {
      const slug = publicPath.replace("/songs/", "");
      const release = await this.releaseService.getPublishedReleaseBySlug(slug);
      return release ? this.releaseAssetChecks(release, publicPath) : [this.errorCheck(publicPath, "release", "Release public path was not found.")];
    }
    if (publicPath === "/gallery") return this.checkGalleryAssets();
    if (publicPath === "/contact") return this.checkSeoSocialAssets();
    return [buildPublicAssetSyncCheck({
      entityType: "public_path",
      publicPath,
      fieldKey: "path",
      status: "not_applicable",
      severity: "info",
      message: "No asset sync rules are configured for this public path.",
    })];
  }

  async compareExpectedVsPublicMappedAssets(entityType: PublishingEntityType, entityId: string): Promise<PublicAssetSyncCheck[]> {
    if (entityType === "artist") return this.checkArtistAssets(entityId);
    if (entityType === "release") return this.checkReleaseAssets(entityId);
    if (entityType === "gallery_item") return this.checkGalleryAssets(entityId);
    return [this.errorCheck("/admin", entityType, `Entity type ${entityType} is not supported for asset comparison.`)];
  }

  buildSyncReport(checks: PublicAssetSyncCheck[]): PublicAssetSyncReport {
    const summary = summarizeAssetSyncChecks(checks);
    return {
      reportId: `public-asset-sync-${Date.now()}`,
      ...summary,
      checks,
      createdAt: new Date().toISOString(),
      metadata: {
        service: "PublicAssetSyncVerificationService",
      },
    };
  }

  private releaseAssetChecks(release: PublicSongRelease, publicPath: string): PublicAssetSyncCheck[] {
    return [
      this.urlCheck("release", release.releaseId, release.slug, publicPath, "coverArtUrl", release.coverArtUrl, release.coverArtUrl),
      this.urlCheck("release", release.releaseId, release.slug, publicPath, "audioPreviewUrl", release.audioPreviewUrl, release.audioPreviewUrl, false),
      buildPublicAssetSyncCheck({
        entityType: "release",
        entityId: release.releaseId,
        entitySlug: release.slug,
        publicPath,
        fieldKey: "fullSongUrl",
        status: (release as { fullSongUrl?: string }).fullSongUrl ? "blocked" : "not_applicable",
        severity: (release as { fullSongUrl?: string }).fullSongUrl ? "blocking" : "info",
        message: (release as { fullSongUrl?: string }).fullSongUrl
          ? "Full song URL is exposed in public release output."
          : "Full song URL is not exposed in public release output.",
      }),
    ];
  }

  private artistImageCheck(artist: ArtistPublicProfile, publicPath: string): PublicAssetSyncCheck {
    return this.urlCheck("artist", artist.artistId, artist.slug, publicPath, "profileImage", artist.profileImage, artist.profileImage, false);
  }

  private galleryItemChecks(item: PublicGalleryItem): PublicAssetSyncCheck[] {
    return [
      this.urlCheck("gallery_item", item.galleryItemId, item.slug, "/gallery", "imageUrl", item.imageUrl, item.imageUrl),
      this.urlCheck("gallery_item", item.galleryItemId, item.slug, "/gallery", "thumbnailUrl", item.thumbnailUrl, item.thumbnailUrl, false),
    ];
  }

  private urlCheck(
    entityType: PublicAssetSyncCheck["entityType"],
    entityId: string | undefined,
    entitySlug: string | undefined,
    publicPath: string,
    fieldKey: string,
    expectedUrl: string | undefined,
    actualUrl: string | undefined,
    required = true,
    shouldBeHidden = false,
  ): PublicAssetSyncCheck {
    if (shouldBeHidden) {
      return buildPublicAssetSyncCheck({
        entityType,
        entityId,
        entitySlug,
        publicPath,
        fieldKey,
        expectedUrl,
        actualUrl,
        status: actualUrl ? "blocked" : "not_applicable",
        severity: actualUrl ? "blocking" : "info",
        message: actualUrl ? `${fieldKey} should not be exposed publicly.` : `${fieldKey} is not exposed publicly.`,
      });
    }
    const safeExpected = getExpectedPublicAssetUrl(expectedUrl);
    const safeActual = getActualPublicMappedAssetUrl(actualUrl);
    const asset = this.findExpectedAsset(entityType, entityId, fieldKey, expectedUrl);
    const cdnStatus = asset ? mediaCdnService.checkCdnDelivery(asset) : undefined;
    const blockedByAsset = asset && (asset.status === "archived" || asset.metadata?.deletedAt || (asset.status !== "published" && safeActual));
    if (blockedByAsset) {
      return buildPublicAssetSyncCheck({
        entityType,
        entityId,
        entitySlug,
        publicPath,
        fieldKey,
        expectedAssetId: asset.assetId,
        expectedUrl,
        actualUrl,
        status: "blocked",
        severity: "blocking",
        message: `${fieldKey} references an archived, deleted, or draft media asset.`,
        metadata: {
          cdnStatus: cdnStatus?.status ?? null,
          cdnProvider: cdnStatus?.provider ?? null,
        },
      });
    }
    if (!expectedUrl && !actualUrl && !required) {
      return buildPublicAssetSyncCheck({
        entityType,
        entityId,
        entitySlug,
        publicPath,
        fieldKey,
        status: "not_applicable",
        severity: "info",
        message: `${fieldKey} is optional and not configured.`,
      });
    }
    return buildPublicAssetSyncCheck({
      entityType,
      entityId,
      entitySlug,
      publicPath,
      fieldKey,
      expectedAssetId: asset?.assetId,
      expectedUrl: safeExpected ?? expectedUrl,
      actualUrl: safeActual ?? actualUrl,
      status: cdnStatus?.status === "fallback_used" && safeActual ? "fallback_used" : undefined,
      metadata: {
        cdnStatus: cdnStatus?.status ?? null,
        cdnProvider: cdnStatus?.provider ?? null,
        cdnUrl: cdnStatus?.url ?? null,
      },
    });
  }

  private findExpectedAsset(
    entityType: PublicAssetSyncCheck["entityType"],
    entityId: string | undefined,
    fieldKey: string,
    url: string | undefined,
  ): MediaAssetRecord | undefined {
    const media = (adminMediaService as unknown as { records?: MediaAssetRecord[] }).records;
    if (!Array.isArray(media)) return undefined;
    return media.find((asset) =>
      (entityId && asset.ownerId === entityId) ||
      asset.url === url ||
      asset.thumbnailUrl === url ||
      asset.largeUrl === url ||
      (entityType === "site_config" && imageAssetTypes.has(asset.assetType) && fieldKey.toLowerCase().includes(asset.assetType.replace(/_/g, ""))),
    );
  }

  private errorCheck(publicPath: string, entityType: PublicAssetSyncCheck["entityType"], error: unknown): PublicAssetSyncCheck {
    return buildPublicAssetSyncCheck({
      entityType,
      publicPath,
      fieldKey: "sync",
      status: "error",
      severity: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export const publicAssetSyncVerificationService = new PublicAssetSyncVerificationService();
