export type MediaAssetDependencyEntityType =
  | "artist"
  | "release"
  | "gallery_item"
  | "homepage_section"
  | "seo_metadata"
  | "social_metadata"
  | "site_config"
  | "media_version"
  | "custom";

export type MediaAssetDependencyStatus = "active" | "draft" | "archived" | "unknown";

export interface MediaAssetDependency {
  dependencyId: string;
  assetId: string;
  entityType: MediaAssetDependencyEntityType;
  entityId: string;
  entityLabel?: string;
  fieldKey: string;
  linkId?: string;
  isPublic: boolean;
  isBlocking: boolean;
  publicPath?: string;
  status: MediaAssetDependencyStatus;
  metadata?: Record<string, string | number | boolean | null>;
}

