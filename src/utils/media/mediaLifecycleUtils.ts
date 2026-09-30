import type { MediaAssetRecord } from "../../models/admin";
import type {
  MediaAssetDependency,
  MediaDeletionPolicy,
  MediaDeletionReadiness,
  MediaLifecycleActionType,
} from "../../models/media";

export const defaultMediaDeletionPolicy: MediaDeletionPolicy = {
  policyId: "default-media-deletion-policy",
  allowArchive: true,
  allowRestore: true,
  allowSoftDelete: true,
  allowHardDelete: false,
  requireDependencyCheck: true,
  blockIfPubliclyReferenced: true,
  blockIfActiveVersion: true,
  blockIfLinked: true,
  allowDeleteArchivedOnly: true,
};

export const isMediaAssetSoftDeleted = (asset: MediaAssetRecord | null | undefined): boolean =>
  Boolean(asset?.metadata?.deletedAt);

export const formatMediaLifecycleStatus = (asset: MediaAssetRecord | null | undefined): string => {
  if (!asset) return "Missing";
  if (isMediaAssetSoftDeleted(asset)) return "Soft Deleted";
  if (asset.status === "archived") return "Archived";
  if (asset.status === "published") return "Published";
  return "Draft";
};

export const getMediaLifecycleActionLabel = (actionType: MediaLifecycleActionType): string => {
  if (actionType === "archive") return "Archive Asset";
  if (actionType === "restore") return "Restore Asset";
  if (actionType === "soft_delete") return "Soft Delete Asset";
  return "Hard Delete Readiness";
};

export const buildMediaDeletionReadiness = (
  asset: MediaAssetRecord,
  actionType: MediaLifecycleActionType,
  dependencies: readonly MediaAssetDependency[],
  policy: MediaDeletionPolicy = defaultMediaDeletionPolicy,
  activeVersionCount = 0,
): MediaDeletionReadiness => {
  const activeDependencies = dependencies.filter((dependency) => dependency.status === "active");
  const publicDependencies = dependencies.filter((dependency) => dependency.isPublic);
  const blockingDependencies = dependencies.filter((dependency) => dependency.isBlocking);
  const warnings: string[] = [];
  const softDeleted = isMediaAssetSoftDeleted(asset);

  if (publicDependencies.length) warnings.push(`Asset is publicly referenced in ${publicDependencies.length} location${publicDependencies.length === 1 ? "" : "s"}.`);
  if (activeDependencies.length) warnings.push(`Asset has ${activeDependencies.length} active link${activeDependencies.length === 1 ? "" : "s"}.`);
  if (activeVersionCount > 0) warnings.push(`Asset has ${activeVersionCount} active media version${activeVersionCount === 1 ? "" : "s"}.`);
  if (actionType === "hard_delete" && !policy.allowHardDelete) warnings.push("Hard delete is disabled until backend storage deletion is explicitly enabled.");

  const blocksByPublicReference = policy.blockIfPubliclyReferenced && publicDependencies.length > 0;
  const blocksByLinks = policy.blockIfLinked && activeDependencies.length > 0;
  const blocksByActiveVersion = policy.blockIfActiveVersion && activeVersionCount > 0;
  const archivedRequired = policy.allowDeleteArchivedOnly && actionType !== "archive" && actionType !== "restore" && asset.status !== "archived";
  const actionBlocked =
    (actionType === "archive" && (!policy.allowArchive || asset.status === "archived" || softDeleted || blocksByPublicReference)) ||
    (actionType === "restore" && (!policy.allowRestore || asset.status !== "archived" || softDeleted)) ||
    (actionType === "soft_delete" && (!policy.allowSoftDelete || archivedRequired || blocksByPublicReference || blocksByLinks || blocksByActiveVersion)) ||
    (actionType === "hard_delete" && (!policy.allowHardDelete || archivedRequired || blocksByPublicReference || blocksByLinks || blocksByActiveVersion));

  return {
    assetId: asset.assetId,
    actionType,
    allowed: !actionBlocked,
    blockingDependencies,
    warnings,
    safeToArchive: policy.allowArchive && asset.status !== "archived" && !softDeleted && !blocksByPublicReference,
    safeToDelete: policy.allowSoftDelete && !archivedRequired && !blocksByPublicReference && !blocksByLinks && !blocksByActiveVersion,
    publiclyReferenced: publicDependencies.length > 0,
    linkedCount: activeDependencies.length,
    activeVersionCount,
    checkedAt: new Date().toISOString(),
    metadata: {
      status: asset.status,
      softDeleted,
      policyId: policy.policyId,
      hardDeleteEnabled: policy.allowHardDelete,
    },
  };
};

export const canArchiveMediaAsset = (readiness: MediaDeletionReadiness): boolean =>
  readiness.actionType === "archive" && readiness.allowed;

export const canRestoreMediaAsset = (readiness: MediaDeletionReadiness): boolean =>
  readiness.actionType === "restore" && readiness.allowed;

export const canDeleteMediaAsset = (readiness: MediaDeletionReadiness): boolean =>
  (readiness.actionType === "soft_delete" || readiness.actionType === "hard_delete") && readiness.allowed;

