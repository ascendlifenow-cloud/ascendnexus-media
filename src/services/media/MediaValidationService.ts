import type {
  MediaFileValidationResult,
  MediaUploadTarget,
  MediaValidationConfig,
  MediaValidationMessage,
} from "../../models/media";
import type { UploadSecurityCheck } from "../../models/security";
import { getFileExtension } from "../../utils/media/fileNameUtils";
import {
  createValidationMessage,
  getCategoryFromExtension,
  getFileNameSafetyMessages,
  isExtensionCompatibleWithAssetType,
  isMimeCompatibleWithUploadTarget,
} from "../../utils/media/fileValidationUtils";
import { getMediaCategoryFromMimeType } from "../../utils/media/mediaTypeUtils";
import { getAudioDuration, getImageDimensions } from "../../utils/media/mediaMetadataUtils";
import { defaultMediaValidationConfig } from "../../utils/media/mediaValidationConfig";
import { uploadSecurityService } from "../security";

const splitMessages = (messages: MediaValidationMessage[]) => ({
  blockingErrors: messages.filter((message) => message.severity === "error"),
  warnings: messages.filter((message) => message.severity === "warning"),
  info: messages.filter((message) => message.severity === "info"),
});

const securityCheckToValidationMessage = (check: UploadSecurityCheck): MediaValidationMessage => (
  createValidationMessage(
    check.severity === "blocking" || check.status === "failed" ? "error" : check.status === "warning" ? "warning" : "info",
    `security_${check.code}`,
    check.message,
    "security",
    check.metadata,
  )
);

export class MediaValidationService {
  async validateFile(
    file: File,
    uploadTarget: MediaUploadTarget,
    config: MediaValidationConfig = defaultMediaValidationConfig,
  ): Promise<MediaFileValidationResult> {
    try {
      const securityResult = uploadSecurityService.runSecurityChecks(file, uploadTarget);
      const messages = [
        ...securityResult.checks.map(securityCheckToValidationMessage),
        ...this.validateFileName(file),
        ...this.validateFileSize(file, uploadTarget, config),
        ...this.validateMimeType(file, uploadTarget, config),
        ...this.validateExtension(file, uploadTarget, config),
        ...this.validateMimeExtensionMatch(file, config),
        ...this.validateUploadTargetCompatibility(file, uploadTarget),
        ...(await this.validateImageDimensions(file, uploadTarget, config)),
        ...(await this.validateAudioDuration(file, uploadTarget, config)),
      ];
      const grouped = splitMessages(messages);
      const fileExtension = getFileExtension(file.name);
      return {
        valid: grouped.blockingErrors.length === 0,
        ...grouped,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        fileExtension,
        mediaCategory: getMediaCategoryFromMimeType(file.type),
        assetType: uploadTarget.assetType,
        metadata: {
          securitySafe: securityResult.safe,
          securityBlocked: securityResult.blocked,
          securityCheckCount: securityResult.checks.length,
          sanitizedFileName: securityResult.sanitizedFileName,
          scanStatus: securityResult.scanStatus?.status ?? null,
        },
      };
    } catch (error) {
      const message = createValidationMessage("error", "validation_failed", error instanceof Error ? error.message : "Validation failed.");
      const grouped = splitMessages([message]);
      return {
        valid: false,
        ...grouped,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        fileExtension: getFileExtension(file.name),
        mediaCategory: getMediaCategoryFromMimeType(file.type),
        assetType: uploadTarget.assetType,
      };
    }
  }

  async validateFiles(
    files: readonly File[],
    uploadTarget: MediaUploadTarget,
    config: MediaValidationConfig = defaultMediaValidationConfig,
  ): Promise<MediaFileValidationResult[]> {
    return Promise.all(files.map((file) => this.validateFile(file, uploadTarget, config)));
  }

  validateFileName(file: File): MediaValidationMessage[] {
    return getFileNameSafetyMessages(file);
  }

  validateFileSize(file: File, uploadTarget: MediaUploadTarget, config: MediaValidationConfig): MediaValidationMessage[] {
    const max = config.maxFileSizeByAssetType[uploadTarget.assetType];
    if (max && file.size > max) {
      return [createValidationMessage("error", "file_too_large", `${file.name} exceeds the maximum allowed size.`, "fileSizeBytes", { maxFileSizeBytes: max })];
    }
    return [];
  }

  validateMimeType(file: File, uploadTarget: MediaUploadTarget, config: MediaValidationConfig): MediaValidationMessage[] {
    if (!file.type) {
      return config.allowUnknownMime
        ? [createValidationMessage("warning", "mime_missing", "File MIME type could not be detected.", "mimeType")]
        : [createValidationMessage("error", "mime_missing", "File MIME type is required.", "mimeType")];
    }
    const category = getMediaCategoryFromMimeType(file.type);
    const allowed = config.allowedMimeTypesByCategory[category] ?? [];
    if (category === "image" && file.type === "image/svg+xml" && !config.allowSvg) return [createValidationMessage("error", "svg_disabled", "SVG uploads are disabled by default.", "mimeType")];
    if (category === "image" && file.type === "image/gif" && !config.allowGif) return [createValidationMessage("error", "gif_disabled", "GIF uploads are disabled by default.", "mimeType")];
    if (allowed.length && !allowed.includes(file.type)) return [createValidationMessage("error", "mime_not_allowed", `${file.type} is not allowed for this media category.`, "mimeType")];
    if (!isMimeCompatibleWithUploadTarget(file.type, uploadTarget)) return [createValidationMessage("error", "mime_target_mismatch", "File MIME type does not match the upload target.", "mimeType")];
    return [];
  }

