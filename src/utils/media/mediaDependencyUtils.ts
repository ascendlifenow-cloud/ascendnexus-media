import type { MediaAssetRecord } from "../../models/admin";
import type { MediaAssetDependency, MediaAssetLink } from "../../models/media";

const publicEntityTypes = new Set(["artist", "release", "gallery_item", "homepage_section", "seo_metadata", "social_metadata", "site_config"]);

const getDependencyStatus = (asset: MediaAssetRecord, link: MediaAssetLink): MediaAssetDependency["status"] => {
  if (asset.status === "archived") return "archived";
  if (asset.status === "draft") return "draft";
  if (link.status === "active") return "active";
  return "unknown";
};

const getPublicPath = (link: MediaAssetLink): string | undefined => {
  if (link.entityType === "artist") return `/artists/${link.entityId}`;
  if (link.entityType === "release") return `/songs/${link.entityId}`;
  if (link.entityType === "gallery_item") return "/gallery";
  if (link.entityType === "homepage_section") return "/";
  if (link.entityType === "seo_metadata" || link.entityType === "social_metadata") return link.entityId ? `/${link.entityId}` : "/";
  return undefined;
};

export const getMediaAssetDependencies = (
  asset: MediaAssetRecord,
  links: readonly MediaAssetLink[],
): MediaAssetDependency[] =>
  links
    .filter((link) => link.assetId === asset.assetId)
    .map((link) => {
      const isActive = link.status === "active";
      const isPublic = isActive && asset.status === "published" && publicEntityTypes.has(link.entityType);
      return {
        dependencyId: `dependency-${link.linkId}`,
        assetId: asset.assetId,
        entityType: link.entityType,
        entityId: link.entityId,
        entityLabel: `${link.entityType.replace(/_/g, " ")} ${link.entityId}`,
        fieldKey: link.fieldKey,
        linkId: link.linkId,
        isPublic,
        isBlocking: isActive && (isPublic || asset.status === "published"),
        publicPath: isPublic ? getPublicPath(link) : undefined,
        status: getDependencyStatus(asset, link),
        metadata: {
          intendedUse: link.intendedUse,
          linkStatus: link.status,
        },
      };
    });

export const getMediaPublicReferences = (dependencies: readonly MediaAssetDependency[]): MediaAssetDependency[] =>
  dependencies.filter((dependency) => dependency.isPublic);

export const isMediaAssetPubliclyReferenced = (dependencies: readonly MediaAssetDependency[]): boolean =>
  getMediaPublicReferences(dependencies).length > 0;
