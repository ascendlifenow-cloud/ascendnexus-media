import type { CreateGalleryItemDto, UpdateGalleryItemDto } from "../../models/admin";
import type { GalleryMediaType, GallerySourceType, GalleryStatus, PublicGalleryItem } from "../../models/gallery";
import { createApiError, createApiSuccess, type ApiResult } from "../api/httpClient";
import { adminApiUrl } from "./adminApiUrl";

export interface AdminGalleryFilters {
  mediaType?: GalleryMediaType;
  sourceType?: GallerySourceType;
  status?: GalleryStatus;
  search?: string;
}

export interface AdminGalleryService {
  listGalleryItems(filters?: AdminGalleryFilters): Promise<ApiResult<PublicGalleryItem[]>>;
  getGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>>;
  createGalleryItem(payload: CreateGalleryItemDto): Promise<ApiResult<PublicGalleryItem>>;
  updateGalleryItem(galleryItemId: string, payload: UpdateGalleryItemDto): Promise<ApiResult<PublicGalleryItem>>;
  publishGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>>;
  republishGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>>;
  unpublishGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>>;
  archiveGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>>;
  restoreGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>>;
  deleteGalleryItem(galleryItemId: string): Promise<ApiResult<{ galleryItemId: string }>>;
  reorderGalleryItems(items: Array<{ galleryItemId: string; sortOrder: number }>): Promise<ApiResult<PublicGalleryItem[]>>;
  syncFromMediaLibrary(): Promise<ApiResult<PublicGalleryItem[]>>;
}

interface GalleryApiResponse {
  success?: boolean;
  galleryItem?: PublicGalleryItem;
  galleryItems?: PublicGalleryItem[];
  data?: PublicGalleryItem | PublicGalleryItem[];
  galleryItemId?: string;
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

const request = async <T>(path: string, init: RequestInit = {}, pick: (payload: GalleryApiResponse) => T | undefined): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(adminApiUrl(path), { credentials: "include", ...init });
    const payload = await response.json().catch(() => ({})) as GalleryApiResponse;
    if (!response.ok || payload.success === false) return toError(payload.errors?.join(" ") || `Gallery request failed with ${response.status}.`, response.status);
    const data = pick(payload);
    if (data === undefined) return toError("Gallery API response did not include expected data.", response.status);
    return createApiSuccess(data);
  } catch (error) {
    return toError(error instanceof Error ? error.message : "Gallery API request failed.");
  }
};

const queryString = (filters: AdminGalleryFilters = {}): string => {
  const params = new URLSearchParams();
  if (filters.mediaType) params.set("mediaType", filters.mediaType);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const value = params.toString();
  return value ? `?${value}` : "";
};

export class ApiBackedAdminGalleryService implements AdminGalleryService {
  async listGalleryItems(filters: AdminGalleryFilters = {}): Promise<ApiResult<PublicGalleryItem[]>> {
    return request(`/api/admin/gallery${queryString(filters)}`, { headers: headers() }, (payload) => payload.galleryItems ?? (Array.isArray(payload.data) ? payload.data : undefined));
  }

  async getGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>> {
    return request(`/api/admin/gallery/${encodeURIComponent(galleryItemId)}`, { headers: headers() }, (payload) => payload.galleryItem ?? (!Array.isArray(payload.data) ? payload.data : undefined));
  }

  async createGalleryItem(payload: CreateGalleryItemDto): Promise<ApiResult<PublicGalleryItem>> {
    return request("/api/admin/gallery", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.galleryItem ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  async updateGalleryItem(galleryItemId: string, payload: UpdateGalleryItemDto): Promise<ApiResult<PublicGalleryItem>> {
    return request(`/api/admin/gallery/${encodeURIComponent(galleryItemId)}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.galleryItem ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  publishGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>> {
    return this.postAction(galleryItemId, "publish");
  }

  republishGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>> {
    return this.postAction(galleryItemId, "republish");
  }

  unpublishGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>> {
    return this.postAction(galleryItemId, "unpublish");
  }

  async archiveGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>> {
    return this.postAction(galleryItemId, "archive");
  }

  async restoreGalleryItem(galleryItemId: string): Promise<ApiResult<PublicGalleryItem>> {
    return this.postAction(galleryItemId, "restore");
  }

  async deleteGalleryItem(galleryItemId: string): Promise<ApiResult<{ galleryItemId: string }>> {
    return request(`/api/admin/gallery/${encodeURIComponent(galleryItemId)}`, {
      method: "DELETE",
      headers: headers(),
    }, (payload) => ({ galleryItemId: payload.galleryItemId ?? galleryItemId }));
  }

  async reorderGalleryItems(items: Array<{ galleryItemId: string; sortOrder: number }>): Promise<ApiResult<PublicGalleryItem[]>> {
    return request("/api/admin/gallery/reorder", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ items }),
    }, (payload) => payload.galleryItems ?? (Array.isArray(payload.data) ? payload.data : undefined));
  }

  async syncFromMediaLibrary(): Promise<ApiResult<PublicGalleryItem[]>> {
    return this.listGalleryItems();
  }

  private postAction(galleryItemId: string, action: string): Promise<ApiResult<PublicGalleryItem>> {
    return request(`/api/admin/gallery/${encodeURIComponent(galleryItemId)}/${action}`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({}),
    }, (response) => response.galleryItem ?? (!Array.isArray(response.data) ? response.data : undefined));
  }
}

export const adminGalleryService = new ApiBackedAdminGalleryService();
export { ApiBackedAdminGalleryService as SeedBackedAdminGalleryService };