  validateExtension(file: File, uploadTarget: MediaUploadTarget, config: MediaValidationConfig): MediaValidationMessage[] {
    const extension = getFileExtension(file.name);
    if (!extension) return [createValidationMessage("error", "extension_missing", "File extension is required.", "fileExtension")];
    const category = getCategoryFromExtension(extension);
    const allowed = config.allowedExtensionsByCategory[category] ?? [];
    if (allowed.length && !allowed.includes(extension)) return [createValidationMessage("error", "extension_not_allowed", `.${extension} files are not allowed for this media category.`, "fileExtension")];
    if (!isExtensionCompatibleWithAssetType(extension, uploadTarget.assetType)) return [createValidationMessage("error", "extension_target_mismatch", "File extension does not match the upload target.", "fileExtension")];
    return [];
  }

  validateMimeExtensionMatch(file: File, config: MediaValidationConfig): MediaValidationMessage[] {
    if (!config.strictMimeExtensionMatch || !file.type) return [];
    const extension = getFileExtension(file.name);
    const mimeCategory = getMediaCategoryFromMimeType(file.type);
    const extensionCategory = getCategoryFromExtension(extension);
    if (extensionCategory !== "custom" && mimeCategory !== extensionCategory) {
      return [createValidationMessage("error", "mime_extension_mismatch", "File extension and MIME type do not match.", "fileExtension")];
    }
    return [];
  }

  async validateImageDimensions(file: File, uploadTarget: MediaUploadTarget, config: MediaValidationConfig): Promise<MediaValidationMessage[]> {
    if (!file.type.startsWith("image/")) return [];
    const rule = config.dimensionRulesByAssetType[uploadTarget.assetType];
    if (!rule) return [];
    try {
      const dimensions = await getImageDimensions(file);
      const dimensionMetadata = { width: dimensions.width, height: dimensions.height };
      const messages: MediaValidationMessage[] = [];
      if (rule.minWidth && dimensions.width < rule.minWidth || rule.minHeight && dimensions.height < rule.minHeight) {
        messages.push(createValidationMessage(rule.blockBelowMinimum ? "error" : "warning", "image_dimensions_small", "Image is smaller than the recommended minimum.", "dimensions", dimensionMetadata));
      }
      if (rule.recommendedWidth && dimensions.width < rule.recommendedWidth || rule.recommendedHeight && dimensions.height < rule.recommendedHeight) {
        messages.push(createValidationMessage("info", "image_dimensions_below_recommended", "Image is below the recommended dimensions.", "dimensions", dimensionMetadata));
      }
      if (rule.aspectRatio) {
        const ratio = dimensions.width / dimensions.height;
        const tolerance = rule.aspectRatioTolerance ?? 0.1;
        if (Math.abs(ratio - rule.aspectRatio) > tolerance) {
          messages.push(createValidationMessage("warning", "image_aspect_ratio", "Image aspect ratio does not match the recommended shape.", "dimensions", dimensionMetadata));
        }
      }
      return messages;
    } catch {
      return [createValidationMessage("warning", "image_metadata_unavailable", "Image dimensions could not be read before upload.", "dimensions")];
    }
  }

  async validateAudioDuration(file: File, uploadTarget: MediaUploadTarget, config: MediaValidationConfig): Promise<MediaValidationMessage[]> {
    if (!file.type.startsWith("audio/")) return [];
    const rule = config.durationRulesByAssetType[uploadTarget.assetType];
    if (!rule) return [];
    try {
      const duration = await getAudioDuration(file);
      const messages: MediaValidationMessage[] = [];
      if (rule.minSeconds && duration < rule.minSeconds) messages.push(createValidationMessage("warning", "audio_too_short", "Audio duration is shorter than recommended.", "duration", { durationSeconds: duration }));
      if (rule.maxSeconds && duration > rule.maxSeconds) messages.push(createValidationMessage("warning", "audio_too_long", "Audio duration is longer than recommended.", "duration", { durationSeconds: duration }));
      return messages;
    } catch {
      return [createValidationMessage("warning", "audio_metadata_unavailable", "Audio duration could not be read before upload.", "duration")];
    }
  }

  validateUploadTargetCompatibility(file: File, uploadTarget: MediaUploadTarget): MediaValidationMessage[] {
    const messages: MediaValidationMessage[] = [];
    if (uploadTarget.intendedUse.includes("audio") && !file.type.startsWith("audio/")) messages.push(createValidationMessage("error", "target_requires_audio", "This upload target requires an audio file.", "mimeType"));
    if ((uploadTarget.intendedUse.includes("image") || uploadTarget.intendedUse.includes("cover") || uploadTarget.intendedUse.includes("logo")) && !file.type.startsWith("image/")) {
      messages.push(createValidationMessage("error", "target_requires_image", "This upload target requires an image file.", "mimeType"));
    }
    return messages;
  }
}

export const mediaValidationService = new MediaValidationService();
