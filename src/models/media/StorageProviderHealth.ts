import type { StorageProviderName } from "./MediaStorageObject";

export interface StorageProviderHealth {
  provider: StorageProviderName;
  enabled: boolean;
  configured: boolean;
  available: boolean;
  message?: string;
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}
