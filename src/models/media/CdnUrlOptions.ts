import type { MediaAssetMetadataValue } from "../admin";
import type { ImageDerivativeType } from "./ImageDerivative";
import type { MediaCategory } from "./MediaStorageObject";

export interface CdnUrlOptions {
  width?: number;
  height?: number;
  format?: string;
  quality?: number;
  derivativeType?: ImageDerivativeType;
  preferDerivative: boolean;
  fallbackAllowed: boolean;
  cacheBust: boolean;
  mediaCategory?: MediaCategory;
  publicPlaybackAllowed?: boolean;
  metadata?: Record<string, MediaAssetMetadataValue>;
}

export const defaultCdnUrlOptions: CdnUrlOptions = {
  preferDerivative: true,
  fallbackAllowed: true,
  cacheBust: true,
};
