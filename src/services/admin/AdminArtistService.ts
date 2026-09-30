import type {
  ArtistAdminRecord,
  CreateArtistDto,
  UpdateArtistDto,
} from "../../models/admin";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import { adminApiUrl } from "./adminApiUrl";

export interface AdminArtistService {
  listArtists(): Promise<ApiResult<ArtistAdminRecord[]>>;
  getArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>>;
  createArtist(payload: CreateArtistDto): Promise<ApiResult<ArtistAdminRecord>>;
  updateArtist(artistId: string, payload: UpdateArtistDto): Promise<ApiResult<ArtistAdminRecord>>;
  publishArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>>;
  unpublishArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>>;
  archiveArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>>;
  restoreArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>>;
  deleteArtist(artistId: string): Promise<ApiResult<{ artistId: string }>>;
}

interface ArtistApiResponse {
  success?: boolean;
  artist?: ArtistAdminRecord;
  artists?: ArtistAdminRecord[];
  data?: ArtistAdminRecord | ArtistAdminRecord[];
  artistId?: string;
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

const request = async <T>(path: string, init: RequestInit = {}, pick: (payload: ArtistApiResponse) => T | undefined): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(adminApiUrl(path), { credentials: "include", ...init });
    const payload = await response.json().catch(() => ({})) as ArtistApiResponse;
    if (!response.ok || payload.success === false) return toError(payload.errors?.join(" ") || `Artist request failed with ${response.status}.`, response.status);
    const data = pick(payload);
    if (data === undefined) return toError("Artist API response did not include expected data.", response.status);
    return createApiSuccess(data);
  } catch (error) {
    return toError(error instanceof Error ? error.message : "Artist API request failed.");
  }
};

export class ApiBackedAdminArtistService implements AdminArtistService {
  listArtists(): Promise<ApiResult<ArtistAdminRecord[]>> {
    return request("/api/admin/artists", { headers: headers() }, (payload) => payload.artists ?? (Array.isArray(payload.data) ? payload.data : undefined));
  }

  getArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>> {
    return request(`/api/admin/artists/${encodeURIComponent(artistId)}`, { headers: headers() }, (payload) => payload.artist ?? (!Array.isArray(payload.data) ? payload.data : undefined));
  }

  createArtist(payload: CreateArtistDto): Promise<ApiResult<ArtistAdminRecord>> {
    return request("/api/admin/artists", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.artist ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  updateArtist(artistId: string, payload: UpdateArtistDto): Promise<ApiResult<ArtistAdminRecord>> {
    return request(`/api/admin/artists/${encodeURIComponent(artistId)}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.artist ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  publishArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>> {
    return this.postAction(artistId, "publish");
  }

  unpublishArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>> {
    return this.postAction(artistId, "unpublish");
  }

  archiveArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>> {
    return this.postAction(artistId, "archive");
  }

  restoreArtist(artistId: string): Promise<ApiResult<ArtistAdminRecord>> {
    return this.postAction(artistId, "restore");
  }

  deleteArtist(artistId: string): Promise<ApiResult<{ artistId: string }>> {
    return request(`/api/admin/artists/${encodeURIComponent(artistId)}`, {
      method: "DELETE",
      headers: headers(),
    }, (payload) => ({ artistId: payload.artistId ?? artistId }));
  }

  private postAction(artistId: string, action: string): Promise<ApiResult<ArtistAdminRecord>> {
    return request(`/api/admin/artists/${encodeURIComponent(artistId)}/${action}`, {
      method: "POST",
      headers: headers(true),
    }, (payload) => payload.artist ?? (!Array.isArray(payload.data) ? payload.data : undefined));
  }
}

export const adminArtistService = new ApiBackedAdminArtistService();
export { ApiBackedAdminArtistService as SeedBackedAdminArtistService };
