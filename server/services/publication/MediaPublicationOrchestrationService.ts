import type {
  MediaAsset,
  MediaPublicationActionType,
  MediaPublicationEntityType,
  MediaPublicationOperation,
  MediaPublicationOptions,
  MediaPublicationResult,
} from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { mediaAssetPersistenceService } from "../media/MediaAssetPersistenceService";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";
import { mediaPublicationReadinessService } from "./MediaPublicationReadinessService";
import { mediaPublicationPersistenceService } from "./MediaPublicationPersistenceService";
import { mediaPublicationRollbackService } from "./MediaPublicationRollbackService";
import { publicAssetSyncVerificationService } from "./PublicAssetSyncVerificationService";
import { publishedContentSynchronizationService } from "../public/PublishedContentSynchronizationService";
import { adminArtistService } from "../artists/AdminArtistService";
import { adminReleaseService } from "../releases/AdminReleaseService";
import { adminGalleryService } from "../gallery/AdminGalleryService";
import { adminSiteConfigurationService } from "../site/AdminSiteConfigurationService";
import { adminMetadataService } from "../metadata/AdminMetadataService";
import { publicArtistService } from "../public/PublicArtistService";
import { publicReleaseService } from "../public/PublicReleaseService";
import { publicGalleryDeliveryService } from "../public/PublicGalleryDeliveryService";
import { publicHomepageDeliveryService } from "../public/PublicHomepageDeliveryService";
import { publicMetadataDeliveryService } from "../public/PublicMetadataDeliveryService";
import { buildPublicationPublicStoragePath } from "../../utils/publication/publicationStoragePathUtils";
import { createPublicationError, normalizePublicationErrorMessage } from "../../utils/publication/publicationErrorUtils";
import { createPublicationStages, updatePublicationStage } from "../../utils/publication/publicationStageUtils";

const defaultOptions: Required<Omit<MediaPublicationOptions, "metadata">> = {
  waitForRequiredProcessing: true,
  promoteOptionalAssets: true,
  updateEntityFields: true,
  activateCdn: true,
  runSyncVerification: true,
  rollbackOnRequiredFailure: true,
  preservePreviousPublicVersion: true,
  allowFallbacks: true,
};

