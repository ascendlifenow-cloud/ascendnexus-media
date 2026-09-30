import type { MediaAssetLinkIntendedUse } from "./MediaAssetLink";

export interface MediaAssetLinkOptions {
  intendedUse: MediaAssetLinkIntendedUse;
  replaceExisting?: boolean;
  updateEntityField?: boolean;
  preservePreviousLink?: boolean;
  publicSafetyCheck?: boolean;
  linkedBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
