import type { MediaAssetMetadataValue } from "../admin";
import type { MediaCdnProvider } from "./MediaCdnConfig";

export type CdnDeliveryStatusValue = "ready" | "missing" | "failed" | "fallback_used" | "not_configured" | "unknown";

export interface CdnDeliveryStatus {
  assetId: string;
  url: string;
  status: CdnDeliveryStatusValue;
  provider: MediaCdnProvider;
  checkedAt: string;
  message?: string;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
