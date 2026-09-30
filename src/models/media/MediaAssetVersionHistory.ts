import type { MediaAssetVersion } from "./MediaAssetVersion";

export interface MediaAssetVersionHistory {
  assetId: string;
  activeVersionId: string;
  versions: MediaAssetVersion[];
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
