import type {
  AdminMetadataEntityType,
  AdminMetadataRecord,
  AdminMetadataStatus,
  ArtistAdminRecord,
  PublicSiteConfig,
  SongReleaseAdminRecord,
} from "../../models/admin";
import type { SeoMetadata } from "../../models/seo";
import type { SocialShareMetadata } from "../../models/social";
import { buildAdminMetadataRecords, validateAdminMetadataRecord } from "../../admin/utils/adminMetadataUtils";
import { createApiError, createApiSuccess, type ApiResult } from "../api/httpClient";
import { adminArtistService } from "./AdminArtistService";
import { adminReleaseService } from "./AdminReleaseService";
import { adminSiteConfigService } from "./AdminSiteConfigService";
import { adminApiUrl } from "./adminApiUrl";

export interface AdminMetadataFilters {
  entityType?: AdminMetadataEntityType;
  status?: AdminMetadataStatus;
}

export interface AdminMetadataService {
  listMetadataRecords(filters?: AdminMetadataFilters): Promise<ApiResult<AdminMetadataRecord[]>>;
  getMetadataRecord(metadataRecordId: string): Promise<ApiResult<AdminMetadataRecord>>;
  scanMetadata(): Promise<ApiResult<AdminMetadataRecord[]>>;
  validateMetadataRecord(record: AdminMetadataRecord): Promise<ApiResult<AdminMetadataRecord>>;
  updateSeoMetadata(entityType: AdminMetadataEntityType, entityId: string, payload: SeoMetadata): Promise<ApiResult<AdminMetadataRecord>>;
  updateSocialMetadata(entityType: AdminMetadataEntityType, entityId: string, payload: SocialShareMetadata): Promise<ApiResult<AdminMetadataRecord>>;
}

interface BackendSeoRecord {
  seoMetadataId: string;
  entityType: string;
  entityId?: string;
  path?: string;
  title: string;
  description: string;
  canonicalUrl?: string;
  imageUrl?: string;
  imageAlt?: string;
  robots?: string;
  status?: string;
  updatedAt?: string;
}

interface BackendSocialRecord {
  socialMetadataId: string;
  entityType: string;
  entityId?: string;
  path?: string;
  title: string;
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  openGraph?: Record<string, unknown>;
  twitterCard?: Record<string, unknown>;
  status?: string;
  updatedAt?: string;
}

interface MetadataApiResponse {
  success?: boolean;
  seo?: BackendSeoRecord[];
  social?: BackendSocialRecord[];
  metadata?: BackendSeoRecord | BackendSocialRecord;
  data?: BackendSeoRecord | BackendSocialRecord;
  errors?: string[];
}

const headers = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const toError = <T>(message: string, status?: number): ApiResult<T> =>
  createApiError(status === 404 ? "not_found" : status === 409 ? "conflict" : status === 403 ? "forbidden" : "server_error", message, status) as ApiResult<T>;

const request = async <T>(path: string, init: RequestInit, pick: (payload: MetadataApiResponse) => T | undefined): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(adminApiUrl(path), { credentials: "include", ...init });
    const payload = (await response.json().catch(() => ({}))) as MetadataApiResponse;
    if (!response.ok || payload.success === false) return toError(payload.errors?.join(" ") || `Metadata request failed with ${response.status}.`, response.status);
    const data = pick(payload);
    if (data === undefined) return toError("Metadata API response did not include expected data.", response.status);
    return createApiSuccess(data);
  } catch (error) {
    return toError(error instanceof Error ? error.message : "Metadata API request failed.");
  }
};

const backendEntityType = (entityType: AdminMetadataEntityType) =>
  entityType === "site_default" ? "site" : entityType === "page" ? "homepage" : entityType === "song" ? "release" : entityType;

const toSeoMetadata = (record: BackendSeoRecord): SeoMetadata => ({
  title: record.title,
  description: record.description,
  canonicalPath: record.path ?? record.canonicalUrl,
  imageUrl: record.imageUrl,
  imageAlt: record.imageAlt,
  noIndex: record.robots?.includes("noindex") ?? false,
});

const toSocialMetadata = (record: BackendSocialRecord): SocialShareMetadata => ({
  title: record.title,
  description: record.description,
  imageUrl: record.imageUrl ?? "",
  imageAlt: record.imageAlt,
  type: (record.openGraph?.type as SocialShareMetadata["type"]) ?? "website",
  twitterCard: (record.twitterCard?.card as SocialShareMetadata["twitterCard"]) ?? "summary_large_image",
});

export class ApiBackedAdminMetadataService implements AdminMetadataService {
  private async getSourceData(): Promise<{ artists: ArtistAdminRecord[]; releases: SongReleaseAdminRecord[]; siteConfig: PublicSiteConfig | undefined }> {
    const [artistsResult, releasesResult, siteConfigResult] = await Promise.all([
      adminArtistService.listArtists(),
      adminReleaseService.listReleases(),
      adminSiteConfigService.getSiteConfig(),
    ]);
    return {
      artists: artistsResult.ok ? artistsResult.data : [],
      releases: releasesResult.ok ? releasesResult.data : [],
      siteConfig: siteConfigResult.ok ? siteConfigResult.data : undefined,
    };
  }

