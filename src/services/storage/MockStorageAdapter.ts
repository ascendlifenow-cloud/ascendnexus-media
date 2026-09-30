import type { StorageProviderConfig } from "../../models/media";
import { safeJoinStoragePath } from "../../utils/media/storagePathUtils";
import type {
  SignedUrlOptions,
  StorageUploadOptions,
} from "./StorageProviderAdapter";
import { BaseStorageProviderAdapter, type StorageProviderUploadResponse } from "./StorageProviderAdapter";

export class MockStorageAdapter extends BaseStorageProviderAdapter {
  private readonly storedPaths = new Set<string>();

  getProviderName() {
    return "mock" as const;
  }

  constructor(private readonly config: StorageProviderConfig) {
    super();
  }

  async uploadFile(file: File, storagePath: string, options: StorageUploadOptions = {}): Promise<StorageProviderUploadResponse> {
    if (options.metadata?.simulateFailure) {
      throw new Error("Mock upload failure requested.");
    }
    options.onProgress?.(18);
    options.onProgress?.(64);
    this.storedPaths.add(storagePath);
    options.onProgress?.(100);
    return this.normalizeUploadResponse({
      storagePath,
      publicUrl: this.getPublicUrl(storagePath),
      signedUrl: await this.getSignedUrl(storagePath),
      bucket: this.config.bucket,
      checksum: `mock-${file.size}-${file.name.length}`,
      metadata: {
        mockUpload: true,
        fileSizeBytes: file.size,
      },
    }, file);
  }

  async deleteFile(storagePath: string): Promise<boolean> {
    return this.storedPaths.delete(storagePath);
  }

  getPublicUrl(storagePath: string): string | undefined {
    const baseUrl = this.config.baseUrl ?? "/mock-storage";
    return safeJoinStoragePath(baseUrl, storagePath);
  }

  async getSignedUrl(storagePath: string, options: SignedUrlOptions = {}): Promise<string | undefined> {
    const expires = options.expiresInSeconds ?? 900;
    return `${this.getPublicUrl(storagePath)}?mockSigned=true&expires=${expires}`;
  }

  async fileExists(storagePath: string): Promise<boolean> {
    return this.storedPaths.has(storagePath);
  }

  isEnabled(): boolean {
    return this.config.enabled !== false;
  }

  async getHealthStatus() {
    return {
      provider: this.getProviderName(),
      enabled: this.isEnabled(),
      configured: true,
      available: this.isEnabled(),
      message: "Mock storage is available for development uploads.",
      checkedAt: new Date().toISOString(),
      metadata: { storedPathCount: this.storedPaths.size },
    };
  }
}
