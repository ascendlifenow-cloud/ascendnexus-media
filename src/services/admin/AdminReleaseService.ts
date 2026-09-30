import type {
  ArchiveReleaseDto,
  CreateReleaseDto,
  PublishReleaseDto,
  SongReleaseAdminRecord,
  UpdateReleaseDto,
} from "../../models/admin";
import type { ReleaseStatus } from "../../models/release";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import { adminApiUrl } from "./adminApiUrl";

export interface AdminReleaseFilters {
  artistId?: string;
  status?: ReleaseStatus;
  query?: string;
}

export interface AdminReleaseService {
  listReleases(filters?: AdminReleaseFilters): Promise<ApiResult<SongReleaseAdminRecord[]>>;
  getRelease(releaseId: string): Promise<ApiResult<SongReleaseAdminRecord>>;
  createRelease(payload: CreateReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  updateRelease(releaseId: string, payload: UpdateReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  publishRelease(releaseId: string, payload?: PublishReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  republishRelease(releaseId: string, payload?: PublishReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  unpublishRelease(releaseId: string, payload?: PublishReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  archiveRelease(releaseId: string, payload?: ArchiveReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  restoreRelease(releaseId: string, payload?: ArchiveReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>>;
  deleteRelease(releaseId: string): Promise<ApiResult<{ releaseId: string }>>;
}

interface ReleaseApiResponse {
  success?: boolean;
  release?: SongReleaseAdminRecord;
  releases?: SongReleaseAdminRecord[];
  data?: SongReleaseAdminRecord | SongReleaseAdminRecord[];
  releaseId?: string;
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

const request = async <T>(path: string, init: RequestInit = {}, pick: (payload: ReleaseApiResponse) => T | undefined): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(adminApiUrl(path), { credentials: "include", ...init });
    const payload = await response.json().catch(() => ({})) as ReleaseApiResponse;
    if (!response.ok || payload.success === false) return toError(payload.errors?.join(" ") || `Release request failed with ${response.status}.`, response.status);
    const data = pick(payload);
    if (data === undefined) return toError("Release API response did not include expected data.", response.status);
    return createApiSuccess(data);
  } catch (error) {
    return toError(error instanceof Error ? error.message : "Release API request failed.");
  }
};

const queryString = (filters: AdminReleaseFilters = {}): string => {
  const params = new URLSearchParams();
  if (filters.artistId) params.set("artistId", filters.artistId);
  if (filters.status) params.set("status", filters.status);
  if (filters.query) params.set("query", filters.query);
  const value = params.toString();
  return value ? `?${value}` : "";
};

export class ApiBackedAdminReleaseService implements AdminReleaseService {
  listReleases(filters: AdminReleaseFilters = {}): Promise<ApiResult<SongReleaseAdminRecord[]>> {
    return request(`/api/admin/releases${queryString(filters)}`, { headers: headers() }, (payload) => payload.releases ?? (Array.isArray(payload.data) ? payload.data : undefined));
  }

  getRelease(releaseId: string): Promise<ApiResult<SongReleaseAdminRecord>> {
    return request(`/api/admin/releases/${encodeURIComponent(releaseId)}`, { headers: headers() }, (payload) => payload.release ?? (!Array.isArray(payload.data) ? payload.data : undefined));
  }

  createRelease(payload: CreateReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>> {
    return request("/api/admin/releases", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.release ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  updateRelease(releaseId: string, payload: UpdateReleaseDto): Promise<ApiResult<SongReleaseAdminRecord>> {
    return request(`/api/admin/releases/${encodeURIComponent(releaseId)}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.release ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  publishRelease(releaseId: string, payload: PublishReleaseDto = {}): Promise<ApiResult<SongReleaseAdminRecord>> {
    return this.postAction(releaseId, "publish", payload);
  }

  republishRelease(releaseId: string, payload: PublishReleaseDto = {}): Promise<ApiResult<SongReleaseAdminRecord>> {
    return this.postAction(releaseId, "republish", payload);
  }

  unpublishRelease(releaseId: string, payload: PublishReleaseDto = {}): Promise<ApiResult<SongReleaseAdminRecord>> {
    return this.postAction(releaseId, "unpublish", payload);
  }

  archiveRelease(releaseId: string, payload: ArchiveReleaseDto = {}): Promise<ApiResult<SongReleaseAdminRecord>> {
    return this.postAction(releaseId, "archive", payload);
  }

  restoreRelease(releaseId: string, payload: ArchiveReleaseDto = {}): Promise<ApiResult<SongReleaseAdminRecord>> {
    return this.postAction(releaseId, "restore", payload);
  }

  deleteRelease(releaseId: string): Promise<ApiResult<{ releaseId: string }>> {
    return request(`/api/admin/releases/${encodeURIComponent(releaseId)}`, {
      method: "DELETE",
      headers: headers(),
    }, (payload) => ({ releaseId: payload.releaseId ?? releaseId }));
  }

  private postAction(releaseId: string, action: string, payload: unknown): Promise<ApiResult<SongReleaseAdminRecord>> {
    return request(`/api/admin/releases/${encodeURIComponent(releaseId)}/${action}`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload ?? {}),
    }, (response) => response.release ?? (!Array.isArray(response.data) ? response.data : undefined));
  }
}

export const adminReleaseService = new ApiBackedAdminReleaseService();
export { ApiBackedAdminReleaseService as SeedBackedAdminReleaseService };
