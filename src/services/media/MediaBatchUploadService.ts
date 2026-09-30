import type { MediaAssetMetadataValue } from "../../models/admin";
import type {
  MediaAssetUploadStatus,
  MediaBatchFileItem,
  MediaBatchFileItemStatus,
  MediaBatchUploadOptions,
  MediaBatchUploadSession,
  MediaBatchUploadSessionStatus,
  MediaUploadResult,
} from "../../models/media";
import { mediaAssetUploadService } from "./MediaAssetUploadService";
import { mediaBatchUploadJobService } from "./MediaBatchUploadJobService";
import { mediaUploadJobService } from "./MediaUploadJobService";
import { mediaValidationService } from "./MediaValidationService";
import { recordMediaAuditEvent } from "../admin/AdminAuditService";
import { uploadSecurityService } from "../security";
import {
  buildBatchUploadTarget,
  createBatchFileId,
  createBatchSessionId,
  getBatchLevelValidationMessages,
  getBatchSessionSummary,
  inferBatchFileAssetType,
  inferBatchFileMediaCategory,
  isBatchFileCompatible,
  mergeBatchUploadOptions,
  reconcileBatchSessionCounts,
  type MediaBatchUploadSummary,
} from "../../utils/media/batchUploadUtils";

type BatchSessionListener = (session: MediaBatchUploadSession) => void;

const nowIso = (): string => new Date().toISOString();

const mapUploadStatusToBatchFileStatus = (status: MediaAssetUploadStatus["status"]): MediaBatchFileItemStatus => {
  if (status === "validating") return "validating";
  if (status === "uploading") return "uploading";
  if (status === "processing" || status === "creating_asset") return "processing";
  if (status === "completed") return "completed";
  if (status === "validation_failed") return "validation_failed";
  if (status === "failed") return "failed";
  if (status === "canceled") return "canceled";
  return "queued";
};

const getSessionStatus = (session: MediaBatchUploadSession): MediaBatchUploadSessionStatus => {
  const files = session.files;
  if (!files.length) return "draft";
  if (files.some((file) => file.status === "uploading")) return "uploading";
  if (files.some((file) => file.status === "processing")) return "processing";
  if (files.every((file) => file.status === "canceled")) return "canceled";
  const resolved = files.every((file) => ["completed", "failed", "canceled", "validation_failed", "skipped"].includes(file.status));
  if (resolved) {
    if (session.completedFiles > 0 && (session.failedFiles > 0 || session.invalidFiles > 0 || session.canceledFiles > 0)) return "completed_with_errors";
    if (session.completedFiles === files.length) return "completed";
    return "failed";
  }
  if (files.some((file) => file.status === "validating")) return "validating";
  return session.validFiles > 0 ? "ready" : "draft";
};

export class MediaBatchUploadService {
  private sessions = new Map<string, MediaBatchUploadSession>();
  private listeners = new Map<string, Set<BatchSessionListener>>();
  private optionsBySession = new Map<string, MediaBatchUploadOptions>();

