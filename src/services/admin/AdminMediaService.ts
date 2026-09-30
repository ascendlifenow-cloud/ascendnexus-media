import { publicArtistsSeed, publicSongReleasesSeed } from "../../data";
import type {
  CreateMediaAssetDto,
  MediaAssetRecord,
  MediaAssetStatus,
  MediaAssetType,
  UpdateMediaAssetDto,
} from "../../models/admin";
import type {
  MediaAssetLink,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkIntendedUse,
} from "../../models/media";
import { validateMediaAssetRecord } from "../../utils/admin/adminValidation";
import { isSafePublicMediaUrl } from "../../utils/media/publicSafeUrlUtils";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import { recordMediaAuditEvent } from "./AdminAuditService";
import { adminApiUrl } from "./adminApiUrl";
import { dispatchMediaAssignmentChanged } from "../media/MediaAssignmentEvents";

export interface AdminMediaFilters {
  ownerId?: string;
  ownerType?: string;
  status?: MediaAssetStatus;
  assetType?: MediaAssetType;
  search?: string;
}

export interface AdminMediaService {
  listMediaAssets(filters?: AdminMediaFilters): Promise<ApiResult<MediaAssetRecord[]>>;
  getMediaAsset(assetId: string): Promise<ApiResult<MediaAssetRecord>>;
  getMediaAssetPreviewUrl(asset: MediaAssetRecord): Promise<ApiResult<string>>;
  promoteMediaAssetForPublicUse(asset: MediaAssetRecord): Promise<ApiResult<MediaAssetRecord>>;
  linkMediaAsset(assetId: string, payload: {
    entityType: MediaAssetLinkEntityType;
    entityId: string;
    fieldKey: MediaAssetLinkFieldKey;
    intendedUse?: MediaAssetLinkIntendedUse;
    updateEntityField?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResult<{ link: MediaAssetLink; mediaAsset?: MediaAssetRecord; updatedEntity?: unknown }>>;
  createMediaAsset(payload: CreateMediaAssetDto): Promise<ApiResult<MediaAssetRecord>>;
  updateMediaAsset(assetId: string, payload: UpdateMediaAssetDto): Promise<ApiResult<MediaAssetRecord>>;
  archiveMediaAsset(assetId: string): Promise<ApiResult<MediaAssetRecord>>;
  deleteMediaAsset(assetId: string): Promise<ApiResult<{ assetId: string }>>;
}

const nowIso = () => new Date().toISOString();

interface MediaApiResponse {
  success?: boolean;
  mediaAsset?: MediaAssetRecord;
  mediaAssets?: MediaAssetRecord[];
  asset?: MediaAssetRecord;
  assets?: MediaAssetRecord[];
  data?: MediaAssetRecord | MediaAssetRecord[];
  storageObject?: {
    storageObjectId?: string;
    publicUrl?: string;
    publicCdnUrl?: string;
    storagePath?: string;
    accessLevel?: string;
    metadata?: Record<string, unknown>;
  };
  assetId?: string;
  link?: MediaAssetLink;
  updatedEntity?: unknown;
  errors?: string[];
  error?: { message?: string };
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

const mediaRequest = async <T>(
  path: string,
  init: RequestInit = {},
  pick: (payload: MediaApiResponse) => T | undefined,
): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(adminApiUrl(path), { credentials: "include", ...init });
    const payload = await response.json().catch(() => ({})) as MediaApiResponse;
    if (!response.ok || payload.success === false) {
      return toError(payload.errors?.join(" ") || payload.error?.message || `Media request failed with ${response.status}.`, response.status);
    }
    const data = pick(payload);
    if (data === undefined) return toError("Media API response did not include expected data.", response.status);
    return createApiSuccess(data);
  } catch (error) {
    return toError(error instanceof Error ? error.message : "Media API request failed.");
  }
};

const mediaQueryString = (filters: AdminMediaFilters = {}): string => {
  const params = new URLSearchParams();
  if (filters.ownerId) params.set("ownerId", filters.ownerId);
  if (filters.ownerType) params.set("ownerType", filters.ownerType);
  if (filters.status) params.set("status", filters.status);
  if (filters.assetType) params.set("assetType", filters.assetType);
  if (filters.search) params.set("search", filters.search);
  const value = params.toString();
  return value ? `?${value}` : "";
};

const getAssetStorageObjectId = (asset: MediaAssetRecord): string => {
  const direct = asset.metadata?.storageObjectId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const storage = asset.metadata?.storage;
  if (storage && typeof storage === "object" && !Array.isArray(storage)) {
    const storageObjectId = storage.storageObjectId;
    if (typeof storageObjectId === "string" && storageObjectId.trim()) return storageObjectId.trim();
  }
  return "";
};

const isBrowserPreviewUrl = (value: string | undefined): value is string =>
  Boolean(value && (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")));

const isPrivateStorageReference = (value: string | undefined): boolean =>
  Boolean(value && !isBrowserPreviewUrl(value) && /^(private|processing|quarantine)\//.test(value));

const toPublicMediaBrowserUrl = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (isSafePublicMediaUrl(trimmed)) return trimmed;
  if (trimmed.startsWith("public/")) return `/uploads/media/public/${trimmed}`;
  return undefined;
};

const isPublicDeliveryMediaUrl = (value: string | undefined): value is string =>
  Boolean(value && (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public") || value.startsWith("data:image/")));

const seedMediaAssets = (): MediaAssetRecord[] => [
  ...publicArtistsSeed.map((artist) => ({
    assetId: `asset-profile-${artist.artistId}`,
    ownerType: "artist" as const,
    ownerId: artist.artistId,
    assetType: "artist_profile" as const,
    title: `${artist.displayName} profile image`,
    url: artist.profileImage,
    altText: `${artist.displayName} artist profile image`,
    status: artist.status === "active" ? ("published" as const) : ("archived" as const),
    sortOrder: artist.sortOrder,
  })),
  ...publicSongReleasesSeed.map((release, index) => ({
    assetId: `asset-cover-${release.releaseId}`,
    ownerType: "release" as const,
    ownerId: release.releaseId,
    assetType: "cover_art" as const,
    title: `${release.title} cover art`,
    url: release.coverArtUrl || "",
    altText: `${release.title} cover art`,
    status: release.status === "published" ? ("published" as const) : release.status,
    sortOrder: 1000 + index,
  })),
];

export class SeedBackedAdminMediaService implements AdminMediaService {
  private records: MediaAssetRecord[] = seedMediaAssets();

  async listMediaAssets(filters: AdminMediaFilters = {}): Promise<ApiResult<MediaAssetRecord[]>> {
    const items = this.records
      .filter((asset) => (filters.ownerId ? asset.ownerId === filters.ownerId : true))
      .filter((asset) => (filters.status ? asset.status === filters.status : true))
      .filter((asset) => (filters.assetType ? asset.assetType === filters.assetType : true))
      .sort((a, b) => (a.sortOrder ?? Number.POSITIVE_INFINITY) - (b.sortOrder ?? Number.POSITIVE_INFINITY));

    return createApiSuccess(items);
  }

  async getMediaAsset(assetId: string): Promise<ApiResult<MediaAssetRecord>> {
    const asset = this.records.find((record) => record.assetId === assetId);
    return asset ? createApiSuccess(asset) : createApiError("not_found", "Media asset was not found.", 404);
  }

  async getMediaAssetPreviewUrl(asset: MediaAssetRecord): Promise<ApiResult<string>> {
    return createApiSuccess(asset.url);
  }

  async promoteMediaAssetForPublicUse(asset: MediaAssetRecord): Promise<ApiResult<MediaAssetRecord>> {
    return createApiSuccess(asset);
  }

  async linkMediaAsset(assetId: string, payload: {
    entityType: MediaAssetLinkEntityType;
    entityId: string;
    fieldKey: MediaAssetLinkFieldKey;
    intendedUse?: MediaAssetLinkIntendedUse;
    updateEntityField?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResult<{ link: MediaAssetLink; mediaAsset?: MediaAssetRecord; updatedEntity?: unknown }>> {
    const current = this.records.find((record) => record.assetId === assetId);
    if (!current) return createApiError("not_found", "Media asset was not found.", 404);
    const updated: MediaAssetRecord = {
      ...current,
      ownerType: payload.entityType === "gallery_item" ? "gallery" : payload.entityType === "homepage_section" || payload.entityType === "site_config" ? "site" : payload.entityType === "artist" || payload.entityType === "release" ? payload.entityType : current.ownerType,
      ownerId: payload.entityId,
      metadata: {
        ...(current.metadata ?? {}),
        assignmentStatus: "assigned",
        assignedEntityType: payload.entityType,
        assignedEntityId: payload.entityId,
        assignedFieldKey: payload.fieldKey,
      },
      updatedAt: nowIso(),
    };
    this.records = this.records.map((record) => (record.assetId === assetId ? updated : record));
    dispatchMediaAssignmentChanged({
      assetId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      fieldKey: payload.fieldKey,
      mediaAsset: updated,
      source: "media_library",
    });
    return createApiSuccess({
      link: {
        linkId: `link-${Date.now()}`,
        assetId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        fieldKey: payload.fieldKey,
        intendedUse: payload.intendedUse ?? "custom",
        status: "active",
        linkedAt: nowIso(),
        metadata: {},
      },
      mediaAsset: updated,
    });
  }

  async createMediaAsset(payload: CreateMediaAssetDto): Promise<ApiResult<MediaAssetRecord>> {
    const asset: MediaAssetRecord = {
      ...payload,
      assetId: payload.assetId ?? `asset-${payload.ownerType}-${payload.ownerId}-${Date.now()}`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const validation = validateMediaAssetRecord(asset);
    if (!validation.valid) return createApiError("validation_error", validation.errors.join(" "), 400);
    if (this.records.some((record) => record.assetId === asset.assetId)) {
      return createApiError("conflict", "Media asset already exists.", 409);
    }
    this.records = [...this.records, asset];
    recordMediaAuditEvent({
      actionType: asset.status === "draft" ? "save_draft" : "upload",
      entityId: asset.assetId,
      entityLabel: asset.title,
      route: `/admin/media/${asset.assetId}/edit`,
      after: asset,
    });
    return createApiSuccess(asset);
  }

  async updateMediaAsset(assetId: string, payload: UpdateMediaAssetDto): Promise<ApiResult<MediaAssetRecord>> {
    const current = this.records.find((record) => record.assetId === assetId);
    if (!current) return createApiError("not_found", "Media asset was not found.", 404);
    const updated: MediaAssetRecord = { ...current, ...payload, assetId, updatedAt: nowIso() };
    const validation = validateMediaAssetRecord(updated);
    if (!validation.valid) return createApiError("validation_error", validation.errors.join(" "), 400);
    this.records = this.records.map((record) => (record.assetId === assetId ? updated : record));
    recordMediaAuditEvent({
      actionType: "update",
      entityId: updated.assetId,
      entityLabel: updated.title,
      route: `/admin/media/${updated.assetId}/edit`,
      before: current,
      after: updated,
    });
    return createApiSuccess(updated);
  }

  async archiveMediaAsset(assetId: string): Promise<ApiResult<MediaAssetRecord>> {
    const result = await this.updateMediaAsset(assetId, { status: "archived" });
    if (result.ok) {
      recordMediaAuditEvent({
        actionType: "archive",
        entityId: result.data.assetId,
        entityLabel: result.data.title,
        route: `/admin/media/${result.data.assetId}/edit`,
        summary: `Archived media asset "${result.data.title}"`,
        after: result.data,
      });
    }
    return result;
  }

  async deleteMediaAsset(assetId: string): Promise<ApiResult<{ assetId: string }>> {
    if (!this.records.some((record) => record.assetId === assetId)) {
      return createApiError("not_found", "Media asset was not found.", 404);
    }
    this.records = this.records.filter((record) => record.assetId !== assetId);
    return createApiSuccess({ assetId });
  }
}

export class ApiBackedAdminMediaService implements AdminMediaService {
  listMediaAssets(filters: AdminMediaFilters = {}): Promise<ApiResult<MediaAssetRecord[]>> {
    return mediaRequest(`/api/admin/media/assets${mediaQueryString(filters)}`, { headers: headers() }, (payload) =>
      payload.mediaAssets ?? payload.assets ?? (Array.isArray(payload.data) ? payload.data : undefined));
  }

  getMediaAsset(assetId: string): Promise<ApiResult<MediaAssetRecord>> {
    return mediaRequest(`/api/admin/media/assets/${encodeURIComponent(assetId)}`, { headers: headers() }, (payload) =>
      payload.mediaAsset ?? payload.asset ?? (!Array.isArray(payload.data) ? payload.data : undefined));
  }

  async getMediaAssetPreviewUrl(asset: MediaAssetRecord): Promise<ApiResult<string>> {
    const storageObjectId = getAssetStorageObjectId(asset);
    if (isBrowserPreviewUrl(asset.url) && !isPrivateStorageReference(asset.url)) return createApiSuccess(asset.url);
    const fallbackContentUrl = storageObjectId
      ? adminApiUrl(`/api/admin/media/storage/objects/${encodeURIComponent(storageObjectId)}/content`)
      : undefined;
    if (!storageObjectId && !isPrivateStorageReference(asset.url)) return asset.url ? createApiSuccess(asset.url) : toError("Media preview URL was not available.");
    const response = await mediaRequest<{ signedUrl?: string }>(`/api/admin/media/storage/signed-url?assetId=${encodeURIComponent(asset.assetId)}&purpose=admin_preview&expiration=900`, {
      method: "GET",
      headers: headers(),
    }, (payload) => ({ signedUrl: typeof (payload as MediaApiResponse & { signedUrl?: unknown }).signedUrl === "string" ? (payload as MediaApiResponse & { signedUrl: string }).signedUrl : undefined }));

    if (!response.ok) return fallbackContentUrl ? createApiSuccess(fallbackContentUrl) : toError(response.error.message, response.error.status);

    const signedUrl = response.data.signedUrl;
    if (!signedUrl) return fallbackContentUrl ? createApiSuccess(fallbackContentUrl) : toError("Media preview URL was not available.");
    if (signedUrl.includes("/api/admin/media/storage/signed-url")) {
      return fallbackContentUrl ? createApiSuccess(fallbackContentUrl) : toError("Local media preview stream was not available.");
    }
    return createApiSuccess(signedUrl);
  }

  async promoteMediaAssetForPublicUse(asset: MediaAssetRecord): Promise<ApiResult<MediaAssetRecord>> {
    const storageObjectId = getAssetStorageObjectId(asset);
    if (!storageObjectId) return createApiSuccess(asset);
    const promoteResult = await mediaRequest<MediaApiResponse["storageObject"]>(`/api/admin/media/storage/objects/${encodeURIComponent(storageObjectId)}/promote-public`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ reason: "Assign watched-folder visual asset to public content" }),
    }, (payload) => payload.storageObject);
    if (!promoteResult.ok) return promoteResult as ApiResult<MediaAssetRecord>;
    const refreshed = await this.getMediaAsset(asset.assetId);
    const metadataPublicCdnUrl = typeof promoteResult.data?.metadata?.publicCdnUrl === "string"
      ? promoteResult.data.metadata.publicCdnUrl
      : undefined;
    const publicUrl = [
      metadataPublicCdnUrl,
      promoteResult.data?.publicCdnUrl,
      promoteResult.data?.publicUrl,
      toPublicMediaBrowserUrl(promoteResult.data?.storagePath),
    ]
      .map((value) => value?.trim() ?? "")
      .find(isPublicDeliveryMediaUrl);
    if (!refreshed.ok) {
      return publicUrl ? createApiSuccess({ ...asset, url: publicUrl, thumbnailUrl: publicUrl, largeUrl: publicUrl }) : refreshed;
    }
    if (publicUrl && !isPublicDeliveryMediaUrl(refreshed.data.url)) {
      return createApiSuccess({
        ...refreshed.data,
        url: publicUrl,
        thumbnailUrl: isPublicDeliveryMediaUrl(refreshed.data.thumbnailUrl) ? refreshed.data.thumbnailUrl : publicUrl,
        largeUrl: isPublicDeliveryMediaUrl(refreshed.data.largeUrl) ? refreshed.data.largeUrl : publicUrl,
        metadata: {
          ...(refreshed.data.metadata ?? {}),
          publicStorageObjectId: promoteResult.data?.storageObjectId ?? refreshed.data.metadata?.publicStorageObjectId ?? null,
          publicUrl,
          publicCdnUrl: publicUrl,
        },
      });
    }
    return refreshed;
  }

  async linkMediaAsset(assetId: string, payload: {
    entityType: MediaAssetLinkEntityType;
    entityId: string;
    fieldKey: MediaAssetLinkFieldKey;
    intendedUse?: MediaAssetLinkIntendedUse;
    updateEntityField?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResult<{ link: MediaAssetLink; mediaAsset?: MediaAssetRecord; updatedEntity?: unknown }>> {
    const result = await mediaRequest(`/api/admin/media/assets/${encodeURIComponent(assetId)}/links`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.link ? { link: response.link, mediaAsset: response.mediaAsset ?? response.asset, updatedEntity: response.updatedEntity } : undefined);
    if (result.ok) {
      dispatchMediaAssignmentChanged({
        assetId,
        entityType: payload.entityType,
        entityId: payload.entityId,
        fieldKey: payload.fieldKey,
        mediaAsset: result.data.mediaAsset,
        source: "media_library",
      });
    }
    return result;
  }

  createMediaAsset(payload: CreateMediaAssetDto): Promise<ApiResult<MediaAssetRecord>> {
    return mediaRequest("/api/admin/media/assets", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.mediaAsset ?? response.asset ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  updateMediaAsset(assetId: string, payload: UpdateMediaAssetDto): Promise<ApiResult<MediaAssetRecord>> {
    return mediaRequest(`/api/admin/media/assets/${encodeURIComponent(assetId)}`, {
      method: "PATCH",
      headers: headers(true),
      body: JSON.stringify(payload),
    }, (response) => response.mediaAsset ?? response.asset ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  archiveMediaAsset(assetId: string): Promise<ApiResult<MediaAssetRecord>> {
    return mediaRequest(`/api/admin/media/assets/${encodeURIComponent(assetId)}/archive`, {
      method: "POST",
      headers: headers(true),
      body: "{}",
    }, (response) => response.mediaAsset ?? response.asset ?? (!Array.isArray(response.data) ? response.data : undefined));
  }

  deleteMediaAsset(assetId: string): Promise<ApiResult<{ assetId: string }>> {
    return mediaRequest(`/api/admin/media/assets/${encodeURIComponent(assetId)}`, {
      method: "DELETE",
      headers: headers(),
    }, (payload) => ({ assetId: payload.assetId ?? assetId }));
  }
}

export const adminMediaService = new ApiBackedAdminMediaService();