  async listMetadataRecords(filters: AdminMetadataFilters = {}): Promise<ApiResult<AdminMetadataRecord[]>> {
    const [source, backend] = await Promise.all([
      this.getSourceData(),
      request("/api/admin/metadata", { headers: headers() }, (payload) => ({ seo: payload.seo ?? [], social: payload.social ?? [] })),
    ]);
    const records = buildAdminMetadataRecords(source.siteConfig, source.artists, source.releases);
    const backendData = backend.ok ? backend.data : { seo: [], social: [] };
    const merged = records.map((record) => {
      const type = backendEntityType(record.entityType);
      const seo = backendData.seo.find((item) => item.entityType === type && item.entityId === record.entityId) ?? backendData.seo.find((item) => item.path === record.publicPath);
      const social = backendData.social.find((item) => item.entityType === type && item.entityId === record.entityId) ?? backendData.social.find((item) => item.path === record.publicPath);
      return validateAdminMetadataRecord({
        ...record,
        metadataRecordId: seo?.seoMetadataId ?? record.metadataRecordId,
        seoMetadata: seo ? toSeoMetadata(seo) : record.seoMetadata,
        socialMetadata: social ? toSocialMetadata(social) : record.socialMetadata,
        updatedAt: seo?.updatedAt ?? social?.updatedAt ?? record.updatedAt,
      });
    })
      .filter((record) => (filters.entityType ? record.entityType === filters.entityType : true))
      .filter((record) => (filters.status ? record.status === filters.status : true));
    return createApiSuccess(merged);
  }

  async getMetadataRecord(metadataRecordId: string): Promise<ApiResult<AdminMetadataRecord>> {
    const records = await this.listMetadataRecords();
    const record = records.ok ? records.data.find((item) => item.metadataRecordId === metadataRecordId) : undefined;
    return record ? createApiSuccess(record) : createApiError("not_found", "Metadata record was not found.", 404);
  }

  scanMetadata(): Promise<ApiResult<AdminMetadataRecord[]>> {
    return this.listMetadataRecords();
  }

  async validateMetadataRecord(record: AdminMetadataRecord): Promise<ApiResult<AdminMetadataRecord>> {
    return createApiSuccess(validateAdminMetadataRecord(record));
  }

  async updateSeoMetadata(entityType: AdminMetadataEntityType, entityId: string, payload: SeoMetadata): Promise<ApiResult<AdminMetadataRecord>> {
    return this.upsertMetadata(entityType, entityId, { seoMetadata: payload });
  }

  async updateSocialMetadata(entityType: AdminMetadataEntityType, entityId: string, payload: SocialShareMetadata): Promise<ApiResult<AdminMetadataRecord>> {
    return this.upsertMetadata(entityType, entityId, { socialMetadata: payload });
  }

  private async upsertMetadata(entityType: AdminMetadataEntityType, entityId: string, patch: Partial<Pick<AdminMetadataRecord, "seoMetadata" | "socialMetadata">>): Promise<ApiResult<AdminMetadataRecord>> {
    const current = await this.listMetadataRecords();
    if (!current.ok) return current;
    const record = current.data.find((item) => item.entityType === entityType && item.entityId === entityId);
    if (!record) return createApiError("not_found", "Metadata record was not found.", 404);
    const seo = patch.seoMetadata ?? record.seoMetadata;
    const social = patch.socialMetadata ?? record.socialMetadata;
    const payload = {
      entityType: backendEntityType(entityType),
      entityId,
      path: seo?.canonicalPath ?? record.publicPath,
      title: seo?.title || social?.title || record.entityLabel,
      description: seo?.description || social?.description || record.entityLabel,
      canonicalUrl: seo?.canonicalPath,
      imageUrl: social?.imageUrl || seo?.imageUrl,
      imageAlt: social?.imageAlt || seo?.imageAlt,
      robots: seo?.noIndex ? "noindex, follow" : "index, follow",
      openGraph: { type: social?.type ?? "website", title: social?.title, description: social?.description },
      twitterCard: { card: social?.twitterCard ?? "summary_large_image", title: social?.title, description: social?.description },
    };
    const result = await request("/api/admin/metadata", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.metadata ?? response.data ?? response.seo?.[0]);
    if (!result.ok) return result as ApiResult<AdminMetadataRecord>;
    return createApiSuccess(validateAdminMetadataRecord({ ...record, ...patch, updatedAt: new Date().toISOString() }));
  }
}

export const adminMetadataService = new ApiBackedAdminMetadataService();
export { ApiBackedAdminMetadataService as SeedBackedAdminMetadataService };
