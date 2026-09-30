import type {
  CreateDirectUploadSessionRequest,
  DirectMediaUploadSession,
  DirectUploadPart,
  DirectUploadPartAuthorization,
  DirectUploadSessionResponse,
  MediaAssetUploadOptions,
  MediaUploadResult,
  MediaUploadTarget,
} from "../../models/media";
import { createFileChunks, getFileChunk, sortCompletedParts, validateCompletedParts } from "../../utils/media/fileChunkUtils";
import { mediaStorageService } from "../storage";

const getBackendUploadHeaders = (json = true): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface DirectUploadRuntimeOptions extends MediaAssetUploadOptions {
  parallelParts?: number;
  onPartProgress?: (partNumber: number, progress: number) => void;
  signal?: AbortSignal;
}

export class DirectMediaUploadService {
  private readonly maxParallelParts = Number.parseInt(import.meta.env.VITE_DIRECT_UPLOAD_PARALLEL_PARTS ?? "", 10) || 3;

  async createUploadSession(
    file: File,
    uploadTarget: MediaUploadTarget,
    options: DirectUploadRuntimeOptions = {},
  ): Promise<DirectUploadSessionResponse> {
    const config = mediaStorageService.getStorageConfig();
    if (!config.uploadApiBaseUrl) return { success: false, uploadStrategy: "backend_proxy", errors: ["Backend upload API is not configured."] };
    const payload: CreateDirectUploadSessionRequest = {
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      assetType: uploadTarget.assetType,
      targetType: uploadTarget.targetType,
      targetId: uploadTarget.targetId,
      ownerType: uploadTarget.ownerType,
      ownerId: uploadTarget.ownerId,
      intendedUse: uploadTarget.intendedUse,
      accessLevel: options.accessLevel ?? uploadTarget.accessLevel,
      metadata: {
        ...(uploadTarget.metadata ?? {}),
        ...(options.metadata ?? {}),
        uploadedFrom: "direct_upload",
      },
    };
    const response = await fetch(`${config.uploadApiBaseUrl.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
      body: JSON.stringify(payload),
    });
    return this.readJson(response);
  }

  async uploadFile(
    file: File,
    sessionResponse: DirectUploadSessionResponse,
    options: DirectUploadRuntimeOptions = {},
  ): Promise<MediaUploadResult> {
    if (sessionResponse.uploadStrategy === "backend_proxy") {
      return { success: false, warnings: sessionResponse.warnings, errors: ["Backend selected proxy upload fallback."], metadata: { uploadStrategy: "backend_proxy" } };
    }
    if (sessionResponse.uploadStrategy === "single_presigned" && sessionResponse.singleUploadUrl) {
      return this.uploadSinglePresigned(file, sessionResponse, options);
    }
    return this.uploadMultipart(file, sessionResponse, options);
  }

  async uploadSinglePresigned(
    file: File,
    sessionResponse: DirectUploadSessionResponse,
    options: DirectUploadRuntimeOptions = {},
  ): Promise<MediaUploadResult> {
    if (!sessionResponse.singleUploadUrl || !sessionResponse.uploadSessionId) {
      return { success: false, errors: ["Single presigned upload URL is missing."] };
    }
    const response = await fetch(sessionResponse.singleUploadUrl, {
      method: "PUT",
      body: file,
      headers: sessionResponse.requiredHeaders,
      signal: options.signal,
    });
    if (!response.ok) return { success: false, errors: [`Direct upload failed with status ${response.status}.`] };
    return this.completeUpload(sessionResponse.uploadSessionId, [{ partNumber: 1, etag: response.headers.get("etag")?.replace(/"/g, "") ?? "single-upload" }]);
  }

  async uploadMultipart(
    file: File,
    sessionResponse: DirectUploadSessionResponse,
    options: DirectUploadRuntimeOptions = {},
  ): Promise<MediaUploadResult> {
    if (!sessionResponse.uploadSessionId || !sessionResponse.partSizeBytes || !sessionResponse.totalParts) {
      return { success: false, errors: ["Multipart upload session is incomplete."] };
    }
    const chunks = createFileChunks(file, sessionResponse.partSizeBytes);
    const completedParts: DirectUploadPart[] = [];
    const initialAuthorizations = new Map((sessionResponse.parts ?? []).map((part) => [part.partNumber, part]));
    const queue = [...chunks];
    let failed = false;
    let errorMessage: string | undefined;
    const runNext = async (): Promise<void> => {
      if (failed || options.signal?.aborted) return;
      const chunk = queue.shift();
      if (!chunk) return;
      try {
        const authorization = initialAuthorizations.get(chunk.partNumber) ?? await this.getPartUploadUrl(sessionResponse.uploadSessionId as string, chunk.partNumber);
        const uploaded = await this.uploadPart(getFileChunk(file, chunk), chunk.partNumber, authorization, options);
        completedParts.push({ partNumber: chunk.partNumber, sizeBytes: chunk.sizeBytes, etag: uploaded.etag, status: "completed", attempts: 1, uploadedAt: new Date().toISOString() });
        await this.recordCompletedPart(sessionResponse.uploadSessionId as string, completedParts[completedParts.length - 1]);
        options.onProgress?.(Math.round((completedParts.length / chunks.length) * 95));
      } catch (error) {
        failed = true;
        errorMessage = error instanceof Error ? error.message : "Multipart upload failed.";
      }
      await runNext();
    };
    const workers = Array.from({ length: Math.min(options.parallelParts ?? this.maxParallelParts, queue.length) }, () => runNext());
    await Promise.all(workers);
    if (failed) return { success: false, errors: [errorMessage ?? "Multipart upload failed."], metadata: { uploadSessionId: sessionResponse.uploadSessionId } };
    const validation = validateCompletedParts(completedParts, sessionResponse.totalParts);
    if (!validation.valid) return { success: false, errors: validation.errors, metadata: { uploadSessionId: sessionResponse.uploadSessionId } };
    return this.completeUpload(sessionResponse.uploadSessionId, sortCompletedParts(completedParts));
  }

  async uploadPart(
    fileChunk: Blob,
    partNumber: number,
    authorization: DirectUploadPartAuthorization,
    options: DirectUploadRuntimeOptions = {},
  ): Promise<{ etag: string }> {
    options.onPartProgress?.(partNumber, 0);
    const response = await fetch(authorization.uploadUrl, {
      method: "PUT",
      body: fileChunk,
      headers: authorization.requiredHeaders,
      signal: options.signal,
    });
    options.onPartProgress?.(partNumber, 100);
    if (!response.ok) throw new Error(`Part ${partNumber} failed with status ${response.status}.`);
    return { etag: response.headers.get("etag")?.replace(/"/g, "") ?? `part-${partNumber}` };
  }

  async retryPart(uploadSessionId: string, partNumber: number) {
    const config = mediaStorageService.getStorageConfig();
    const response = await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}/retry`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
      body: JSON.stringify({ partNumber }),
    });
    return this.readJson(response);
  }

  pauseUpload(uploadSessionId: string) {
    return { success: true, uploadSessionId, status: "paused" as const, warnings: ["Pause stops new frontend scheduling; active requests may finish."] };
  }

  resumeUpload(uploadSessionId: string) {
    return this.refreshUploadSession(uploadSessionId);
  }

  async completeUpload(uploadSessionId: string, completedParts: readonly Pick<DirectUploadPart, "partNumber" | "etag">[]): Promise<MediaUploadResult> {
    const config = mediaStorageService.getStorageConfig();
    const response = await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}/complete`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
      body: JSON.stringify({ completedParts }),
    });
    const payload = await this.readJson(response);
    return {
      success: payload.success === true,
      assetId: payload.mediaAsset?.assetId,
      storageObjectId: payload.storageObject?.storageObjectId,
      mediaAsset: payload.mediaAsset,
      storageObject: payload.storageObject,
      publicUrl: payload.publicUrl ?? payload.storageObject?.publicUrl,
      warnings: payload.warnings,
      errors: payload.errors,
      metadata: { ...(payload.metadata ?? {}), uploadSessionId, backendPersistent: true },
    };
  }

  async cancelUpload(uploadSessionId: string) {
    const config = mediaStorageService.getStorageConfig();
    const response = await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}/cancel`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
    });
    return this.readJson(response);
  }

  async refreshUploadSession(uploadSessionId: string): Promise<DirectUploadSessionResponse> {
    const config = mediaStorageService.getStorageConfig();
    const response = await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}/refresh`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
    });
    return this.readJson(response);
  }

  async getUploadSession(uploadSessionId: string): Promise<{ success: boolean; session?: DirectMediaUploadSession; errors?: string[] }> {
    const config = mediaStorageService.getStorageConfig();
    const response = await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}`, {
      headers: getBackendUploadHeaders(false),
    });
    return this.readJson(response);
  }

  private async getPartUploadUrl(uploadSessionId: string, partNumber: number): Promise<DirectUploadPartAuthorization> {
    const config = mediaStorageService.getStorageConfig();
    const response = await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}/parts/${partNumber}/url`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
    });
    const payload = await this.readJson(response);
    const authorization = payload.parts?.[0];
    if (!authorization) throw new Error(`Part ${partNumber} upload URL was not returned.`);
    return authorization;
  }

  private async recordCompletedPart(uploadSessionId: string, part: DirectUploadPart) {
    const config = mediaStorageService.getStorageConfig();
    await fetch(`${config.uploadApiBaseUrl?.replace(/\/+$/, "")}/api/admin/media/direct-upload/sessions/${uploadSessionId}/parts`, {
      method: "POST",
      headers: getBackendUploadHeaders(),
      body: JSON.stringify(part),
    });
  }

  private async readJson(response: Response): Promise<any> {
    const payload = await response.json().catch(() => ({ success: false, errors: ["Response was not valid JSON."] }));
    if (!response.ok) {
      return { success: false, uploadStrategy: payload.uploadStrategy ?? "backend_proxy", warnings: payload.warnings, errors: payload.errors ?? [payload.error?.message ?? `Request failed with status ${response.status}.`] };
    }
    return payload;
  }
}

export const directMediaUploadService = new DirectMediaUploadService();
