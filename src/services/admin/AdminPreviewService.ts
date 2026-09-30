import type { HomepageSectionConfig } from "../../models/homepage";
import type {
  AdminMetadataRecord,
  ArtistAdminRecord,
  PublicSiteConfig,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { PublicGalleryItem } from "../../models/gallery";
import type { ArtistPublicProfile } from "../../models/artist";
import type { PublicSongRelease } from "../../models/release";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import { SeedBackedAdminArtistService } from "./AdminArtistService";
import { SeedBackedAdminGalleryService } from "./AdminGalleryService";
import { SeedBackedAdminMetadataService } from "./AdminMetadataService";
import { SeedBackedAdminReleaseService } from "./AdminReleaseService";
import { SeedBackedAdminSiteConfigService } from "./AdminSiteConfigService";
import {
  buildHomepagePreviewContent,
  buildPreviewReadiness,
  mapAdminArtistToPreviewProfile,
  mapAdminGalleryItemToPreviewItem,
  mapAdminHomepageConfigToPreviewConfig,
  mapAdminReleaseToPreviewRelease,
  type AdminPreviewReadiness,
} from "../../admin/utils/adminPreviewUtils";
import type { HomepageContent } from "../../models/homepage";
import { recordPreviewAuditEvent } from "./AdminAuditService";

export interface ArtistPreviewData {
  entityType: "artist";
  artist: ArtistAdminRecord;
  previewArtist: ArtistPublicProfile;
  releases: PublicSongRelease[];
  readiness: AdminPreviewReadiness;
}

export interface ReleasePreviewData {
  entityType: "release";
  release: SongReleaseAdminRecord;
  previewRelease: PublicSongRelease;
  artist?: ArtistAdminRecord;
  previewArtist?: ArtistPublicProfile;
  moreFromArtist: PublicSongRelease[];
  readiness: AdminPreviewReadiness;
}

export interface GalleryPreviewData {
  entityType: "gallery";
  item: PublicGalleryItem;
  previewItem: PublicGalleryItem;
  artist?: ArtistAdminRecord;
  release?: SongReleaseAdminRecord;
  readiness: AdminPreviewReadiness;
}

export interface HomepagePreviewData {
  entityType: "homepage";
  siteConfig: PublicSiteConfig;
  sections: HomepageSectionConfig[];
  content: HomepageContent;
  readiness: AdminPreviewReadiness;
}

export interface MetadataPreviewData {
  entityType: "metadata";
  record: AdminMetadataRecord;
  readiness: AdminPreviewReadiness;
}

export type AdminPreviewData =
  | ArtistPreviewData
  | ReleasePreviewData
  | GalleryPreviewData
  | HomepagePreviewData
  | MetadataPreviewData;

export class AdminPreviewService {
  constructor(
    private readonly artistService = new SeedBackedAdminArtistService(),
    private readonly releaseService = new SeedBackedAdminReleaseService(),
    private readonly galleryService = new SeedBackedAdminGalleryService(),
    private readonly siteConfigService = new SeedBackedAdminSiteConfigService(),
    private readonly metadataService = new SeedBackedAdminMetadataService(),
  ) {}

  async getArtistPreview(artistId: string): Promise<ApiResult<ArtistPreviewData>> {
    const [artistResult, releasesResult] = await Promise.all([
      this.artistService.getArtist(artistId),
      this.releaseService.listReleases({ artistId }),
    ]);
    if (!artistResult.ok) return artistResult;

    const artist = artistResult.data;
    const releases = releasesResult.ok
      ? releasesResult.data.map(mapAdminReleaseToPreviewRelease).sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
      : [];

    recordPreviewAuditEvent("artist", {
      entityId: artist.artistId,
      entityLabel: artist.displayName,
      entitySlug: artist.slug,
      route: `/admin/preview/artist/${artist.artistId}`,
      summary: `Previewed artist "${artist.displayName}"`,
    });

    return createApiSuccess({
      entityType: "artist",
      artist,
      previewArtist: mapAdminArtistToPreviewProfile(artist),
      releases,
      readiness: buildPreviewReadiness("artist", artist),
    });
  }

  async getReleasePreview(releaseId: string): Promise<ApiResult<ReleasePreviewData>> {
    const releaseResult = await this.releaseService.getRelease(releaseId);
    if (!releaseResult.ok) return releaseResult;

    const release = releaseResult.data;
    const [artistResult, moreResult] = await Promise.all([
      this.artistService.getArtist(release.artistId),
      this.releaseService.listReleases({ artistId: release.artistId }),
    ]);
    const artist = artistResult.ok ? artistResult.data : undefined;
    const moreFromArtist = moreResult.ok
      ? moreResult.data
          .filter((item) => item.releaseId !== release.releaseId)
          .map(mapAdminReleaseToPreviewRelease)
          .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
          .slice(0, 3)
      : [];

    recordPreviewAuditEvent("release", {
      entityId: release.releaseId,
      entityLabel: release.title,
      entitySlug: release.slug,
      route: `/admin/preview/release/${release.releaseId}`,
      summary: `Previewed release "${release.title}"`,
    });

    return createApiSuccess({
      entityType: "release",
      release,
      previewRelease: mapAdminReleaseToPreviewRelease(release),
      artist,
      previewArtist: artist ? mapAdminArtistToPreviewProfile(artist) : undefined,
      moreFromArtist,
      readiness: buildPreviewReadiness("release", release, { artist }),
    });
  }

  async getGalleryPreview(galleryItemId: string): Promise<ApiResult<GalleryPreviewData>> {
    const itemResult = await this.galleryService.getGalleryItem(galleryItemId);
    if (!itemResult.ok) return itemResult;

    const item = itemResult.data;
    const [artistResult, releaseResult] = await Promise.all([
      item.artistId ? this.artistService.getArtist(item.artistId) : Promise.resolve(undefined),
      item.releaseId ? this.releaseService.getRelease(item.releaseId) : Promise.resolve(undefined),
    ]);
    const artist = artistResult && "ok" in artistResult && artistResult.ok ? artistResult.data : undefined;
    const release = releaseResult && "ok" in releaseResult && releaseResult.ok ? releaseResult.data : undefined;

    recordPreviewAuditEvent("gallery_item", {
      entityId: item.galleryItemId,
      entityLabel: item.title,
      entitySlug: item.slug,
      route: `/admin/preview/gallery/${item.galleryItemId}`,
      summary: `Previewed gallery item "${item.title}"`,
    });

    return createApiSuccess({
      entityType: "gallery",
      item,
      previewItem: mapAdminGalleryItemToPreviewItem(item),
      artist,
      release,
      readiness: buildPreviewReadiness("gallery", item, { artist, release }),
    });
  }

  async getHomepagePreview(): Promise<ApiResult<HomepagePreviewData>> {
    const [siteConfigResult, artistsResult, releasesResult] = await Promise.all([
      this.siteConfigService.getSiteConfig(),
      this.artistService.listArtists(),
      this.releaseService.listReleases(),
    ]);
    if (!siteConfigResult.ok) return siteConfigResult;

    const siteConfig = siteConfigResult.data;
    recordPreviewAuditEvent("site_config", {
      entityId: "homepage",
      entityLabel: siteConfig.siteName,
      route: "/admin/preview/homepage",
      summary: "Previewed homepage configuration",
    });

    return createApiSuccess({
      entityType: "homepage",
      siteConfig,
      sections: mapAdminHomepageConfigToPreviewConfig(siteConfig),
      content: buildHomepagePreviewContent(
        artistsResult.ok ? artistsResult.data : [],
        releasesResult.ok ? releasesResult.data : [],
      ),
      readiness: buildPreviewReadiness("homepage", siteConfig),
    });
  }

  async getMetadataPreview(metadataRecordId: string): Promise<ApiResult<MetadataPreviewData>> {
    const recordResult = await this.metadataService.getMetadataRecord(metadataRecordId);
    if (!recordResult.ok) return recordResult;

    const record = recordResult.data;
    recordPreviewAuditEvent("seo_metadata", {
      entityId: record.metadataRecordId,
      entityLabel: record.entityLabel,
      entitySlug: record.entitySlug,
      route: `/admin/preview/metadata/${record.metadataRecordId}`,
      summary: `Previewed metadata "${record.entityLabel}"`,
    });

    return createApiSuccess({
      entityType: "metadata",
      record,
      readiness: buildPreviewReadiness("metadata", record),
    });
  }

  buildPreviewReadiness = buildPreviewReadiness;
}

export const adminPreviewService = new AdminPreviewService();