const completionActions = new Set<MediaPublicationActionType>(["unpublish", "archive"]);
const contentEntityTypes = new Set<MediaPublicationEntityType>(["artist", "release", "gallery_item", "homepage", "site_config", "site_configuration", "metadata", "seo_metadata", "social_metadata"]);
const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export class MediaPublicationOrchestrationService {
  async createPublicationOperation(
    entityType: MediaPublicationEntityType,
    entityId: string,
    actionType: MediaPublicationActionType,
    options: MediaPublicationOptions = {},
    requestedBy?: string,
  ): Promise<MediaPublicationOperation> {
    const targetVersion = typeof options.metadata?.targetVersion === "string" ? options.metadata.targetVersion : undefined;
    const existing = await mediaPublicationPersistenceService.findLatestMatchingOperation(entityType, entityId, actionType, targetVersion);
    if (existing) return existing;
    const now = new Date().toISOString();
    const publicationOperationId = `publication-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const readiness = contentEntityTypes.has(entityType) && !["publish", "republish", "activate"].includes(actionType)
      ? this.lifecycleBypassReadiness(entityType, entityId, actionType)
      : await this.validatePublicationReadiness(entityType, entityId, options);
    const operation: MediaPublicationOperation = {
      publicationOperationId,
      entityType,
      entityId,
      actionType,
      status: "requested",
      currentStage: "entity_validation",
      requestedAssetIds: [...readiness.requiredAssets, ...readiness.optionalAssets, ...readiness.privateOnlyAssets].map((asset) => asset.assetId),
      requiredAssetIds: readiness.requiredAssets.map((asset) => asset.assetId),
      optionalAssetIds: readiness.optionalAssets.map((asset) => asset.assetId),
      promotedAssetIds: [],
      failedAssetIds: [],
      blockedAssetIds: readiness.blockedAssets.map((asset) => asset.assetId),
      processingJobIds: [],
      storageOperationJobIds: [],
      cdnInvalidationRequestIds: [],
      blockingIssues: readiness.blockingIssues,
      warnings: readiness.warnings,
      errors: [],
      requestedBy,
      requestedAt: now,
      stages: createPublicationStages(publicationOperationId),
      metadata: {
        options: { ...defaultOptions, ...options },
        readinessCheckedAt: readiness.checkedAt,
        targetVersion,
        idempotencyKey: `${entityType}:${entityId}:${actionType}:${targetVersion ?? "current"}`,
      },
    };
    await mediaPublicationPersistenceService.createOperation(operation);
    await mediaPublicationPersistenceService.acquireLock({
      lockId: `publication-lock-${publicationOperationId}`,
      entityType,
      entityId,
      publicationOperationId,
      actionType,
      acquiredAt: now,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      status: "active",
    });
    await mediaAuditPersistenceService.record("media_publication_requested", `Requested ${actionType} for ${entityType} ${entityId}`, {
      actorId: requestedBy,
      entityType: "media_publication_operation",
      entityId: publicationOperationId,
      metadata: { publicationEntityType: entityType, publicationEntityId: entityId, actionType },
    });
    return operation;
  }

  getPublicationOperation(publicationOperationId: string) {
    return mediaPublicationPersistenceService.getOperation(publicationOperationId);
  }

  listPublicationOperations(filters: Parameters<typeof mediaPublicationPersistenceService.listOperations>[0] = {}) {
    return mediaPublicationPersistenceService.listOperations(filters);
  }

  validatePublicationReadiness(entityType: MediaPublicationEntityType, entityId: string, options: MediaPublicationOptions = {}) {
    if (contentEntityTypes.has(entityType)) return this.validateContentPublicationReadiness(entityType, entityId, options);
    return mediaPublicationReadinessService.validatePublicationReadiness(entityType, entityId, options);
  }

  async startPublication(publicationOperationId: string): Promise<MediaPublicationOperation> {
    const operation = await mediaPublicationPersistenceService.getOperation(publicationOperationId);
    if (!operation) throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_FOUND", message: "Publication operation was not found.", retryable: false, publicationOperationId });
    if (contentEntityTypes.has(operation.entityType)) return this.startContentPublication(operation);
    if (completionActions.has(operation.actionType)) return this.hideEntityMedia(operation);
    if (operation.actionType === "restore") return this.restoreEntityMedia(operation.entityType, operation.entityId, { metadata: { publicationOperationId } });
    if (operation.actionType === "rollback") return mediaPublicationRollbackService.rollbackPublication(operation);

    let current = await mediaPublicationPersistenceService.updateOperation(publicationOperationId, {
      status: "validating",
      startedAt: operation.startedAt ?? new Date().toISOString(),
      stages: updatePublicationStage(operation, "entity_validation", "completed", { progress: 100 }).stages,
    }) ?? operation;
    await mediaAuditPersistenceService.record("media_publication_started", `Started media publication for ${operation.entityType} ${operation.entityId}`, {
      actorId: operation.requestedBy,
      entityType: "media_publication_operation",
      entityId: operation.publicationOperationId,
    });

    const readiness = await mediaPublicationReadinessService.validatePublicationReadiness(operation.entityType, operation.entityId, this.resolveOptions(operation));
    current = await this.patchStage(current, "asset_validation", readiness.blockingIssues.length ? "blocked" : "completed", readiness.blockingIssues, readiness.warnings);
    if (readiness.blockingIssues.length) return this.blockOrRollback(current, readiness.blockingIssues);

    current = await this.patchStage(current, "processing_readiness", readiness.processingReady ? "completed" : "blocked", readiness.processingReady ? [] : ["Required processing is pending or failed."], readiness.warnings);
    if (!readiness.processingReady) return this.blockOrRollback(current, ["Required processing is pending or failed."]);

    current = await mediaPublicationPersistenceService.updateOperation(current.publicationOperationId, { status: "promoting_storage", currentStage: "storage_promotion" }) ?? current;
    const promoted = await this.promoteAssets(current, [...readiness.requiredAssets, ...(this.resolveOptions(current).promoteOptionalAssets ? readiness.optionalAssets : [])].map((asset) => asset.assetId));
    current = await mediaPublicationPersistenceService.updateOperation(current.publicationOperationId, {
      promotedAssetIds: promoted.promotedAssetIds,
      failedAssetIds: promoted.failedAssetIds,
      warnings: unique([...current.warnings, ...promoted.warnings]),
      errors: unique([...current.errors, ...promoted.errors]),
      stages: updatePublicationStage(current, "storage_promotion", promoted.errors.length ? "failed" : "completed", { progress: 100, warnings: promoted.warnings, errors: promoted.errors }).stages,
    }) ?? current;
    if (promoted.errors.length && promoted.failedAssetIds.some((assetId) => current.requiredAssetIds.includes(assetId))) return this.blockOrRollback(current, promoted.errors);

    current = await this.patchStage(current, "derivative_promotion", "skipped", [], ["Derivative promotion is readiness-only until derivative storage records are available."]);
    current = await this.patchStage(current, "record_update", "completed");
    current = await this.patchStage(current, "cdn_activation", this.resolveOptions(current).activateCdn ? "completed" : "skipped");
    current = await this.patchStage(current, "cdn_invalidation", "skipped", [], ["Versioned public URLs minimize invalidation needs."]);

    const publicUrls = await this.collectPublicUrls(current.promotedAssetIds);
    const syncReport = this.resolveOptions(current).runSyncVerification ? await publicAssetSyncVerificationService.verifyPublication(current, publicUrls) : undefined;
    current = await mediaPublicationPersistenceService.updateOperation(current.publicationOperationId, {
      status: syncReport && !syncReport.success ? "failed" : current.warnings.length ? "completed_with_warnings" : "completed",
      currentStage: syncReport && !syncReport.success ? "public_sync_verification" : "complete",
      syncReportId: syncReport?.syncReportId,
      completedAt: syncReport?.success === false ? undefined : new Date().toISOString(),
      failedAt: syncReport?.success === false ? new Date().toISOString() : undefined,
      errors: syncReport?.success === false ? [...current.errors, ...syncReport.blockingIssues] : current.errors,
      stages: updatePublicationStage(
        updatePublicationStage(current, "public_sync_verification", syncReport?.success === false ? "failed" : "completed", { progress: 100, errors: syncReport?.blockingIssues }),
        "complete",
        syncReport?.success === false ? "blocked" : "completed",
        { progress: syncReport?.success === false ? 0 : 100 },
      ).stages,
      metadata: { ...(current.metadata ?? {}), syncReport, publicUrls },
    }) ?? current;
    await mediaAuditPersistenceService.record(current.status === "completed_with_warnings" ? "media_publication_completed_with_warnings" : current.status === "completed" ? "media_publication_completed" : "media_publication_failed", `Media publication ${current.status} for ${current.entityType} ${current.entityId}`, {
      actorId: current.requestedBy,
      entityType: "media_publication_operation",
      entityId: current.publicationOperationId,
      metadata: { promotedAssetIds: current.promotedAssetIds, failedAssetIds: current.failedAssetIds },
    });
    if (current.status === "completed" || current.status === "completed_with_warnings") await publishedContentSynchronizationService.synchronizePublicationOperation(current);
    await mediaPublicationPersistenceService.releaseLock(current.publicationOperationId);
    return current;
  }

  async publishEntityMedia(entityType: MediaPublicationEntityType, entityId: string, options: MediaPublicationOptions = {}, requestedBy?: string) {
    return this.startPublication((await this.createPublicationOperation(entityType, entityId, "publish", options, requestedBy)).publicationOperationId);
  }

  async unpublishEntityMedia(entityType: MediaPublicationEntityType, entityId: string, options: MediaPublicationOptions = {}, requestedBy?: string) {
    return this.startPublication((await this.createPublicationOperation(entityType, entityId, "unpublish", options, requestedBy)).publicationOperationId);
  }

  async archiveEntityMedia(entityType: MediaPublicationEntityType, entityId: string, options: MediaPublicationOptions = {}, requestedBy?: string) {
    return this.startPublication((await this.createPublicationOperation(entityType, entityId, "archive", options, requestedBy)).publicationOperationId);
  }

  async restoreEntityMedia(entityType: MediaPublicationEntityType, entityId: string, options: MediaPublicationOptions = {}) {
    const assets = (await mediaAssetPersistenceService.list()).filter((asset) => asset.ownerType === entityType && asset.ownerId === entityId);
    for (const asset of assets) {
      await mediaAssetPersistenceService.patch(asset.assetId, {
        status: "draft",
        metadata: { ...(asset.metadata ?? {}), publicationState: "ready_to_publish", restoreRequestedAt: new Date().toISOString(), ...(options.metadata ?? {}) },
      });
    }
    const operationId = typeof options.metadata?.publicationOperationId === "string" ? options.metadata.publicationOperationId : undefined;
    if (operationId) {
      const operation = await mediaPublicationPersistenceService.updateOperation(operationId, { status: "completed", completedAt: new Date().toISOString(), currentStage: "complete" });
      if (operation) return operation;
    }
    return this.createPublicationOperation(entityType, entityId, "restore", options);
  }

  async getPublicationHealth() {
    const [operations, locks, syncHealth] = await Promise.all([
      mediaPublicationPersistenceService.listOperations(),
      mediaPublicationPersistenceService.listLocks(),
      publishedContentSynchronizationService.getHealth(),
    ]);
    const activeStatuses = new Set(["requested", "validating", "waiting_for_processing", "promoting_storage", "updating_records", "activating_delivery", "verifying_sync", "rolling_back"]);
    return {
      status: operations.some((operation) => operation.status === "failed" || operation.status === "blocked") ? "degraded" : "ok",
      totalOperations: operations.length,
      activeOperations: operations.filter((operation) => activeStatuses.has(operation.status)).length,
      failedOperations: operations.filter((operation) => operation.status === "failed" || operation.status === "blocked").length,
      completedOperations: operations.filter((operation) => operation.status === "completed" || operation.status === "completed_with_warnings").length,
      activeLocks: locks.filter((lock) => lock.status === "active" && lock.expiresAt > new Date().toISOString()).length,
      expiredLocks: locks.filter((lock) => lock.status === "expired").length,
      lastOperationAt: operations[0]?.requestedAt,
      sync: syncHealth,
      checkedAt: new Date().toISOString(),
    };
  }

  listLocks() {
    return mediaPublicationPersistenceService.listLocks();
  }

  async recoverStalePublications() {
    const expiredLocks = await mediaPublicationPersistenceService.expireStaleLocks();
    const operations = await mediaPublicationPersistenceService.listOperations();
    const stale = operations.filter((operation) =>
      ["requested", "validating", "waiting_for_processing", "promoting_storage", "updating_records", "activating_delivery", "verifying_sync", "rolling_back"].includes(operation.status) &&
      operation.requestedAt < new Date(Date.now() - 15 * 60 * 1000).toISOString()
    );
    for (const operation of stale) {
      await mediaPublicationPersistenceService.updateOperation(operation.publicationOperationId, {
        status: "failed",
        failedAt: new Date().toISOString(),
        errors: unique([...operation.errors, "Publication operation was marked failed by stale-operation recovery."]),
      });
      await mediaPublicationPersistenceService.releaseLock(operation.publicationOperationId);
    }
    return { expiredLocks, staleOperationsRecovered: stale.length, recoveredOperationIds: stale.map((operation) => operation.publicationOperationId), checkedAt: new Date().toISOString() };
  }

  async rollbackPublication(publicationOperationId: string, options: MediaPublicationOptions = {}) {
    const operation = await mediaPublicationPersistenceService.getOperation(publicationOperationId);
    if (!operation) throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_FOUND", message: "Publication operation was not found.", retryable: false, publicationOperationId });
    return mediaPublicationRollbackService.rollbackPublication(operation, options);
  }

  async retryPublication(publicationOperationId: string) {
    const operation = await mediaPublicationPersistenceService.getOperation(publicationOperationId);
    if (!operation) throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_FOUND", message: "Publication operation was not found.", retryable: false, publicationOperationId });
    if (!["failed", "blocked", "completed_with_warnings"].includes(operation.status)) {
      throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_RETRYABLE", message: "Publication operation is not retryable.", retryable: false, publicationOperationId });
    }
    const retried = await mediaPublicationPersistenceService.updateOperation(publicationOperationId, { status: "requested", errors: [], failedAt: undefined });
    return this.startPublication(retried?.publicationOperationId ?? publicationOperationId);
  }

  async cancelPublication(publicationOperationId: string) {
    const operation = await mediaPublicationPersistenceService.updateOperation(publicationOperationId, { status: "canceled", errors: ["Publication operation was canceled."] });
    if (!operation) throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_FOUND", message: "Publication operation was not found.", retryable: false, publicationOperationId });
    await mediaPublicationPersistenceService.releaseLock(publicationOperationId);
    return operation;
  }

  async buildPublicationResult(publicationOperationId: string): Promise<MediaPublicationResult> {
    const operation = await mediaPublicationPersistenceService.getOperation(publicationOperationId);
    if (!operation) throw createPublicationError({ code: "PUBLICATION_OPERATION_NOT_FOUND", message: "Publication operation was not found.", retryable: false, publicationOperationId });
    const publicUrls = await this.collectPublicUrls(operation.promotedAssetIds);
    return {
      success: operation.status === "completed" || operation.status === "completed_with_warnings",
      publicationOperationId,
      entityType: operation.entityType,
      entityId: operation.entityId,
      publicVisibility: operation.status === "completed" ? "public" : operation.status === "completed_with_warnings" ? "partially_public" : operation.status === "rolled_back" ? "rolled_back" : operation.status === "blocked" ? "blocked" : "pending_publication",
      publishedAssets: operation.promotedAssetIds,
      skippedAssets: operation.requestedAssetIds.filter((assetId) => !operation.promotedAssetIds.includes(assetId) && !operation.failedAssetIds.includes(assetId)),
      failedAssets: operation.failedAssetIds,
      publicUrls,
      syncReport: typeof operation.metadata?.syncReport === "object" && operation.metadata.syncReport ? operation.metadata.syncReport as Record<string, unknown> : undefined,
      warnings: operation.warnings,
      errors: operation.errors,
      metadata: operation.metadata,
    };
  }

  private resolveOptions(operation: MediaPublicationOperation): Required<Omit<MediaPublicationOptions, "metadata">> {
    const options = typeof operation.metadata?.options === "object" && operation.metadata.options ? operation.metadata.options as MediaPublicationOptions : {};
    return { ...defaultOptions, ...options };
  }

  private async validateContentPublicationReadiness(entityType: MediaPublicationEntityType, entityId: string, options: MediaPublicationOptions = {}) {
    const now = new Date().toISOString();
    const metadata = { targetVersion: options.metadata?.targetVersion, contentPublication: true };
    const emptyAssets = { requiredAssets: [], optionalAssets: [], privateOnlyAssets: [], blockedAssets: [], missingAssets: [] };
    const fromValidation = (ready: boolean, blockingIssues: string[] = [], warnings: string[] = [], extraMetadata: Record<string, unknown> = {}) => ({
      entityType,
      entityId,
      ready,
      processingReady: !blockingIssues.some((issue) => issue.toLowerCase().includes("processing")),
      storageReady: !blockingIssues.some((issue) => issue.toLowerCase().includes("storage")),
      metadataReady: !blockingIssues.some((issue) => issue.toLowerCase().includes("metadata")),
      publicMappingReady: ready,
      requiredAssetsReady: true,
      optionalAssetsReady: true,
      blockingIssues,
      warnings,
      ...emptyAssets,
      checkedAt: now,
      metadata: { ...metadata, ...extraMetadata },
    });
    if (entityType === "artist") {
      const readiness = await adminArtistService.getArtistReadiness(entityId);
      if (!readiness) return fromValidation(false, ["Artist was not found."]);
      return fromValidation(Boolean(readiness.ready), [...readiness.blockingIssues, ...readiness.missingFields], readiness.warnings, { currentPublicationState: readiness.currentPublicationState });
    }
    if (entityType === "release") {
      const readiness = await adminReleaseService.getReleaseReadiness(entityId);
      if (!readiness) return fromValidation(false, ["Release was not found."]);
      return fromValidation(Boolean(readiness.ready), [...readiness.blockingIssues, ...readiness.missingFields], readiness.warnings, { currentPublicationState: readiness.currentPublicationState, fullSongPrivacyState: readiness.fullSongPrivacyState });
    }
    if (entityType === "gallery_item") {
      const readiness = await adminGalleryService.getGalleryReadiness(entityId);
      if (!readiness) return fromValidation(false, ["Gallery item was not found."]);
      return fromValidation(Boolean(readiness.ready), [...readiness.blockingIssues, ...readiness.missingFields], readiness.warnings, { currentPublicationState: readiness.currentPublicationState });
    }
    if (entityType === "site_config" || entityType === "site_configuration" || entityType === "homepage") {
      const readiness = await adminSiteConfigurationService.getReadiness();
      return fromValidation(Boolean(readiness.ready), readiness.blockingIssues, readiness.warnings, { currentPublicationState: readiness.currentPublicationState, sectionStates: readiness.sectionStates });
    }
    if (entityType === "metadata" || entityType === "seo_metadata" || entityType === "social_metadata") {
      const readiness = await adminMetadataService.readiness(entityId);
      if (!readiness) return fromValidation(false, ["Metadata record was not found."]);
      return fromValidation(Boolean(readiness.ready), readiness.blockingIssues, readiness.warnings, { fieldErrors: readiness.fieldErrors });
    }
    return mediaPublicationReadinessService.validatePublicationReadiness(entityType, entityId, options);
  }

  private async startContentPublication(operation: MediaPublicationOperation): Promise<MediaPublicationOperation> {
    let current = await mediaPublicationPersistenceService.updateOperation(operation.publicationOperationId, {
      status: "validating",
      startedAt: operation.startedAt ?? new Date().toISOString(),
      stages: updatePublicationStage(operation, "entity_validation", "completed", { progress: 100 }).stages,
    }) ?? operation;
    try {
      const readiness = ["publish", "republish", "activate"].includes(operation.actionType)
        ? await this.validateContentPublicationReadiness(operation.entityType, operation.entityId, this.resolveOptions(operation))
        : this.lifecycleBypassReadiness(operation.entityType, operation.entityId, operation.actionType);
      current = await this.patchStage(current, "asset_validation", readiness.blockingIssues.length ? "blocked" : "completed", readiness.blockingIssues, readiness.warnings);
      if (readiness.blockingIssues.length) return this.blockOrRollback(current, readiness.blockingIssues);

      current = await this.patchStage(current, "processing_readiness", "completed", [], readiness.warnings);
      current = await this.patchStage(current, "storage_promotion", "completed");
      current = await this.patchStage(current, "derivative_promotion", "skipped", [], ["Content publication delegates media promotion to entity-specific publication services."]);

      const result = await this.executeContentAction(current);
      const publicRepresentation = await this.buildContentPublicRepresentation(current, result);
      const privacyIssues = this.findPublicPrivacyIssues(publicRepresentation);
      if (privacyIssues.length) {
        current = await this.patchStage(current, "record_update", "failed", privacyIssues);
        return this.blockOrRollback(current, privacyIssues);
      }

      current = await this.patchStage(current, "record_update", "completed");
      current = await this.patchStage(current, "cdn_activation", "completed");
      current = await this.patchStage(current, "cdn_invalidation", "completed");

      await publishedContentSynchronizationService.synchronizePublicationOperation({ ...current, status: "completed" });
      const verifyIssues = await this.verifyContentPublicSync(current);
      current = await this.patchStage(current, "public_sync_verification", verifyIssues.length ? "failed" : "completed", verifyIssues);
      if (verifyIssues.length) return this.blockOrRollback(current, verifyIssues);

      current = await mediaPublicationPersistenceService.updateOperation(current.publicationOperationId, {
        status: current.warnings.length ? "completed_with_warnings" : "completed",
        currentStage: "complete",
        completedAt: new Date().toISOString(),
        stages: updatePublicationStage(current, "complete", "completed", { progress: 100 }).stages,
        metadata: { ...(current.metadata ?? {}), publicRepresentation, publicVerification: "passed" },
      }) ?? current;
      await mediaAuditPersistenceService.record("publication_operation_completed", `Completed ${current.actionType} for ${current.entityType} ${current.entityId}`, {
        actorId: current.requestedBy,
        entityType: "media_publication_operation",
        entityId: current.publicationOperationId,
        metadata: { publicationEntityType: current.entityType, publicationEntityId: current.entityId, actionType: current.actionType },
      });
      await mediaPublicationPersistenceService.releaseLock(current.publicationOperationId);
      return current;
    } catch (error) {
      const message = normalizePublicationErrorMessage(error);
      const failed = await mediaPublicationPersistenceService.updateOperation(current.publicationOperationId, {
        status: "failed",
        failedAt: new Date().toISOString(),
        errors: unique([...current.errors, message]),
        stages: updatePublicationStage(current, current.currentStage, "failed", { errors: [message] }).stages,
      }) ?? current;
      await mediaAuditPersistenceService.record("publication_operation_failed", `Failed ${current.actionType} for ${current.entityType} ${current.entityId}`, {
        actorId: current.requestedBy,
        entityType: "media_publication_operation",
        entityId: current.publicationOperationId,
        metadata: { message },
      });
      await mediaPublicationPersistenceService.releaseLock(current.publicationOperationId);
      return failed;
    }
  }

  private async executeContentAction(operation: MediaPublicationOperation): Promise<Record<string, unknown> | null> {
    const action = operation.actionType === "activate" || operation.actionType === "republish" ? "publish" : operation.actionType;
    if (operation.entityType === "artist") {
      if (action === "publish") return await adminArtistService.publishArtist(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "unpublish") return await adminArtistService.unpublishArtist(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "archive") return await adminArtistService.archiveArtist(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "restore") return await adminArtistService.restoreArtist(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
    }
    if (operation.entityType === "release") {
      if (action === "publish") return await adminReleaseService.publishRelease(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "unpublish") return await adminReleaseService.unpublishRelease(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "archive") return await adminReleaseService.archiveRelease(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "restore") return await adminReleaseService.restoreRelease(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
    }
    if (operation.entityType === "gallery_item") {
      if (action === "publish") return await adminGalleryService.publishGalleryItem(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "unpublish") return await adminGalleryService.unpublishGalleryItem(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "archive") return await adminGalleryService.archiveGalleryItem(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
      if (action === "restore") return await adminGalleryService.restoreGalleryItem(operation.entityId, operation.requestedBy) as Record<string, unknown> | null;
    }
    if (operation.entityType === "site_config" || operation.entityType === "site_configuration" || operation.entityType === "homepage") {
      if (action === "publish") return await adminSiteConfigurationService.publishDraft(operation.requestedBy) as unknown as Record<string, unknown>;
      if (action === "archive") return await adminSiteConfigurationService.archiveDraft(operation.requestedBy) as unknown as Record<string, unknown>;
      if (action === "rollback") return await adminSiteConfigurationService.rollbackToVersion(Number(operation.metadata?.targetVersion), operation.requestedBy) as unknown as Record<string, unknown>;
      if (action === "restore") return await adminSiteConfigurationService.createDraftFromPublished(operation.requestedBy) as unknown as Record<string, unknown>;
      if (action === "unpublish") throw new Error("SITE_CONFIG_UNPUBLISH_UNSUPPORTED: publish a replacement or archive draft instead.");
    }
    if (operation.entityType === "metadata" || operation.entityType === "seo_metadata" || operation.entityType === "social_metadata") {
      if (action === "publish") return await adminMetadataService.publish(operation.entityId, operation.requestedBy ?? "publication") as unknown as Record<string, unknown>;
      if (action === "archive") return await adminMetadataService.archive(operation.entityId, operation.requestedBy ?? "publication") as unknown as Record<string, unknown>;
      if (action === "restore") return await adminMetadataService.restore(operation.entityId, operation.requestedBy ?? "publication") as unknown as Record<string, unknown>;
      if (action === "unpublish") return await adminMetadataService.archive(operation.entityId, operation.requestedBy ?? "publication") as unknown as Record<string, unknown>;
    }
    throw new Error(`PUBLICATION_ENTITY_UNSUPPORTED:${operation.entityType}:${operation.actionType}`);
  }

  private findPublicPrivacyIssues(value: unknown, path = "result"): string[] {
    if (value == null) return [];
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower.includes("fullsong") || lower.includes("full-song") || lower.includes("full_song")) return [`${path} references full-song media.`];
      if (lower.includes("private/") || lower.includes("/private") || lower.includes("signed") || lower.includes("sig=") || lower.includes("token=")) return [`${path} contains a private or signed URL.`];
      return [];
    }
    if (Array.isArray(value)) return value.flatMap((item, index) => this.findPublicPrivacyIssues(item, `${path}[${index}]`));
    if (typeof value === "object") {
      return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("fullsong") || lowerKey.includes("full_song")) return [`${path}.${key} must not be exposed publicly.`];
        if (lowerKey.includes("signedurl") || lowerKey.includes("privatepath")) return [`${path}.${key} contains private delivery data.`];
        return this.findPublicPrivacyIssues(child, `${path}.${key}`);
      });
    }
    return [];
  }

  private async buildContentPublicRepresentation(operation: MediaPublicationOperation, fallback: Record<string, unknown> | null): Promise<unknown> {
    if (operation.actionType === "archive" || operation.actionType === "unpublish" || operation.actionType === "restore") {
      return { entityType: operation.entityType, entityId: operation.entityId, actionType: operation.actionType, publicVisibility: "not_public" };
    }
    if (operation.entityType === "artist") {
      const admin = await adminArtistService.getArtist(operation.entityId);
      return admin?.slug ? await publicArtistService.getPublishedArtistBySlug(admin.slug) : undefined;
    }
    if (operation.entityType === "release") {
      const admin = await adminReleaseService.getRelease(operation.entityId);
      return admin?.slug ? await publicReleaseService.getPublishedReleaseBySlug(admin.slug) : undefined;
    }
    if (operation.entityType === "gallery_item") {
      const admin = await adminGalleryService.getGalleryItem(operation.entityId);
      return admin?.slug ? await publicGalleryDeliveryService.getPublishedGalleryItemBySlug(admin.slug) : undefined;
    }
    if (operation.entityType === "homepage" || operation.entityType === "site_config" || operation.entityType === "site_configuration") {
      return publicHomepageDeliveryService.getPublicHomepage();
    }
    if (operation.entityType === "metadata" || operation.entityType === "seo_metadata" || operation.entityType === "social_metadata") {
      return publicMetadataDeliveryService.getMetadataForPath("/");
    }
    return fallback;
  }

  private async verifyContentPublicSync(operation: MediaPublicationOperation): Promise<string[]> {
    if (operation.actionType === "archive" || operation.actionType === "unpublish") return [];
    if (operation.entityType === "artist") {
      const result = await adminArtistService.getArtist(operation.entityId);
      const slug = typeof result?.slug === "string" ? result.slug : undefined;
      return slug && await publicArtistService.getPublishedArtistBySlug(slug) ? [] : ["Published artist was not visible through public delivery."];
    }
    if (operation.entityType === "release") {
      const result = await adminReleaseService.getRelease(operation.entityId);
      const slug = typeof result?.slug === "string" ? result.slug : undefined;
      return slug && await publicReleaseService.getPublishedReleaseBySlug(slug) ? [] : ["Published release was not visible through public delivery."];
    }
    if (operation.entityType === "gallery_item") {
      const result = await adminGalleryService.getGalleryItem(operation.entityId);
      const slug = typeof result?.slug === "string" ? result.slug : undefined;
      return slug && await publicGalleryDeliveryService.getPublishedGalleryItemBySlug(slug) ? [] : ["Published gallery item was not visible through public delivery."];
    }
    if (operation.entityType === "homepage" || operation.entityType === "site_config" || operation.entityType === "site_configuration") {
      const [homepage, siteMetadata] = await Promise.all([publicHomepageDeliveryService.getPublicHomepage(), publicMetadataDeliveryService.getMetadataForPath("/")]);
      return homepage.sections.length >= 0 && Boolean(siteMetadata?.title) ? [] : ["Published homepage/site configuration did not resolve through public delivery."];
    }
    if (operation.entityType === "metadata" || operation.entityType === "seo_metadata" || operation.entityType === "social_metadata") {
      const metadata = await publicMetadataDeliveryService.getMetadataForPath("/");
      return metadata.title ? [] : ["Published metadata was not visible through public metadata delivery."];
    }
    return [];
  }

  private lifecycleBypassReadiness(entityType: MediaPublicationEntityType, entityId: string, actionType: MediaPublicationActionType) {
    return {
      entityType,
      entityId,
      ready: true,
      processingReady: true,
      storageReady: true,
      metadataReady: true,
      publicMappingReady: true,
      requiredAssetsReady: true,
      optionalAssetsReady: true,
      blockingIssues: [],
      warnings: [`${actionType} does not require publish-readiness validation.`],
      requiredAssets: [],
      optionalAssets: [],
      privateOnlyAssets: [],
      blockedAssets: [],
      missingAssets: [],
      checkedAt: new Date().toISOString(),
      metadata: { contentPublication: true, lifecycleAction: actionType },
    };
  }

  private async patchStage(operation: MediaPublicationOperation, stageType: Parameters<typeof updatePublicationStage>[1], status: Parameters<typeof updatePublicationStage>[2], errors: string[] = [], warnings: string[] = []) {
    const next = updatePublicationStage(operation, stageType, status, { progress: status === "completed" || status === "skipped" ? 100 : 0, errors, warnings });
    return await mediaPublicationPersistenceService.updateOperation(operation.publicationOperationId, {
      currentStage: stageType,
      stages: next.stages,
      errors: unique([...operation.errors, ...errors]),
      warnings: unique([...operation.warnings, ...warnings]),
    }) ?? next;
  }

  private async blockOrRollback(operation: MediaPublicationOperation, errors: string[]): Promise<MediaPublicationOperation> {
    const blocked = await mediaPublicationPersistenceService.updateOperation(operation.publicationOperationId, {
      status: "blocked",
      errors: unique([...operation.errors, ...errors]),
      blockingIssues: unique([...operation.blockingIssues, ...errors]),
      failedAt: new Date().toISOString(),
    }) ?? operation;
    await mediaAuditPersistenceService.record("media_publication_blocked", `Blocked media publication for ${operation.entityType} ${operation.entityId}`, {
      actorId: operation.requestedBy,
      entityType: "media_publication_operation",
      entityId: operation.publicationOperationId,
      metadata: { errors },
    });
    await mediaPublicationPersistenceService.releaseLock(operation.publicationOperationId);
    return this.resolveOptions(blocked).rollbackOnRequiredFailure && blocked.promotedAssetIds.length ? mediaPublicationRollbackService.rollbackPublication(blocked) : blocked;
  }

  private async promoteAssets(operation: MediaPublicationOperation, assetIds: string[]) {
    const promotedAssetIds: string[] = [];
    const failedAssetIds: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    for (const assetId of assetIds) {
      try {
        const asset = await mediaAssetPersistenceService.get(assetId);
        if (!asset) throw new Error(`Media asset ${assetId} was not found.`);
        if (asset.assetType === "full_song") {
          warnings.push(`Full-song asset ${assetId} remained private.`);
          continue;
        }
        const storage = (await mediaStoragePersistenceService.list()).find((item) => item.assetId === assetId);
        if (!storage) throw new Error(`Storage object for ${assetId} was not found.`);
        const publicVersionId = `public-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const publicPath = buildPublicationPublicStoragePath({
          entityType: operation.entityType,
          entityId: operation.entityId,
          assetType: asset.assetType,
          versionId: publicVersionId,
          fileName: storage.fileName,
        });
        const provider = backendStorageProviderRegistry.getActiveProvider();
        const publicUrl = this.buildCdnUrl(provider.getPublicUrl(publicPath) ?? `${mediaBackendConfig.publicBaseUrl}/${publicPath.replace(/^public\/?/, "")}`, publicVersionId);
        const publicStorage = await mediaStoragePersistenceService.create({
          ...storage,
          storageObjectId: `storage-public-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          storagePath: publicPath,
          publicUrl,
          signedUrl: undefined,
          accessLevel: "public",
          status: "ready",
          uploadedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            ...(storage.metadata ?? {}),
            sourceStorageObjectId: storage.storageObjectId,
            publicationOperationId: operation.publicationOperationId,
            publicVersionId,
            publicationReadinessOnly: true,
          },
        });
        await this.patchPublishedAsset(asset, publicStorage.publicUrl ?? publicUrl, publicStorage.storageObjectId, operation.publicationOperationId, publicVersionId);
        promotedAssetIds.push(assetId);
        await mediaAuditPersistenceService.record("media_asset_promoted_public", `Promoted media asset "${asset.title}" to public delivery`, {
          actorId: operation.requestedBy,
          entityType: "media_asset",
          entityId: assetId,
          metadata: { publicationOperationId: operation.publicationOperationId, publicStorageObjectId: publicStorage.storageObjectId },
        });
      } catch (error) {
        failedAssetIds.push(assetId);
        errors.push(normalizePublicationErrorMessage(error));
      }
    }
    return { promotedAssetIds, failedAssetIds, warnings, errors };
  }

  private buildCdnUrl(publicUrl: string, versionId: string): string {
    if (!mediaBackendConfig.cdnEnabled || !mediaBackendConfig.cdnBaseUrl) return publicUrl;
    try {
      const path = publicUrl.startsWith("http") ? new URL(publicUrl).pathname : publicUrl;
      return `${mediaBackendConfig.cdnBaseUrl.replace(/\/+$/, "")}${path}${path.includes("?") ? "&" : "?"}v=${encodeURIComponent(versionId)}`;
    } catch {
      return publicUrl;
    }
  }

  private async patchPublishedAsset(asset: MediaAsset, publicUrl: string, publicStorageObjectId: string, publicationOperationId: string, publicVersionId: string) {
    await mediaAssetPersistenceService.patch(asset.assetId, {
      status: "published",
      url: publicUrl,
      thumbnailUrl: asset.assetType.includes("image") || asset.assetType.includes("cover") || asset.assetType.includes("profile") || asset.assetType.includes("logo") ? publicUrl : asset.thumbnailUrl,
      largeUrl: asset.assetType.includes("image") || asset.assetType.includes("cover") || asset.assetType.includes("profile") || asset.assetType.includes("logo") ? publicUrl : asset.largeUrl,
      metadata: {
        ...(asset.metadata ?? {}),
        previousPublicUrl: asset.url ?? null,
        publicStorageObjectId,
        publicVersionId,
        publicationOperationId,
        publishedAt: new Date().toISOString(),
        publicationState: "published",
        cdn: { enabled: mediaBackendConfig.cdnEnabled, publicUrl },
      },
    });
  }

  private async collectPublicUrls(assetIds: string[]): Promise<Record<string, string>> {
    const pairs = await Promise.all(assetIds.map(async (assetId) => {
      const asset = await mediaAssetPersistenceService.get(assetId);
      return [assetId, asset?.url ?? ""] as const;
    }));
    return pairs.reduce<Record<string, string>>((urls, [assetId, url]) => {
      if (url && !url.includes("private") && !url.includes("signed")) urls[assetId] = url;
      return urls;
    }, {});
  }

  private async hideEntityMedia(operation: MediaPublicationOperation): Promise<MediaPublicationOperation> {
    const assets = (await mediaAssetPersistenceService.list()).filter((asset) => operation.requestedAssetIds.includes(asset.assetId) || (asset.ownerType === operation.entityType && asset.ownerId === operation.entityId));
    for (const asset of assets) {
      await mediaAssetPersistenceService.patch(asset.assetId, {
        status: operation.actionType === "archive" ? "archived" : "draft",
        metadata: { ...(asset.metadata ?? {}), publicationState: operation.actionType === "archive" ? "archived" : "not_public", unpublishedAt: new Date().toISOString() },
      });
    }
    const updated = await mediaPublicationPersistenceService.updateOperation(operation.publicationOperationId, {
      status: "completed",
      currentStage: "complete",
      completedAt: new Date().toISOString(),
      stages: operation.stages.map((stage) => ({ ...stage, status: stage.stageType === "complete" ? "completed" : stage.status === "pending" ? "skipped" : stage.status, progress: 100 })),
    }) ?? operation;
    await mediaAuditPersistenceService.record(operation.actionType === "archive" ? "media_unpublished" : "media_unpublished", `${operation.actionType} completed for ${operation.entityType} ${operation.entityId}`, {
      actorId: operation.requestedBy,
      entityType: "media_publication_operation",
      entityId: operation.publicationOperationId,
    });
    await publishedContentSynchronizationService.synchronizePublicationOperation(updated);
    await mediaPublicationPersistenceService.releaseLock(operation.publicationOperationId);
    return updated;
  }
}

export const mediaPublicationOrchestrationService = new MediaPublicationOrchestrationService();
