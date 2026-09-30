import type { MediaPublicationEntityType } from "./MediaPublicationOperation";

export interface MediaPublicationReadinessAsset {
  assetId: string;
  assetType: string;
  required: boolean;
  classification: "required" | "optional" | "private_only" | "already_public" | "blocked" | "missing";
  processingReady: boolean;
  storageReady: boolean;
  publicReady: boolean;
  blockingIssues: string[];
  warnings: string[];
  metadata?: Record<string, unknown>;
}

export interface MediaPublicationReadiness {
  entityType: MediaPublicationEntityType;
  entityId: string;
  ready: boolean;
  processingReady: boolean;
  storageReady: boolean;
  metadataReady: boolean;
  publicMappingReady: boolean;
  requiredAssetsReady: boolean;
  optionalAssetsReady: boolean;
  blockingIssues: string[];
  warnings: string[];
  requiredAssets: MediaPublicationReadinessAsset[];
  optionalAssets: MediaPublicationReadinessAsset[];
  privateOnlyAssets: MediaPublicationReadinessAsset[];
  blockedAssets: MediaPublicationReadinessAsset[];
  missingAssets: MediaPublicationReadinessAsset[];
  checkedAt: string;
  metadata?: Record<string, unknown>;
}
