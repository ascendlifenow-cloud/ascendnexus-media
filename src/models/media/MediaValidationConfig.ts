import type { MediaAssetType } from "../admin";
import type { MediaCategory } from "./MediaStorageObject";

export interface MediaDimensionRule {
  minWidth?: number;
  minHeight?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;
  aspectRatio?: number;
  aspectRatioTolerance?: number;
  blockBelowMinimum?: boolean;
}

export interface MediaDurationRule {
  minSeconds?: number;
  maxSeconds?: number;
}

export interface MediaValidationConfig {
  maxFileSizeByAssetType: Partial<Record<MediaAssetType, number>>;
  allowedMimeTypesByCategory: Partial<Record<MediaCategory, string[]>>;
  allowedExtensionsByCategory: Partial<Record<MediaCategory, string[]>>;
  dimensionRulesByAssetType: Partial<Record<MediaAssetType, MediaDimensionRule>>;
  durationRulesByAssetType: Partial<Record<MediaAssetType, MediaDurationRule>>;
  allowSvg: boolean;
  allowGif: boolean;
  allowUnknownMime: boolean;
  strictMimeExtensionMatch: boolean;
  metadata?: Record<string, string | number | boolean | null>;
}
