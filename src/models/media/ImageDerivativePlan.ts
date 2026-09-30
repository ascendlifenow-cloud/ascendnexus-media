import type { MediaAssetType } from "../admin";
import type { ImageDerivativeType } from "./ImageDerivative";

export type ImageDerivativeFit = "cover" | "contain" | "inside" | "outside";

export interface ImageDerivativePlanItem {
  type: ImageDerivativeType;
  targetWidth: number;
  targetHeight: number;
  fit: ImageDerivativeFit;
  format: string;
  quality: number;
  required: boolean;
}

export interface ImageDerivativePlan {
  assetType: MediaAssetType;
  sourceWidth?: number;
  sourceHeight?: number;
  derivatives: ImageDerivativePlanItem[];
  metadata?: Record<string, string | number | boolean | null>;
}
