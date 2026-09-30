import type { MediaAssetMetadataValue } from "../admin";
import type { ImageDerivativeType } from "./ImageDerivative";

export interface CdnAssetUrl {
  originalUrl: string;
  cdnUrl?: string;
  publicUrl: string;
  assetId?: string;
  versionId?: string;
  derivativeType?: ImageDerivativeType;
  width?: number;
  height?: number;
  format?: string;
  quality?: number;
  cacheKey?: string;
  fallbackUrl?: string;
  metadata?: Record<string, MediaAssetMetadataValue>;
}
