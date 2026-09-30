export type ImageOrientation = "square" | "portrait" | "landscape" | "wide" | "unknown";

export interface ImageAssetMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: ImageOrientation;
  format?: string;
  fileSizeBytes?: number;
  dominantColor?: string;
  blurDataUrl?: string;
  hasTransparency?: boolean;
  createdAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
