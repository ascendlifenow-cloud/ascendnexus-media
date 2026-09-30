export type ImageDerivativeType =
  | "thumbnail"
  | "card"
  | "feature"
  | "hero"
  | "banner"
  | "social"
  | "blur_placeholder"
  | "original"
  | "custom";

export type ImageDerivativeStatus = "planned" | "processing" | "ready" | "failed" | "skipped";

export interface ImageDerivative {
  derivativeId: string;
  type: ImageDerivativeType;
  url?: string;
  storagePath?: string;
  width: number;
  height: number;
  format: string;
  quality?: number;
  status: ImageDerivativeStatus;
  metadata?: Record<string, string | number | boolean | null>;
}
