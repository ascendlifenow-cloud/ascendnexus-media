import type { StorageProviderConfig, StorageProviderHealth, StorageProviderName } from "../../models/media";
import { safeJoinStoragePath } from "../../utils/media/storagePathUtils";
import { BaseStorageProviderAdapter, type SignedUrlOptions, type StorageProviderUploadResponse, type StorageUploadOptions } from "./StorageProviderAdapter";

export class CustomApiStorageAdapter extends BaseStorageProviderAdapter {
  constructor(private readonly config: StorageProviderConfig) {
    super();
  }

  getProviderName(): StorageProviderName {
    return "custom";
  }

  isEnabled(): boolean {
    return this.config.enabled !== false && Boolean(this.config.uploadApiBaseUrl);
  }

  async uploadFile(file: File, storagePath: string, options: StorageUploadOptions = {}): Promise<StorageProviderUploadResponse> {
    if (!this.config.uploadApiBaseUrl) throw new Error("Custom API storage is not configured.");
    const metadata = options.metadata ?? {};
    const formData = new FormData();
    formData.append("file", file);
    formData.append("accessLevel", options.accessLevel ?? "admin_only");
    formData.append("targetType", typeof metadata.targetType === "string" ? metadata.targetType : "media_library");
    if (typeof metadata.targetId === "string") formData.append("targetId", metadata.targetId);
    if (typeof metadata.ownerType === "string") formData.append("ownerType", metadata.ownerType);
    if (typeof metadata.ownerId === "string") formData.append("ownerId", metadata.ownerId);
    formData.append("assetType", typeof metadata.assetType === "string" ? metadata.assetType : "custom");
    formData.append("intendedUse", typeof metadata.intendedUse === "string" ? metadata.intendedUse : "custom_api_upload");
    if (typeof metadata.title === "string") formData.append("title", metadata.title);
    if (typeof metadata.description === "string") formData.append("description", metadata.description);
    if (typeof metadata.altText === "string") formData.append("altText", metadata.altText);
    if (typeof metadata.credit === "string") formData.append("credit", metadata.credit);
    formData.append("metadata", JSON.stringify(metadata));
    const headers: HeadersInit = {};
    const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(safeJoinStoragePath(this.config.uploadApiBaseUrl, "/api/admin/media/upload"), {
      method: "POST",
      headers,
      body: formData,
    });
    if (!response.ok) throw new Error(`Custom API upload failed with status ${response.status}.`);
    const payload = await response.json() as {
      storageObject?: Partial<StorageProviderUploadResponse> & { storagePath?: string };
      publicUrl?: string;
      warnings?: string[];
      errors?: string[];
    };
    const storageObject = payload.storageObject ?? {};
    return this.normalizeUploadResponse({
      ...storageObject,
      success: !payload.errors?.length,
      storagePath: storageObject.storagePath ?? storagePath,
      publicUrl: payload.publicUrl ?? storageObject.publicUrl,
      warnings: payload.warnings,
      errors: payload.errors,
    }, file);
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    if (!this.config.uploadApiBaseUrl) return false;
    const response = await fetch(safeJoinStoragePath(this.config.uploadApiBaseUrl, "/api/admin/media/storage"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath }),
    });
    return response.ok;
  }

  getPublicUrl(storagePath: string): string | undefined {
    return this.config.baseUrl ? safeJoinStoragePath(this.config.baseUrl, storagePath) : undefined;
  }

  async getSignedUrl(storagePath: string, options: SignedUrlOptions = {}): Promise<string | undefined> {
    if (!this.config.uploadApiBaseUrl) return undefined;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(safeJoinStoragePath(this.config.uploadApiBaseUrl, "/api/admin/media/storage/signed-url"), origin);
    url.searchParams.set("storagePath", storagePath);
    if (options.expiresInSeconds) url.searchParams.set("expiresInSeconds", String(options.expiresInSeconds));
    const headers: HeadersInit = {};
    const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) return undefined;
    const payload = await response.json() as { signedUrl?: string };
    return payload.signedUrl;
  }

  async fileExists(): Promise<boolean> {
    return false;
  }

  async getHealthStatus(): Promise<StorageProviderHealth> {
    return {
      provider: this.getProviderName(),
      enabled: this.isEnabled(),
      configured: Boolean(this.config.uploadApiBaseUrl),
      available: this.isEnabled(),
      message: this.config.uploadApiBaseUrl ? "Custom API storage endpoint configured." : "Custom API storage endpoint missing.",
      checkedAt: new Date().toISOString(),
      metadata: { uploadApiBaseUrlConfigured: Boolean(this.config.uploadApiBaseUrl) },
    };
  }
}
