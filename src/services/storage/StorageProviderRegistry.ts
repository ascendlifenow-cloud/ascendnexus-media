import type { StorageProviderConfig, StorageProviderName } from "../../models/media";
import { CloudflareR2StorageAdapter } from "./CloudflareR2StorageAdapter";
import { CustomApiStorageAdapter } from "./CustomApiStorageAdapter";
import { FirebaseStorageAdapter } from "./FirebaseStorageAdapter";
import { LocalStorageAdapter } from "./LocalStorageAdapter";
import { MockStorageAdapter } from "./MockStorageAdapter";
import { S3StorageAdapter } from "./S3StorageAdapter";
import type { StorageProviderAdapter } from "./StorageProviderAdapter";
import { SupabaseStorageAdapter } from "./SupabaseStorageAdapter";

export class StorageProviderRegistry {
  private readonly providers = new Map<StorageProviderName, StorageProviderAdapter>();
  private activeProviderName: StorageProviderName;

  constructor(activeProviderName: StorageProviderName = "mock") {
    this.activeProviderName = activeProviderName;
  }

  registerProvider(provider: StorageProviderAdapter): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  getProvider(providerName: StorageProviderName): StorageProviderAdapter | null {
    return this.providers.get(providerName) ?? null;
  }

  getActiveProvider(): StorageProviderAdapter {
    const active = this.getProvider(this.activeProviderName);
    if (active?.isEnabled()) return active;
    const mock = this.getProvider("mock");
    if (mock) return mock;
    throw new Error("No enabled storage provider is registered.");
  }

  listProviders(): StorageProviderAdapter[] {
    return [...this.providers.values()];
  }

  setActiveProvider(providerName: StorageProviderName): boolean {
    if (!this.validateProvider(providerName)) return false;
    this.activeProviderName = providerName;
    return true;
  }

  validateProvider(providerName: StorageProviderName): boolean {
    const provider = this.getProvider(providerName);
    return Boolean(provider?.isEnabled());
  }
}

export const createStorageProviderRegistry = (config: StorageProviderConfig): StorageProviderRegistry => {
  const registry = new StorageProviderRegistry(config.provider);
  registry.registerProvider(new MockStorageAdapter({ ...config, provider: "mock", enabled: config.mockEnabled !== false }));
  registry.registerProvider(new LocalStorageAdapter({ ...config, provider: "local" }));
  registry.registerProvider(new CustomApiStorageAdapter({ ...config, provider: "custom" }));
  registry.registerProvider(new S3StorageAdapter({ ...config, provider: "s3" }));
  registry.registerProvider(new CloudflareR2StorageAdapter({ ...config, provider: "r2" }));
  registry.registerProvider(new SupabaseStorageAdapter({ ...config, provider: "supabase" }));
  registry.registerProvider(new FirebaseStorageAdapter({ ...config, provider: "firebase" }));
  if (!registry.validateProvider(config.provider)) registry.setActiveProvider("mock");
  return registry;
};
