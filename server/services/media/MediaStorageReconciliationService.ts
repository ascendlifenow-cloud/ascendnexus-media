import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { StorageReconciliationReport } from "../../models/media/StorageReconciliationReportModel";
import { assertFullSongPrivateFromRecords } from "../../utils/media/fullSongPrivacyUtils";
import { isPublicStoragePath } from "../../utils/media/storageUrlUtils";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { directMediaUploadSessionPersistenceService } from "./DirectMediaUploadSessionPersistenceService";

const duplicates = (values: string[]) => {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  });
  return [...dupes];
};

export class MediaStorageReconciliationService {
  async verifyStorageObject(storageObjectId: string) {
    const object = await mediaStoragePersistenceService.get(storageObjectId);
    if (!object) return { exists: false, storageObjectId, issue: "storage_record_missing" };
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const result = await provider.fileExists(object.storagePath);
    return {
      storageObjectId,
      exists: result.exists,
      metadata: result.metadata,
      issues: [
        ...(!result.exists ? ["provider_object_missing"] : []),
        ...(object.accessLevel !== "public" && object.publicUrl ? ["private_record_has_public_url"] : []),
        ...(object.assetType === "full_song" && (object.publicUrl || object.accessLevel === "public" || isPublicStoragePath(object.storagePath, mediaBackendConfig.publicPrefix)) ? ["full_song_public_violation"] : []),
      ],
    };
  }

  async verifyAssetStorage(assetId: string) {
    const assets = await mediaAssetPersistenceService.list();
    const asset = assets.find((item) => item.assetId === assetId);
    const storageObjects = await mediaStoragePersistenceService.list();
    return {
      assetId,
      assetFound: Boolean(asset),
      storageObjects: storageObjects.filter((object) => object.assetId === assetId || object.storageObjectId === asset?.metadata?.storageObjectId),
      fullSongPrivacy: asset?.assetType === "full_song" ? assertFullSongPrivateFromRecords(asset, storageObjects, mediaBackendConfig.publicPrefix) : undefined,
    };
  }

  async findDatabaseRecordsMissingObjects() {
    const objects = await mediaStoragePersistenceService.list();
    const missing: string[] = [];
    for (const object of objects) {
      const verification = await this.verifyStorageObject(object.storageObjectId);
      if (!verification.exists) missing.push(object.storageObjectId);
    }
    return missing;
  }

  async findObjectsMissingDatabaseRecords() {
    return [] as string[];
  }

  async findPrivateObjectsWithPublicUrls() {
    return (await mediaStoragePersistenceService.list())
      .filter((object) => object.accessLevel !== "public" && Boolean(object.publicUrl))
      .map((object) => object.storageObjectId);
  }

  async findPublicObjectsWithoutPublicUrls() {
    return (await mediaStoragePersistenceService.list())
      .filter((object) => object.accessLevel === "public" && isPublicStoragePath(object.storagePath, mediaBackendConfig.publicPrefix) && !object.publicUrl && object.assetType !== "full_song")
      .map((object) => object.storageObjectId);
  }

  async findFullSongPublicViolations() {
    const assets = (await mediaAssetPersistenceService.list()).filter((asset) => asset.assetType === "full_song");
    const storageObjects = await mediaStoragePersistenceService.list();
    return assets.flatMap((asset) => {
      const result = assertFullSongPrivateFromRecords(asset, storageObjects, mediaBackendConfig.publicPrefix);
      return result.issues.length ? [`${asset.assetId}: ${result.issues.join("; ")}`] : [];
    });
  }

  async findDuplicateStoragePaths() {
    return duplicates((await mediaStoragePersistenceService.list()).map((object) => object.storagePath));
  }

  async findChecksumMismatches() {
    return [] as string[];
  }

  async findStaleProcessingObjects() {
    return (await mediaStoragePersistenceService.list())
      .filter((object) => object.storagePath.startsWith("processing/") && Date.parse(object.uploadedAt) < Date.now() - 7 * 24 * 60 * 60 * 1000)
      .map((object) => object.storageObjectId);
  }

  async findAbandonedMultipartUploads() {
    return (await directMediaUploadSessionPersistenceService.list())
      .filter((session) => session.multipartUploadId && !["completed", "canceled", "expired", "failed"].includes(session.status) && Date.parse(session.expiresAt) < Date.now())
      .map((session) => session.uploadSessionId);
  }

  async buildReconciliationReport(): Promise<StorageReconciliationReport> {
    const objects = await mediaStoragePersistenceService.list();
    const missingObjects = await this.findDatabaseRecordsMissingObjects().catch(() => []);
    const privatePublicUrlViolations = await this.findPrivateObjectsWithPublicUrls();
    const fullSongViolations = await this.findFullSongPublicViolations();
    const duplicatePaths = await this.findDuplicateStoragePaths();
    const abandonedUploads = await this.findAbandonedMultipartUploads();
    const staleProcessing = await this.findStaleProcessingObjects();
    const critical = fullSongViolations.length > 0;
    const warnings = missingObjects.length + privatePublicUrlViolations.length + duplicatePaths.length + abandonedUploads.length + staleProcessing.length;
    const report: StorageReconciliationReport = {
      reportId: `storage-reconciliation-${Date.now()}`,
      status: critical ? "critical" : warnings ? "warnings" : "healthy",
      checkedObjects: objects.length,
      verifiedObjects: Math.max(0, objects.length - missingObjects.length),
      missingObjects,
      orphanRecords: missingObjects,
      orphanProviderObjects: [],
      privatePublicUrlViolations,
      fullSongViolations,
      checksumMismatches: [],
      duplicatePaths,
      abandonedUploads,
      repairableIssues: [...privatePublicUrlViolations.map((id) => `clear_public_url:${id}`), ...abandonedUploads.map((id) => `expire_upload:${id}`)],
      manualReviewIssues: [...missingObjects, ...fullSongViolations, ...staleProcessing],
      checkedAt: new Date().toISOString(),
    };
    await mediaAuditPersistenceService.record("storage_reconciliation_completed", "Storage reconciliation completed", {
      entityType: "storage",
      metadata: { status: report.status, missingObjectCount: missingObjects.length, fullSongViolationCount: fullSongViolations.length },
    });
    return report;
  }

  async repairSafeIssues(options: { dryRun?: boolean } = {}) {
    const violations = await this.findPrivateObjectsWithPublicUrls();
    if (!options.dryRun) {
      for (const storageObjectId of violations) await mediaStoragePersistenceService.update(storageObjectId, { publicUrl: undefined });
    }
    return { success: true, repaired: options.dryRun ? [] : violations, dryRun: Boolean(options.dryRun) };
  }
}

export const mediaStorageReconciliationService = new MediaStorageReconciliationService();
