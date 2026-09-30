import type { MediaAssetDependency } from "./MediaAssetDependency";

export type MediaLifecycleActionType = "archive" | "restore" | "soft_delete" | "hard_delete";

export interface MediaDeletionReadiness {
  assetId: string;
  actionType: MediaLifecycleActionType;
  allowed: boolean;
  blockingDependencies: MediaAssetDependency[];
  warnings: string[];
  safeToArchive: boolean;
  safeToDelete: boolean;
  publiclyReferenced: boolean;
  linkedCount: number;
  activeVersionCount: number;
  checkedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

