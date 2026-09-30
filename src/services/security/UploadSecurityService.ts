import type { MediaUploadTarget } from "../../models/media";
import type {
  UploadSecurityCheck,
  UploadSecurityCheckResult,
  UploadSecurityPolicy,
} from "../../models/security";
import { recordMediaAuditEvent } from "../admin/AdminAuditService";
import { sanitizeUploadFileName, getAllFileExtensions, getSafeFileExtension } from "../../utils/security/fileNameSanitizationUtils";
import { assertSafeStoragePath, hasPathTraversal } from "../../utils/security/pathSafetyUtils";
import {
  getDefaultUploadSecurityPolicy,
  hasUnsafeDoubleExtension,
  isAllowedExtension,
  isAllowedMimeType,
  isBlockedExtension,
  isBlockedMimeType,
  mimeMatchesExtension,
} from "../../utils/security/mimeSafetyUtils";
import { sanitizeUploadMetadata as sanitizeMetadata } from "../../utils/security/uploadMetadataSanitizationUtils";
import { validatePublicMediaUrl as validatePublicUrl } from "../../utils/security/publicUrlSafetyUtils";
import { sanitizeUploadError as sanitizeError } from "../../utils/security/uploadErrorSanitizationUtils";

const validAccessLevels = new Set(["public", "private", "signed", "admin_only"]);
const safeTargetValue = (value: string | null | undefined): boolean =>
  !value || (!hasPathTraversal(value) && !/[\\/\0]/.test(value) && !/^[a-z]+:/i.test(value));

const toUploadTargetMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean | null> =>
  Object.fromEntries(
    Object.entries(sanitizeMetadata(metadata)).filter((entry): entry is [string, string | number | boolean | null] => {
      const value = entry[1];
      return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }),
  );

const check = (
  name: string,
  status: UploadSecurityCheck["status"],
  severity: UploadSecurityCheck["severity"],
  code: string,
  message: string,
  metadata?: UploadSecurityCheck["metadata"],
): UploadSecurityCheck => ({
  checkId: `${code}-${Math.random().toString(36).slice(2, 8)}`,
  name,
  status,
  severity,
  code,
  message,
  metadata,
});

export class UploadSecurityService {
  getDefaultPolicy(): UploadSecurityPolicy {
    return getDefaultUploadSecurityPolicy();
  }

  runSecurityChecks(
    file: File,
    uploadTarget: MediaUploadTarget | null | undefined,
    policy: UploadSecurityPolicy = this.getDefaultPolicy(),
  ): UploadSecurityCheckResult {
    const fileName = file.name || "upload";
    const sanitizedFileName = this.sanitizeFileName(fileName, policy);
    const mimeType = file.type || "";
    const fileExtension = getSafeFileExtension(fileName);
    const checks: UploadSecurityCheck[] = [
      ...this.validateFileName(fileName, sanitizedFileName, policy),
      ...this.validateFileExtension(fileName, policy),
      ...this.validateMimeType(file, policy),
      ...this.validateMimeExtensionMatch(file, policy),
      ...this.detectUnsafeDoubleExtensions(fileName, policy),
      ...this.validateUploadTarget(uploadTarget, file, policy),
      check("Virus scan readiness", "skipped", "info", "virus_scan_not_configured", "Virus scanning is not configured yet.", { status: "not_configured" }),
    ];
    const blocked = checks.some((item) => item.severity === "blocking" || item.status === "failed");
    if (blocked) this.recordSecurityAudit("unsafe_upload_blocked", fileName, uploadTarget, checks);
    return {
      safe: !blocked,
      blocked,
      warnings: checks.filter((item) => item.status === "warning").map((item) => item.message),
      checks,
      fileName,
      sanitizedFileName,
      mimeType,
      fileExtension,
      assetType: uploadTarget?.assetType,
      uploadTarget: uploadTarget ? { ...uploadTarget, metadata: toUploadTargetMetadata(uploadTarget.metadata) } : undefined,
      scanStatus: {
        status: "not_configured",
        checkedAt: new Date().toISOString(),
      },
      checkedAt: new Date().toISOString(),
      metadata: {
        policyId: policy.policyId,
        sanitizedChanged: sanitizedFileName !== fileName,
      },
    };
  }

