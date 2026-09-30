import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { mediaUploadApiService } from "../services/media/MediaUploadApiService";
import { mediaAssetPersistenceService } from "../services/media/MediaAssetPersistenceService";
import { mediaStoragePersistenceService } from "../services/media/MediaStoragePersistenceService";
import { mediaUploadJobPersistenceService } from "../services/media/MediaUploadJobPersistenceService";
import { mediaVersionRepository } from "../repositories/MediaVersionRepository";
import { mediaSignedUrlService } from "../services/media/MediaSignedUrlService";
import { backendStorageProviderRegistry } from "../storage/StorageProviderRegistry";
import { validateProductionStorageConfig } from "../config/validateProductionStorageConfig";
import { mediaStoragePromotionService } from "../services/media/MediaStoragePromotionService";
import { mediaStorageReconciliationService } from "../services/media/MediaStorageReconciliationService";
import { mediaStorageDemotionService } from "../services/media/MediaStorageDemotionService";
import { mediaLibraryService } from "../services/media/MediaLibraryService";
import { directMediaUploadSessionService } from "../services/media/DirectMediaUploadSessionService";
import { abandonedUploadCleanupService } from "../services/media/AbandonedUploadCleanupService";
import { audioPreviewGenerationService } from "../services/media/AudioPreviewGenerationService";
import { mediaBackendConfig } from "../config/mediaBackendConfig";
import { MediaApiError } from "../utils/media/mediaErrorUtils";
import { resolveInsideRoot } from "../utils/media/mediaPathUtils";
import { parseJsonBody, parseMultipartRequest } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { buildCorsHeaders, buildSecurityHeaders } from "../utils/security/securityHeaderUtils";

const parseUploadMetadata = (value: string | undefined): Record<string, unknown> | undefined => {
  if (!value?.trim()) return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const parseTarget = (fields: Record<string, string>) => ({
  targetType: fields.targetType,
  targetId: fields.targetId || undefined,
  ownerType: fields.ownerType || undefined,
  ownerId: fields.ownerId || undefined,
  assetType: fields.assetType,
  intendedUse: fields.intendedUse,
  accessLevel: fields.accessLevel as "public" | "private" | "admin_only" | "signed" | undefined,
  title: fields.title || undefined,
  description: fields.description || undefined,
  altText: fields.altText || undefined,
  credit: fields.credit || undefined,
  sortOrder: fields.sortOrder ? Number(fields.sortOrder) : undefined,
  metadata: parseUploadMetadata(fields.metadata),
});

const parseRangeHeader = (range: string | undefined, size: number): { start: number; end: number } | null => {
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;
  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    return { start: Math.max(0, size - suffixLength), end: size - 1 };
  }
  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
};

export class AdminMediaController {
  async createDirectUploadSession(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const result = await directMediaUploadSessionService.createUploadSession(body, auth.adminId);
    sendJson(response, result.uploadStrategy === "backend_proxy" ? 200 : 201, result);
  }

