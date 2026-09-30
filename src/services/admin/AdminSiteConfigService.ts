import type { PublicSiteConfig, UpdateSiteConfigDto } from "../../models/admin";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import { adminApiUrl } from "./adminApiUrl";

export interface SiteConfigReadiness {
  ready: boolean;
  blockingIssues: string[];
  warnings: string[];
  checkedAt: string;
}

export interface SiteConfigVersion {
  version: number;
  status: string;
  publicationState?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export interface AdminSiteConfigService {
  getSiteConfig(): Promise<ApiResult<PublicSiteConfig>>;
  updateSiteConfig(payload: UpdateSiteConfigDto): Promise<ApiResult<PublicSiteConfig>>;
  getReadiness(): Promise<ApiResult<SiteConfigReadiness>>;
  publishSiteConfig(): Promise<ApiResult<PublicSiteConfig>>;
  rollbackSiteConfig(version: number): Promise<ApiResult<PublicSiteConfig>>;
  getVersions(): Promise<ApiResult<SiteConfigVersion[]>>;
}

interface SiteConfigApiResponse {
  success?: boolean;
  siteConfig?: PublicSiteConfig;
  data?: PublicSiteConfig | SiteConfigReadiness | SiteConfigVersion[];
  readiness?: SiteConfigReadiness;
  versions?: SiteConfigVersion[];
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
  createApiError(
    status === 404 ? "not_found" : status === 409 ? "conflict" : status === 403 ? "forbidden" : "server_error",
    message,
    status,
  ) as ApiResult<T>;

const request = async <T>(
  path: string,
  init: RequestInit,
  pick: (payload: SiteConfigApiResponse) => T | undefined,
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(adminApiUrl(path), { credentials: "include", ...init });
    const payload = (await response.json().catch(() => ({}))) as SiteConfigApiResponse;
    if (!response.ok || payload.success === false) {
      return toError(payload.errors?.join(" ") || `Site configuration request failed with ${response.status}.`, response.status);
    }
    const data = pick(payload);
    if (data === undefined) return toError("Site configuration API response did not include expected data.", response.status);
    return createApiSuccess(data);
  } catch (error) {
    return toError(error instanceof Error ? error.message : "Site configuration API request failed.");
  }
};

export class ApiBackedAdminSiteConfigService implements AdminSiteConfigService {
  getSiteConfig(): Promise<ApiResult<PublicSiteConfig>> {
    return request("/api/admin/site-settings", { headers: headers() }, (payload) => payload.siteConfig ?? (payload.data as PublicSiteConfig | undefined));
  }

  updateSiteConfig(payload: UpdateSiteConfigDto): Promise<ApiResult<PublicSiteConfig>> {
    return request(
      "/api/admin/site-settings",
      {
        method: "PATCH",
        headers: headers(true),
        body: JSON.stringify(payload),
      },
      (response) => response.siteConfig ?? (response.data as PublicSiteConfig | undefined),
    );
  }

  getReadiness(): Promise<ApiResult<SiteConfigReadiness>> {
    return request(
      "/api/admin/site-settings/draft/current/readiness",
      { headers: headers() },
      (payload) => payload.readiness ?? (payload.data as SiteConfigReadiness | undefined),
    );
  }

  publishSiteConfig(): Promise<ApiResult<PublicSiteConfig>> {
    return request(
      "/api/admin/site-settings/draft/current/publish",
      { method: "POST", headers: headers(true) },
      (payload) => payload.siteConfig ?? (payload.data as PublicSiteConfig | undefined),
    );
  }

  rollbackSiteConfig(version: number): Promise<ApiResult<PublicSiteConfig>> {
    return request(
      `/api/admin/site-settings/versions/${encodeURIComponent(String(version))}/rollback`,
      { method: "POST", headers: headers(true) },
      (payload) => payload.siteConfig ?? (payload.data as PublicSiteConfig | undefined),
    );
  }

  getVersions(): Promise<ApiResult<SiteConfigVersion[]>> {
    return request("/api/admin/site-settings/versions", { headers: headers() }, (payload) => payload.versions ?? (payload.data as SiteConfigVersion[] | undefined));
  }
}

export const adminSiteConfigService = new ApiBackedAdminSiteConfigService();
export { ApiBackedAdminSiteConfigService as SeedBackedAdminSiteConfigService };
