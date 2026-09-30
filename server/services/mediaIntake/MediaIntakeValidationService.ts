import fs from "node:fs/promises";
import path from "node:path";
import type { MediaIntakeMediaType } from "../../models/mediaIntake/MediaIntakeModels";
import { detectFileSignature } from "../../utils/media/fileSignatureUtils";
import { getFileExtension, hasPathTraversal } from "../../utils/media/mediaPathUtils";
import type { MediaIntakeConfig } from "./MediaIntakeConfigService";

const mimeByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const mediaTypeFromMime = (mime: string): MediaIntakeMediaType => {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "unsupported";
};

const isTemporaryName = (filename: string): boolean =>
  filename.startsWith(".") || filename.startsWith("~") || /\.(tmp|part|crdownload|download|swp)$/i.test(filename) || ["Thumbs.db", ".DS_Store"].includes(filename);

export interface MediaIntakeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  detectedMimeType?: string;
  detectedMediaType: MediaIntakeMediaType;
  extension: string;
  fileSize: number;
}

export class MediaIntakeValidationService {
  async validate(filePath: string, config: MediaIntakeConfig): Promise<MediaIntakeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const filename = path.basename(filePath);
    const resolved = path.resolve(filePath);
    const intakeRoot = path.resolve(config.intakeFolder);
    if (!resolved.startsWith(`${intakeRoot}${path.sep}`) && resolved !== intakeRoot) errors.push("File is outside the configured intake folder.");
    if (path.dirname(resolved) !== intakeRoot) errors.push("Only files in the flat watched folder are accepted.");
    if (hasPathTraversal(filename) || /[\0-\x1f]/.test(filename)) errors.push("Filename contains unsafe characters.");
    if (isTemporaryName(filename)) errors.push("Temporary, hidden, or system files are ignored.");

    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() && !config.followSymlinks) errors.push("Symbolic links are not accepted.");
    if (!stat.isFile()) errors.push("Only regular files are accepted.");
    if (stat.size <= 0) errors.push("File is empty.");
    if (stat.size > config.maxFileSize) errors.push("File exceeds the configured maximum intake size.");

    const extension = getFileExtension(filename);
    if (!extension) errors.push("File extension is required.");
    if (extension && !config.allowedExtensions.includes(extension)) errors.push(`.${extension} files are not allowed for media intake.`);
    if (["exe", "js", "html", "php", "zip", "tar", "gz", "sh", "app"].includes(extension)) errors.push(`.${extension} files are blocked.`);

    const head = await fs.readFile(filePath).then((buffer) => buffer.subarray(0, 32));
    let signatureMime = detectFileSignature(head);
    const extensionMime = mimeByExtension[extension];
    if (signatureMime === "audio/mp4" && ["mp4", "mov"].includes(extension)) signatureMime = extensionMime;
    const detectedMimeType = signatureMime ?? extensionMime;
    if (!detectedMimeType) errors.push("File type could not be identified safely.");
    if (signatureMime && extensionMime && mediaTypeFromMime(signatureMime) !== mediaTypeFromMime(extensionMime)) {
      errors.push("File signature does not match the extension media category.");
    }
    if (!signatureMime && extensionMime) warnings.push("File signature was not recognized; extension-based MIME fallback was used.");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      detectedMimeType,
      detectedMediaType: detectedMimeType ? mediaTypeFromMime(detectedMimeType) : "unsupported",
      extension,
      fileSize: stat.size,
    };
  }
}

export const mediaIntakeValidationService = new MediaIntakeValidationService();
