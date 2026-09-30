import { mediaBackendConfig } from "../config/mediaBackendConfig";
import { getBackendConfig } from "../config/backendConfig";
import type { BackendStorageProviderAdapter } from "./StorageProviderAdapter";
import { LocalStorageAdapter } from "./adapters/LocalStorageAdapter";
import { MockStorageAdapter } from "./adapters/MockStorageAdapter";
import { S3StorageAdapter } from "./adapters/S3StorageAdapter";
import { CloudflareR2StorageAdapter } from "./adapters/CloudflareR2StorageAdapter";
import { SupabaseStorageAdapter } from "./adapters/SupabaseStorageAdapter";
import { FirebaseStorageAdapter } from "./adapters/FirebaseStorageAdapter";

export class BackendStorageProviderRegistry {
  private readonly providers = new Map<string, BackendStorageProviderAdapter>();

  constructor() {
    this.register(new LocalStorageAdapter());
    this.register(new MockStorageAdapter());
    this.register(new S3StorageAdapter());
    this.register(new CloudflareR2StorageAdapter());
    this.register(new SupabaseStorageAdapter());
    this.register(new FirebaseStorageAdapter());
  }

  register(provider: BackendStorageProviderAdapter): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  getActiveProvider(): BackendStorageProviderAdapter {
    const config = getBackendConfig();
    if ((config.app.isProduction || config.app.isStaging) && ["local", "mock"].includes(mediaBackendConfig.provider)) {
      throw new Error(`Production storage provider "${mediaBackendConfig.provider}" is not allowed.`);
    }
    const configured = this.providers.get(mediaBackendConfig.provider);
    if (configured?.isConfigured()) return configured;
    if ((config.app.isProduction || config.app.isStaging || process.env.NODE_ENV === "production") && !mediaBackendConfig.allowMockFallback) {
      throw new Error(`Configured storage provider "${mediaBackendConfig.provider}" is not available.`);
    }
    return this.providers.get("local") as BackendStorageProviderAdapter;
  }

  listProviderNames(): string[] {
    return [...this.providers.keys()];
  }
}

export const backendStorageProviderRegistry = new BackendStorageProviderRegistry();