  createBatchSession(files: readonly File[], options: Partial<MediaBatchUploadOptions> = {}): MediaBatchUploadSession {
    const resolvedOptions = mergeBatchUploadOptions(options);
    const sessionId = createBatchSessionId();
    const batchValidation = getBatchLevelValidationMessages(files, resolvedOptions);
    const createdAt = nowIso();
    const items = files.slice(0, resolvedOptions.maxFiles ?? files.length).map<MediaBatchFileItem>((file) => {
      const batchFileId = createBatchFileId();
      const assetType = inferBatchFileAssetType(file, resolvedOptions);
      const mediaCategory = inferBatchFileMediaCategory(file);
      const placeholder = { batchFileId, fileName: file.name, assetType };
      const uploadTarget = buildBatchUploadTarget(placeholder, resolvedOptions, sessionId);
      const securityCheckResult = uploadSecurityService.runSecurityChecks(file, uploadTarget);
      const incompatible = !isBatchFileCompatible(file, assetType);
      const errors = [
        ...batchValidation.errors,
        ...(securityCheckResult.blocked ? securityCheckResult.checks.filter((check) => check.status === "failed" || check.severity === "blocking").map((check) => check.message) : []),
        ...(incompatible ? ["File type is not compatible with the selected asset type."] : []),
      ];
      const warnings = [...batchValidation.warnings, ...securityCheckResult.warnings];
      return {
        batchFileId,
        file,
        fileName: file.name,
        sanitizedFileName: securityCheckResult.sanitizedFileName,
        fileSizeBytes: file.size,
        mimeType: file.type,
        assetType,
        mediaCategory,
        uploadTarget,
        securityCheckResult,
        status: errors.length ? "validation_failed" : "selected",
        progress: errors.length ? 100 : 0,
        errors: errors.length ? errors : undefined,
        warnings: warnings.length ? warnings : undefined,
        metadata: uploadSecurityService.sanitizeUploadMetadata({
          batchSessionId: sessionId,
          batchFileId,
          sanitizedFileName: securityCheckResult.sanitizedFileName,
        }),
      };
    });

    const session = this.saveSession({
      sessionId,
      title: resolvedOptions.title,
      status: batchValidation.errors.length ? "failed" : "draft",
      files: items,
      uploadTargets: items.map((file) => file.uploadTarget),
      totalFiles: items.length,
      validFiles: items.filter((file) => file.status !== "validation_failed").length,
      invalidFiles: items.filter((file) => file.status === "validation_failed").length,
      completedFiles: 0,
      failedFiles: 0,
      canceledFiles: 0,
      progress: items.length && items.every((file) => file.status === "validation_failed") ? 100 : 0,
      createdAt,
      metadata: uploadSecurityService.sanitizeUploadMetadata({
        ...(resolvedOptions.metadata ?? {}),
        maxFiles: resolvedOptions.maxFiles ?? null,
        allowMixedMedia: resolvedOptions.allowMixedMedia,
        continueOnError: resolvedOptions.continueOnError,
      }),
    });
    this.optionsBySession.set(session.sessionId, resolvedOptions);
    this.recordBatchAudit("batch_upload_session_created", session, `Batch upload session created with ${session.totalFiles} files`);
    return session;
  }