  async listDirectUploadSessions(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, uploadSessions: await directMediaUploadSessionService.listSessions() });
  }

  async getDirectUploadSession(request: IncomingMessage, response: ServerResponse, uploadSessionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, session: await directMediaUploadSessionService.getSession(uploadSessionId) });
  }

  async recordDirectUploadPart(request: IncomingMessage, response: ServerResponse, uploadSessionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const result = await directMediaUploadSessionService.recordPart(uploadSessionId, {
      partNumber: Number(body.partNumber),
      etag: typeof body.etag === "string" ? body.etag : undefined,
      checksum: typeof body.checksum === "string" ? body.checksum : undefined,
      sizeBytes: typeof body.sizeBytes === "number" ? body.sizeBytes : undefined,
    });
    sendJson(response, 200, result);
  }

  async directUploadPartUrl(request: IncomingMessage, response: ServerResponse, uploadSessionId: string, partNumber: number) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    sendJson(response, 200, await directMediaUploadSessionService.createPartUrl(uploadSessionId, partNumber));
  }

  async completeDirectUpload(request: IncomingMessage, response: ServerResponse, uploadSessionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    sendJson(response, 200, await directMediaUploadSessionService.completeUpload(uploadSessionId, body));
  }

  async cancelDirectUpload(request: IncomingMessage, response: ServerResponse, uploadSessionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    sendJson(response, 200, await directMediaUploadSessionService.cancelUpload(uploadSessionId, auth.adminId));
  }

  async retryDirectUpload(request: IncomingMessage, response: ServerResponse, uploadSessionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    sendJson(response, 200, await directMediaUploadSessionService.retryPart(uploadSessionId, Number(body.partNumber)));
  }

  async refreshDirectUpload(request: IncomingMessage, response: ServerResponse, uploadSessionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    sendJson(response, 200, await directMediaUploadSessionService.refreshSession(uploadSessionId));
  }

  async cleanupDirectUploads(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.delete");
    sendJson(response, 200, await abandonedUploadCleanupService.runCleanup());
  }

  async upload(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const parsed = await parseMultipartRequest(request);
    const result = await mediaUploadApiService.uploadSingle(parsed.files[0], parseTarget(parsed.fields), auth.adminId);
    sendJson(response, result.success ? 201 : 400, result);
  }

  async uploadBatch(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const parsed = await parseMultipartRequest(request);
    const target = parseTarget(parsed.fields);
    const results = [];
    for (const file of parsed.files) results.push(await mediaUploadApiService.uploadSingle(file, target, auth.adminId));
    sendJson(response, 207, { success: results.every((item) => item.success), results });
  }

  async listUploads(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, uploadJobs: await mediaUploadJobPersistenceService.list() });
  }

  async getUpload(request: IncomingMessage, response: ServerResponse, uploadJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const job = await mediaUploadJobPersistenceService.get(uploadJobId);
    if (!job) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Upload job was not found.", 404, "database");
    sendJson(response, 200, { success: true, uploadJob: job });
  }

  async retryUpload(request: IncomingMessage, response: ServerResponse, uploadJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const job = await mediaUploadJobPersistenceService.update(uploadJobId, { status: "queued", stage: "validation", progress: 0, errors: [] });
    if (!job) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Upload job was not found.", 404, "database");
    sendJson(response, 200, { success: true, uploadJob: job, warnings: ["Retry is queued; resubmitting file bytes is required for full retry."] });
  }

  async cancelUpload(request: IncomingMessage, response: ServerResponse, uploadJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const job = await mediaUploadJobPersistenceService.mark(uploadJobId, "canceled", "error", 100);
    if (!job) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Upload job was not found.", 404, "database");
    sendJson(response, 200, { success: true, uploadJob: job });
  }

  async listAssets(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url ?? "/", `http://${host}`);
    sendJson(response, 200, {
      success: true,
      mediaAssets: await mediaLibraryService.listAssets({
        search: url.searchParams.get("search") ?? undefined,
        assetType: url.searchParams.get("assetType") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        ownerType: url.searchParams.get("ownerType") ?? undefined,
        ownerId: url.searchParams.get("ownerId") ?? undefined,
      }),
    });
  }

  async getAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, ...(await mediaLibraryService.getAssetDetails(assetId)) });
  }

  async patchAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const asset = await mediaAssetPersistenceService.patch(assetId, { ...body, updatedBy: auth.adminId });
    if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
    if (typeof body.assetType === "string" && body.assetType.trim()) {
      const assetType = body.assetType.trim();
      const storageObjects = (await mediaStoragePersistenceService.list()).filter((object) => object.assetId === assetId);
      await Promise.all(storageObjects.map((object) => mediaStoragePersistenceService.update(object.storageObjectId, { assetType })));
      await Promise.all((await mediaVersionRepository.listByAsset(assetId)).map((version) => mediaVersionRepository.update(version.versionId, { assetType })));
    }
    sendJson(response, 200, { success: true, mediaAsset: asset });
  }

  async archiveAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.archive");
    const asset = await mediaAssetPersistenceService.patch(assetId, { status: "archived", updatedBy: auth.adminId });
    if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
    sendJson(response, 200, { success: true, mediaAsset: asset });
  }

  async restoreAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.archive");
    const asset = await mediaAssetPersistenceService.patch(assetId, { status: "draft", updatedBy: auth.adminId });
    if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
    sendJson(response, 200, { success: true, mediaAsset: asset });
  }

  async deleteAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.delete");
    const asset = await mediaAssetPersistenceService.hardDelete(assetId);
    if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
    sendJson(response, 200, { success: true, assetId, mediaAsset: asset, hardDeleted: true });
  }

  async storageHealth(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const { productionStorageHealthService } = await import("../services/media/ProductionStorageHealthService");
    sendJson(response, 200, {
      success: true,
      health: await productionStorageHealthService.getFullHealthReport(),
      config: validateProductionStorageConfig(),
    });
  }

  async storageReconciliation(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, report: await mediaStorageReconciliationService.buildReconciliationReport() });
  }

  async verifyAssetStorage(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, verification: await mediaStorageReconciliationService.verifyAssetStorage(assetId) });
  }

  async verifyFullSongPrivacy(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const violations = await mediaStorageReconciliationService.findFullSongPublicViolations();
    sendJson(response, violations.length ? 409 : 200, { success: violations.length === 0, privateStorageOnly: violations.length === 0, publicUrlAbsent: violations.length === 0, publicMappingAbsent: violations.length === 0, cdnUrlAbsent: violations.length === 0, signedAccessOnly: true, issues: violations });
  }

  async signedUrl(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.generate_signed_url");
    const body = request.method === "POST" ? await parseJsonBody(request).catch(() => ({})) as Record<string, unknown> : {};
    const result = await mediaSignedUrlService.getSignedUrl({
      assetId: typeof body.assetId === "string" ? body.assetId : url.searchParams.get("assetId") ?? undefined,
      storageObjectId: typeof body.storageObjectId === "string" ? body.storageObjectId : url.searchParams.get("storageObjectId") ?? undefined,
      purpose: typeof body.purpose === "string" ? body.purpose : url.searchParams.get("purpose") ?? undefined,
      expiration: typeof body.expirationSeconds === "number" ? body.expirationSeconds : url.searchParams.get("expiration") ? Number(url.searchParams.get("expiration")) : undefined,
      actorId: auth.adminId,
    });
    sendJson(response, 200, { success: true, ...result }, { "Cache-Control": "no-store" });
  }

  async streamStorageObject(request: IncomingMessage, response: ServerResponse, storageObjectId: string) {
    const host = request.headers.host ?? `127.0.0.1:${mediaBackendConfig.port}`;
    const url = new URL(request.url ?? "/", `http://${host}`);
    const hasValidPreviewToken = mediaSignedUrlService.validateLocalPreviewToken({
      storageObjectId,
      purpose: url.searchParams.get("purpose") ?? undefined,
      expires: url.searchParams.get("expires"),
      token: url.searchParams.get("previewToken"),
    });
    if (!hasValidPreviewToken) {
      const auth = await mediaAuthorizationService.authenticate(request);
      mediaAuthorizationService.requirePermission(auth, "media.read");
    }
    const storageObject = await mediaStoragePersistenceService.get(storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    if (storageObject.status === "deleted" || storageObject.status === "archived") {
      throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    }

    let absolutePath: string;
    try {
      absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, storageObject.storagePath);
    } catch {
      throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    }

    const stat = await fs.promises.stat(absolutePath).catch(() => undefined);
    if (!stat?.isFile()) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");

    const method = request.method ?? "GET";
    const range = parseRangeHeader(request.headers.range, stat.size);
    const commonHeaders = {
      ...buildSecurityHeaders(request),
      ...buildCorsHeaders(request),
      "Content-Type": storageObject.mimeType || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    };

    if (range) {
      response.writeHead(206, {
        ...commonHeaders,
        "Content-Length": range.end - range.start + 1,
        "Content-Range": `bytes ${range.start}-${range.end}/${stat.size}`,
      });
      if (method === "HEAD") {
        response.end();
        return;
      }
      fs.createReadStream(absolutePath, { start: range.start, end: range.end }).pipe(response);
      return;
    }

    response.writeHead(200, { ...commonHeaders, "Content-Length": stat.size });
    if (method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(absolutePath).pipe(response);
  }

  async listStorageObjects(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, storageObjects: await mediaStoragePersistenceService.list() });
  }

  async fileExists(request: IncomingMessage, response: ServerResponse, storageObjectId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const storageObject = await mediaStoragePersistenceService.get(storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    const result = await backendStorageProviderRegistry.getActiveProvider().fileExists(storageObject.storagePath);
    sendJson(response, 200, { success: true, ...result });
  }

  async deleteStorageObject(request: IncomingMessage, response: ServerResponse, storageObjectId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.delete");
    const storageObject = await mediaStoragePersistenceService.get(storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    const deleted = await backendStorageProviderRegistry.getActiveProvider().delete(storageObject.storagePath);
    if (!deleted) throw new MediaApiError("MEDIA_STORAGE_FAILED", "Storage object could not be deleted.", 500, "storage", true);
    const updated = await mediaStoragePersistenceService.update(storageObjectId, { status: "deleted", publicUrl: undefined });
    sendJson(response, 200, { success: true, storageObject: updated });
  }

  async promoteStorageObject(request: IncomingMessage, response: ServerResponse, storageObjectId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const storageObject = await mediaStoragePromotionService.promoteStorageObjectToPublic(storageObjectId, {
      actorId: auth.adminId,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      forceFullSongPublic: body.forceFullSongPublic === true,
    });
    sendJson(response, 200, { success: true, storageObject });
  }

  async demoteStorageObject(request: IncomingMessage, response: ServerResponse, storageObjectId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const storageObject = await mediaStoragePromotionService.demoteStorageObjectToPrivate(storageObjectId, {
      actorId: auth.adminId,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    });
    sendJson(response, 200, { success: true, storageObject });
  }

  async demoteAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    const body = await parseJsonBody(request).catch(() => ({})) as Record<string, unknown>;
    sendJson(response, 200, await mediaStorageDemotionService.demoteAsset(assetId, {
      actorId: auth.adminId,
      reason: typeof body.reason === "string" ? body.reason : undefined,
    }));
  }

  async getAssetVersions(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, history: await mediaLibraryService.getVersionHistory(assetId) });
  }

  async replaceAssetFromStorage(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.replace");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    if (typeof body.storageObjectId !== "string") throw new MediaApiError("MEDIA_REQUEST_INVALID", "storageObjectId is required.", 400, "validation");
    sendJson(response, 200, await mediaLibraryService.replaceFromStorageObject(assetId, body.storageObjectId, {
      actorId: auth.adminId,
      changeReason: typeof body.changeReason === "string" ? body.changeReason : undefined,
      updatePublicFields: body.updatePublicFields !== false,
    }));
  }

  async rollbackAssetVersion(request: IncomingMessage, response: ServerResponse, assetId: string, versionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.replace");
    const body = await parseJsonBody(request).catch(() => ({})) as Record<string, unknown>;
    sendJson(response, 200, await mediaLibraryService.rollbackToVersion(assetId, versionId, {
      actorId: auth.adminId,
      changeReason: typeof body.changeReason === "string" ? body.changeReason : undefined,
      updatePublicFields: body.updatePublicFields !== false,
    }));
  }

  async archiveAssetVersion(request: IncomingMessage, response: ServerResponse, assetId: string, versionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.archive");
    sendJson(response, 200, await mediaLibraryService.archiveVersion(assetId, versionId, auth.adminId));
  }

  async linkAsset(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.link");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    for (const key of ["entityType", "entityId", "fieldKey"]) {
      if (typeof body[key] !== "string") throw new MediaApiError("MEDIA_REQUEST_INVALID", `${key} is required.`, 400, "validation");
    }
    sendJson(response, 200, await mediaLibraryService.linkAsset(assetId, {
      entityType: String(body.entityType),
      entityId: String(body.entityId),
      fieldKey: String(body.fieldKey),
      intendedUse: typeof body.intendedUse === "string" ? body.intendedUse : undefined,
      actorId: auth.adminId,
      updateEntityField: body.updateEntityField !== false,
      metadata: typeof body.metadata === "object" && body.metadata ? body.metadata as Record<string, unknown> : undefined,
    }));
  }

  async detachAssetLink(request: IncomingMessage, response: ServerResponse, linkId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.link");
    sendJson(response, 200, await mediaLibraryService.detachLink(linkId, auth.adminId));
  }

  async getAssetDependencies(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, dependencies: await mediaLibraryService.getDependencies(assetId) });
  }

  async generateAudioPreview(request: IncomingMessage, response: ServerResponse, assetId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.upload");
    const body = await parseJsonBody(request).catch(() => ({})) as Record<string, unknown>;
    sendJson(response, 201, await audioPreviewGenerationService.generateFromFullSongAsset(assetId, {
      actorId: auth.adminId,
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 30,
      startSeconds: typeof body.startSeconds === "number" ? body.startSeconds : 0,
      title: typeof body.title === "string" ? body.title : undefined,
    }));
  }
}

export const adminMediaController = new AdminMediaController();
