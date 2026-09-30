import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { MediaAccessLevel, MediaUploadTargetInput } from "../../models/mediaModels";
import { buildNamespacedStoragePath } from "../../utils/media/storagePrefixUtils";
import { isPublicStoragePath } from "../../utils/media/storageUrlUtils";
import { hasPathTraversal, sanitizeFileName } from "../../utils/media/mediaPathUtils";

export class MediaStoragePathService {
  buildDraftAssetPath(context: { target: MediaUploadTargetInput; fileName: string }) {
    return this.buildPrivateAssetPath(context);
  }

  buildPublicAssetPath(context: { target: MediaUploadTargetInput; fileName: string }) {
    return buildNamespacedStoragePath({ accessLevel: "public", target: context.target, fileName: context.fileName, publicPrefix: mediaBackendConfig.publicPrefix, privatePrefix: mediaBackendConfig.privatePrefix });
  }

  buildPrivateAssetPath(context: { target: MediaUploadTargetInput; fileName: string; accessLevel?: MediaAccessLevel }) {
    return buildNamespacedStoragePath({ accessLevel: context.accessLevel ?? "admin_only", target: context.target, fileName: context.fileName, publicPrefix: mediaBackendConfig.publicPrefix, privatePrefix: mediaBackendConfig.privatePrefix });
  }

  buildProcessingPath(context: { assetId: string; processingJobId: string; fileName: string }) {
    return ["processing", this.clean(context.assetId), this.clean(context.processingJobId), sanitizeFileName(context.fileName)].join("/");
  }

  buildQuarantinePath(context: { uploadJobId: string; fileName: string }) {
    return ["quarantine", this.clean(context.uploadJobId), sanitizeFileName(context.fileName)].join("/");
  }

  buildDerivativePath(context: { assetId: string; versionId: string; derivativeType: string; fileName: string; public?: boolean }) {
    return [context.public ? mediaBackendConfig.publicPrefix : "processing", "derivatives", this.clean(context.assetId), this.clean(context.versionId), this.clean(context.derivativeType), sanitizeFileName(context.fileName)].join("/");
  }

  validateStoragePath(path: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!path || path.length > 1024) errors.push("Storage path is missing or too long.");
    if (hasPathTraversal(path) || path.includes("\\") || /^[a-z]+:/i.test(path) || path.includes("\0")) errors.push("Storage path is unsafe.");
    if (path.startsWith("/") || path.includes("//")) errors.push("Storage path must be normalized and relative.");
    return { valid: errors.length === 0, errors };
  }

  getNamespace(path: string): string {
    return path.split("/")[0] ?? "";
  }

  isPublicPath(path: string): boolean {
    return isPublicStoragePath(path, mediaBackendConfig.publicPrefix);
  }

  isPrivatePath(path: string): boolean {
    return path.startsWith(`${mediaBackendConfig.privatePrefix}/`) || path.startsWith("processing/") || path.startsWith("quarantine/");
  }

  private clean(value: string) {
    return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
  }
}

export const mediaStoragePathService = new MediaStoragePathService();
