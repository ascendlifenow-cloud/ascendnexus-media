import type { StorageProviderConfig } from "../../models/media";
import { safeJoinStoragePath } from "../../utils/media/storagePathUtils";
import type {
  SignedUrlOptions,
  StorageUploadOptions,
} from "./StorageProviderAdapter";
import { BaseStorageProviderAdapter, type StorageProviderUploadResponse } from "./StorageProviderAdapter";

export class LocalStorageAdapter extends BaseStorageProviderAdapter {
  constructor(private readonly config: StorageProviderConfig) {
    super();
  }

  getProviderName() {
    return "local" as const;
  }

  isEnabled(): boolean {
    return this.config.enabled !== false && Boolean(this.config.uploadApiBaseUrl);
  }

  async uploadFile(file: File, storagePath: string, options: StorageUploadOptions = {}): Promise<StorageProviderUploadResponse> {
    if (!this.config.uploadApiBaseUrl) {
      return this.normalizeUploadResponse({
        success: false,
        storagePath,
        errors: ["Local storage requires a backend upload endpoint before files can be written."],
        warnings: ["Set VITE_MEDIA_UPLOAD_API_BASE_URL or use the mock storage provider for development uploads."],
        metadata: {
          localAdapterReady: true,
          requiresBackendWrite: true,
        },
      }, file);
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("storagePath", storagePath);
    formData.append("accessLevel", options.accessLevel ?? "admin_only");
    formData.append("metadata", JSON.stringify(options.metadata ?? {}));
    const response = await fetch(safeJoinStoragePath(this.config.uploadApiBaseUrl, "/api/admin/media/upload"), {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error(`Local storage upload failed with status ${response.status}.`);
    const payload = await response.json() as Partial<StorageProviderUploadResponse>;
    return this.normalizeUploadResponse({
      ...payload,
      storagePath,
      publicUrl: payload.publicUrl ?? this.getPublicUrl(storagePath),
      signedUrl: payload.signedUrl ?? await this.getSignedUrl(storagePath),
      bucket: this.config.bucket,
      checksum: payload.checksum ?? payload.etag,
      metadata: {
        ...(payload.metadata ?? {}),
        localAdapterReady: true,
        requiresBackendWrite: true,
      },
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
    return safeJoinStoragePath(this.config.baseUrl ?? "/uploads", storagePath);
  }

  async getSignedUrl(storagePath: string, options: SignedUrlOptions = {}): Promise<string | undefined> {
    if (!this.config.uploadApiBaseUrl) return undefined;
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(safeJoinStoragePath(this.config.uploadApiBaseUrl, "/api/admin/media/storage/signed-url"), origin);
    url.searchParams.set("storagePath", storagePath);
    if (options.expiresInSeconds) url.searchParams.set("expiresInSeconds", String(options.expiresInSeconds));
    const response = await fetch(url);
    if (!response.ok) return undefined;
    const payload = await response.json() as { signedUrl?: string };
    return payload.signedUrl;
  }

  async fileExists(): Promise<boolean> {
    return false;
  }

  async getHealthStatus() {
    return {
      provider: this.getProviderName(),
      enabled: this.isEnabled(),
      configured: Boolean(this.config.uploadApiBaseUrl),
      available: this.isEnabled(),
      message: this.config.uploadApiBaseUrl
        ? "Local storage backend endpoint configured."
        : "Local storage requires a backend upload endpoint.",
      checkedAt: new Date().toISOString(),
      metadata: { requiresBackendWrite: true },
    };
  }
}