  sanitizeFileName(fileName: string, policy: UploadSecurityPolicy = this.getDefaultPolicy()): string {
    return sanitizeUploadFileName(fileName, policy.maxFileNameLength);
  }

  validateFileExtension(fileName: string, policy: UploadSecurityPolicy = this.getDefaultPolicy()): UploadSecurityCheck[] {
    const extension = getSafeFileExtension(fileName);
    if (!extension) return [check("File extension", "failed", "blocking", "extension_missing", "File extension is required.")];
    if (isBlockedExtension(extension, policy)) return [check("File extension", "failed", "blocking", "extension_blocked", `.${extension} files are blocked.`)];
    if (!isAllowedExtension(extension, policy)) return [check("File extension", "failed", "blocking", "extension_not_allowed", `.${extension} files are not allowed.`)];
    if ((extension === "svg" && !policy.allowSvg) || (extension === "gif" && !policy.allowGif)) {
      return [check("File extension", "failed", "blocking", `${extension}_disabled`, `.${extension} uploads are disabled by default.`)];
    }
    return [check("File extension", "passed", "info", "extension_allowed", "File extension is allowed.")];
  }

  validateMimeType(file: File, policy: UploadSecurityPolicy = this.getDefaultPolicy()): UploadSecurityCheck[] {
    const mimeType = file.type || "";
    if (!mimeType) {
      return [check("MIME type", policy.allowUnknownMime ? "warning" : "failed", policy.allowUnknownMime ? "warning" : "blocking", "mime_missing", "File MIME type is required.")];
    }
    if (isBlockedMimeType(mimeType, policy)) return [check("MIME type", "failed", "blocking", "mime_blocked", `${mimeType} uploads are blocked.`)];
    if (!isAllowedMimeType(mimeType, policy)) return [check("MIME type", "failed", "blocking", "mime_not_allowed", `${mimeType} is not an allowed media MIME type.`)];
    if ((mimeType === "image/svg+xml" && !policy.allowSvg) || (mimeType === "image/gif" && !policy.allowGif)) {
      return [check("MIME type", "failed", "blocking", "mime_disabled", `${mimeType} uploads are disabled by default.`)];
    }
    return [check("MIME type", "passed", "info", "mime_allowed", "MIME type is allowed.")];
  }

  validateMimeExtensionMatch(file: File, policy: UploadSecurityPolicy = this.getDefaultPolicy()): UploadSecurityCheck[] {
    if (!policy.requireMimeExtensionMatch || !file.type) return [check("MIME extension match", "skipped", "info", "mime_extension_skipped", "MIME/extension matching is disabled.")];
    return mimeMatchesExtension(file.name, file.type)
      ? [check("MIME extension match", "passed", "info", "mime_extension_match", "MIME type and extension match.")]
      : [check("MIME extension match", "failed", "blocking", "mime_extension_mismatch", "File MIME type does not match its extension.")];
  }

  detectUnsafeDoubleExtensions(fileName: string, policy: UploadSecurityPolicy = this.getDefaultPolicy()): UploadSecurityCheck[] {
    const extensions = getAllFileExtensions(fileName);
    if (hasUnsafeDoubleExtension(fileName, policy)) {
      return [check("Double extension", "failed", "blocking", "unsafe_double_extension", "File name includes an unsafe extension.", { extensions: extensions.join(",") })];
    }
    if (extensions.length > 1) return [check("Double extension", "warning", "warning", "double_extension_detected", "File name contains multiple extensions.", { extensions: extensions.join(",") })];
    return [check("Double extension", "passed", "info", "double_extension_safe", "No unsafe double extension detected.")];
  }

