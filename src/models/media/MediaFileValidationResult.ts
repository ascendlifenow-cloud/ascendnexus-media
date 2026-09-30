import type { MediaAssetType } from "../admin";
import type { MediaCategory } from "./MediaStorageObject";
import type { MediaValidationMessage } from "./MediaValidationMessage";

export interface MediaFileValidationResult {
  valid: boolean;
  blockingErrors: MediaValidationMessage[];
  warnings: MediaValidationMessage[];
  info: MediaValidationMessage[];
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  fileExtension: string;
  mediaCategory: MediaCategory;
  assetType: MediaAssetType;
  metadata?: Record<string, string | number | boolean | null>;
}
