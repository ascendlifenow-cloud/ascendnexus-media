import type { MediaAssetMetadataValue } from "../admin";
import type { MediaCdnProvider } from "./MediaCdnConfig";

export type CdnInvalidationStatus = "pending" | "submitted" | "completed" | "failed" | "skipped";

export interface CdnInvalidationRequest {
  requestId: string;
  assetId: string;
  paths: string[];
  provider: MediaCdnProvider;
  status: CdnInvalidationStatus;
  requestedAt: string;
  completedAt?: string;
  errors?: string[];
  metadata?: Record<string, MediaAssetMetadataValue>;
}