  async validateBatchSession(sessionId: string): Promise<MediaBatchUploadSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    this.patchSession(sessionId, { status: "validating" });
    const validatedFiles = await Promise.all(session.files.map(async (fileItem) => {
      if (fileItem.status === "validation_failed" && fileItem.errors?.length) return fileItem;
      const securityCheckResult = uploadSecurityService.runSecurityChecks(fileItem.file, fileItem.uploadTarget);
      const validationResult = await mediaValidationService.validateFile(fileItem.file, fileItem.uploadTarget);
      const errors = [
        ...validationResult.blockingErrors.map((message) => message.message),
        ...(securityCheckResult.blocked ? securityCheckResult.checks.filter((check) => check.status === "failed" || check.severity === "blocking").map((check) => check.message) : []),
      ];
      const warnings = [
        ...validationResult.warnings.map((message) => message.message),
        ...validationResult.info.map((message) => message.message),
        ...securityCheckResult.warnings,
      ];
      return {
        ...fileItem,
        sanitizedFileName: securityCheckResult.sanitizedFileName,
        securityCheckResult,
        validationResult,
        status: errors.length ? "validation_failed" as const : "ready" as const,
        progress: errors.length ? 100 : 12,
        errors: errors.length ? [...new Set(errors)] : undefined,
        warnings: warnings.length ? [...new Set(warnings)] : undefined,
      };
    }));
    const next = this.saveSession({
      ...session,
      files: validatedFiles,
      status: "ready",
    });
    return next;
  }

  async startBatchUpload(sessionId: string): Promise<MediaBatchUploadSession | null> {
    const validated = await this.validateBatchSession(sessionId);
    if (!validated) return null;
    return this.uploadBatchFiles(sessionId);
  }

  async uploadBatchFiles(sessionId: string): Promise<MediaBatchUploadSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const options = this.optionsBySession.get(sessionId) ?? mergeBatchUploadOptions();
    const readyFiles = session.files.filter((file) => file.status === "ready" || file.status === "queued");
    if (!readyFiles.length) return this.saveSession({ ...session, status: "failed", completedAt: nowIso() });

    const uploadJobIds = readyFiles.map((file) => {
      const existing = file.uploadJobId ? mediaUploadJobService.getUploadJob(file.uploadJobId) : null;
      return existing?.uploadJobId ?? mediaUploadJobService.createUploadJob(file.file, file.uploadTarget, {
        source: "batch_upload",
        queueItemId: file.batchFileId,
      }).uploadJobId;
    });
    const batchJob = mediaBatchUploadJobService.createBatchJob(uploadJobIds, {
      source: "batch_upload",
      sessionId,
    });
    this.recordBatchAudit("batch_upload_started", session, `Batch upload started with ${readyFiles.length} ready files`);
    this.patchSession(sessionId, {
      batchJobId: batchJob.batchJobId,
      batchJob,
      status: "uploading",
      startedAt: nowIso(),
      files: session.files.map((file) => {
        const readyIndex = readyFiles.findIndex((ready) => ready.batchFileId === file.batchFileId);
        return readyIndex >= 0 ? { ...file, status: "queued" as const, uploadJobId: uploadJobIds[readyIndex], progress: 12 } : file;
      }),
    });

    for (const fileItem of readyFiles) {
      const current = this.sessions.get(sessionId);
      if (!current || current.status === "canceled") break;
      const currentFile = current.files.find((file) => file.batchFileId === fileItem.batchFileId);
      if (!currentFile || currentFile.status === "canceled") continue;
      const result = await this.uploadSingleBatchFile(sessionId, currentFile, options);
      if (!result.success && !options.continueOnError) break;
    }

    const final = this.sessions.get(sessionId);
    if (!final) return null;
    if (final.batchJobId) {
      const batch = mediaBatchUploadJobService.markBatchCompleted(final.batchJobId);
      if (batch) this.patchSession(sessionId, { batchJob: batch });
    }
    const completed = this.saveSession({
      ...this.sessions.get(sessionId)!,
      completedAt: nowIso(),
    });
    this.recordBatchAudit(
      completed.status === "completed_with_errors" ? "batch_upload_completed_with_errors" : completed.status === "failed" ? "batch_upload_failed" : "batch_upload_completed",
      completed,
      completed.status === "completed_with_errors"
        ? `Batch upload completed with ${completed.failedFiles + completed.invalidFiles} failed or invalid files`
        : `Uploaded ${completed.completedFiles} media assets through batch upload`,
    );
    return completed;
  }

  async retryFailedFiles(sessionId: string): Promise<MediaBatchUploadSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const failedFiles = session.files.filter((file) => file.status === "failed");
    for (const file of failedFiles) {
      await this.retryBatchFile(sessionId, file.batchFileId);
    }
    return this.sessions.get(sessionId) ?? null;
  }

  async retryBatchFile(sessionId: string, batchFileId: string): Promise<MediaBatchUploadSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    const file = session.files.find((item) => item.batchFileId === batchFileId);
    if (!file) return session;
    this.recordBatchAudit("batch_file_upload_retried", session, `Retried batch file "${file.fileName}"`);
    this.patchBatchFile(sessionId, batchFileId, { status: "ready", progress: 0, errors: undefined, uploadResult: undefined });
    await this.uploadSingleBatchFile(sessionId, { ...file, status: "ready", progress: 0, errors: undefined }, this.optionsBySession.get(sessionId) ?? mergeBatchUploadOptions());
    return this.sessions.get(sessionId) ?? null;
  }

  cancelBatch(sessionId: string): MediaBatchUploadSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    if (session.batchJobId) mediaBatchUploadJobService.cancelBatch(session.batchJobId);
    const canceled = this.saveSession({
      ...session,
      status: "canceled",
      files: session.files.map((file) => ["completed", "failed", "validation_failed"].includes(file.status) ? file : { ...file, status: "canceled", progress: 100 }),
      completedAt: nowIso(),
    });
    this.recordBatchAudit("batch_upload_canceled", canceled, "Batch upload canceled");
    return canceled;
  }

  cancelBatchFile(sessionId: string, batchFileId: string): MediaBatchUploadSession | null {
    const session = this.sessions.get(sessionId);
    const file = session?.files.find((item) => item.batchFileId === batchFileId);
    if (file?.uploadJobId) mediaUploadJobService.markCanceled(file.uploadJobId);
    return this.patchBatchFile(sessionId, batchFileId, { status: "canceled", progress: 100 });
  }

  getBatchSession(sessionId: string): MediaBatchUploadSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getBatchSummary(sessionId: string): MediaBatchUploadSummary | null {
    const session = this.sessions.get(sessionId);
    return session ? getBatchSessionSummary(session) : null;
  }

  clearCompleted(sessionId: string): MediaBatchUploadSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.saveSession({ ...session, files: session.files.filter((file) => file.status !== "completed") });
  }

  subscribe(sessionId: string, listener: BatchSessionListener): () => void {
    const listeners = this.listeners.get(sessionId) ?? new Set<BatchSessionListener>();
    listeners.add(listener);
    this.listeners.set(sessionId, listeners);
    const session = this.sessions.get(sessionId);
    if (session) listener(session);
    return () => {
      const current = this.listeners.get(sessionId);
      current?.delete(listener);
      if (current?.size === 0) this.listeners.delete(sessionId);
    };
  }

  private async uploadSingleBatchFile(
    sessionId: string,
    fileItem: MediaBatchFileItem,
    options: MediaBatchUploadOptions,
  ): Promise<MediaUploadResult> {
    this.patchBatchFile(sessionId, fileItem.batchFileId, { status: "uploading", progress: 16, errors: undefined });
    const result = await mediaAssetUploadService.uploadMediaAsset(fileItem.file, fileItem.uploadTarget, {
      status: "draft",
      accessLevel: options.accessLevel ?? "admin_only",
      generateAssetRecord: true,
      description: "Uploaded through Admin Media Library batch upload",
      metadata: uploadSecurityService.sanitizeUploadMetadata({
        ...(options.metadata ?? {}),
        batchSessionId: sessionId,
        batchFileId: fileItem.batchFileId,
        uploadJobId: fileItem.uploadJobId ?? "",
        uploadedFrom: "batch_upload",
        assignmentStatus: "unassigned",
      }) as Record<string, MediaAssetMetadataValue>,
      onProgress: (progress) => {
        this.patchBatchFile(sessionId, fileItem.batchFileId, { progress });
      },
      onStatusChange: (status) => {
        this.patchBatchFile(sessionId, fileItem.batchFileId, {
          status: mapUploadStatusToBatchFileStatus(status.status),
          progress: status.progress,
          errors: status.errors,
          warnings: status.warnings,
        });
      },
    });

    if (result.success) {
      this.patchBatchFile(sessionId, fileItem.batchFileId, {
        status: "completed",
        progress: 100,
        uploadResult: result,
        warnings: result.warnings,
      });
      return result;
    }

    this.recordBatchFileFailure(sessionId, fileItem, result.errors ?? ["Upload failed."]);
    this.patchBatchFile(sessionId, fileItem.batchFileId, {
      status: "failed",
      progress: 100,
      uploadResult: result,
      errors: result.errors ?? ["Upload failed."],
      warnings: result.warnings,
    });
    return result;
  }

  private patchBatchFile(sessionId: string, batchFileId: string, patch: Partial<MediaBatchFileItem>): MediaBatchUploadSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.saveSession({
      ...session,
      files: session.files.map((file) => file.batchFileId === batchFileId ? { ...file, ...patch } : file),
    });
  }

  private patchSession(sessionId: string, patch: Partial<MediaBatchUploadSession>): MediaBatchUploadSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.saveSession({ ...session, ...patch });
  }

  private saveSession(session: MediaBatchUploadSession): MediaBatchUploadSession {
    const counted = reconcileBatchSessionCounts(session);
    const next = {
      ...counted,
      status: session.status === "canceled" ? "canceled" as const : getSessionStatus(counted),
      updatedAt: nowIso(),
    };
    this.sessions.set(next.sessionId, next);
    this.listeners.get(next.sessionId)?.forEach((listener) => listener(next));
    return next;
  }

  private recordBatchAudit(action: string, session: MediaBatchUploadSession, summary: string): void {
    recordMediaAuditEvent({
      actionType: "upload",
      entityId: session.sessionId,
      entityLabel: session.title ?? "Batch upload",
      route: "/admin/media",
      summary,
      metadata: {
        action,
        sessionId: session.sessionId,
        batchJobId: session.batchJobId ?? null,
        totalFiles: session.totalFiles,
        completedFiles: session.completedFiles,
        failedFiles: session.failedFiles,
        invalidFiles: session.invalidFiles,
      },
    });
  }

  private recordBatchFileFailure(sessionId: string, fileItem: MediaBatchFileItem, errors: string[]): void {
    recordMediaAuditEvent({
      actionType: "upload",
      entityId: sessionId,
      entityLabel: fileItem.fileName,
      route: "/admin/media",
      summary: `Batch file upload failed for "${fileItem.fileName}"`,
      metadata: {
        action: "batch_file_upload_failed",
        sessionId,
        batchFileId: fileItem.batchFileId,
        errors: errors.join("; "),
      },
    });
  }
}

export const mediaBatchUploadService = new MediaBatchUploadService();