  validateUploadTarget(uploadTarget: MediaUploadTarget | null | undefined, file?: File, policy: UploadSecurityPolicy = this.getDefaultPolicy()): UploadSecurityCheck[] {
    if (!uploadTarget) {
      return [check("Upload target", policy.requireUploadTarget ? "failed" : "warning", policy.requireUploadTarget ? "blocking" : "warning", "upload_target_missing", "Upload target is required.")];
    }
    const issues: UploadSecurityCheck[] = [];
    if (!uploadTarget.targetType) issues.push(check("Upload target", "failed", "blocking", "target_type_missing", "Upload target type is required."));
    if (!uploadTarget.assetType) issues.push(check("Upload target", "failed", "blocking", "asset_type_missing", "Upload asset type is required."));
    if (!uploadTarget.intendedUse) issues.push(check("Upload target", "failed", "blocking", "intended_use_missing", "Upload intended use is required."));
    if (!validAccessLevels.has(uploadTarget.accessLevel)) issues.push(check("Upload target", "failed", "blocking", "access_level_invalid", "Upload access level is invalid."));
    for (const [field, value] of Object.entries({ targetId: uploadTarget.targetId, ownerId: uploadTarget.ownerId, ownerType: uploadTarget.ownerType })) {
      if (!safeTargetValue(value)) issues.push(check("Upload target", "failed", "blocking", "target_path_unsafe", `${field} contains unsafe path characters.`));
    }
    if (file && uploadTarget.assetType === "full_song" && uploadTarget.accessLevel === "public") {
      issues.push(check("Upload target", "failed", "blocking", "full_song_public_blocked", "Full song uploads cannot be public by default."));
    }
    return issues.length ? issues : [check("Upload target", "passed", "info", "upload_target_safe", "Upload target is safe.")];
  }

  validateStoragePath(path: string): string {
    return assertSafeStoragePath(path);
  }

  sanitizeUploadMetadata(metadata: Record<string, unknown> | null | undefined) {
    return sanitizeMetadata(metadata);
  }

  validatePublicMediaUrl(url: string | null | undefined): boolean {
    return validatePublicUrl(url);
  }

  sanitizeUploadError(error: unknown) {
    return sanitizeError(error);
  }

  private validateFileName(fileName: string, sanitizedFileName: string, policy: UploadSecurityPolicy): UploadSecurityCheck[] {
    const checks: UploadSecurityCheck[] = [];
    if (!fileName.trim()) checks.push(check("Filename", "failed", "blocking", "filename_empty", "File name is required."));
    if (fileName.length > policy.maxFileNameLength) checks.push(check("Filename", "failed", "blocking", "filename_too_long", "File name is too long."));
    if (policy.blockPathTraversal && hasPathTraversal(fileName)) checks.push(check("Filename", "failed", "blocking", "filename_path_traversal", "File name contains unsafe path traversal."));
    if (/[\u0000-\u001f\u007f]/.test(fileName)) checks.push(check("Filename", "failed", "blocking", "filename_control_chars", "File name contains control characters."));
    if (checks.length) return checks;
    if (policy.sanitizeFileName && sanitizedFileName !== fileName) return [check("Filename", "warning", "warning", "filename_sanitized", `File name will be sanitized to ${sanitizedFileName}.`, { sanitizedFileName })];
    return [check("Filename", "passed", "info", "filename_safe", "File name is safe.")];
  }

  private recordSecurityAudit(action: string, fileName: string, uploadTarget: MediaUploadTarget | null | undefined, checks: UploadSecurityCheck[]) {
    recordMediaAuditEvent({
      actionType: "validate",
      entityId: uploadTarget?.ownerId ?? uploadTarget?.targetId ?? "unassigned",
      entityLabel: fileName,
      route: "/admin/media",
      summary: `Blocked unsafe upload "${fileName}"`,
      metadata: {
        action,
        targetType: uploadTarget?.targetType ?? null,
        assetType: uploadTarget?.assetType ?? null,
        failedChecks: checks.filter((item) => item.status === "failed").map((item) => item.code).join(","),
      },
    });
  }
}

export const uploadSecurityService = new UploadSecurityService();
