import path from "node:path";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";

export interface MediaIntakeConfig {
  enabled: boolean;
  intakeFolder: string;
  archiveFolder: string;
  reviewFolder: string;
  quarantineFolder: string;
  failedFolder: string;
  pollIntervalMs: number;
  stabilityWindowMs: number;
  maxFileSize: number;
  autoAssignEnabled: boolean;
  minConfidence: number;
  deleteSourceAfterSuccess: boolean;
  allowedExtensions: string[];
  followSymlinks: boolean;
}

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveFolder = (value: string | undefined, fallback: string): string =>
  path.resolve(value?.trim() || fallback);

export class MediaIntakeConfigService {
  getConfig(overrides: Partial<MediaIntakeConfig> = {}): MediaIntakeConfig {
    const root = path.resolve(mediaBackendConfig.dataRoot, "..", "media-intake");
    const config: MediaIntakeConfig = {
      enabled: parseBool(process.env.MEDIA_INTAKE_ENABLED, false),
      intakeFolder: resolveFolder(process.env.MEDIA_INTAKE_FOLDER, path.join(root, "incoming")),
      archiveFolder: resolveFolder(process.env.MEDIA_INTAKE_ARCHIVE_FOLDER, path.join(root, "archive")),
      reviewFolder: resolveFolder(process.env.MEDIA_INTAKE_REVIEW_FOLDER, path.join(root, "review")),
      quarantineFolder: resolveFolder(process.env.MEDIA_INTAKE_QUARANTINE_FOLDER, path.join(root, "quarantine")),
      failedFolder: resolveFolder(process.env.MEDIA_INTAKE_FAILED_FOLDER, path.join(root, "failed")),
      pollIntervalMs: parseNumber(process.env.MEDIA_INTAKE_POLL_INTERVAL_MS, 10_000),
      stabilityWindowMs: parseNumber(process.env.MEDIA_INTAKE_STABILITY_WINDOW_MS, 1_500),
      maxFileSize: parseNumber(process.env.MEDIA_INTAKE_MAX_FILE_SIZE, mediaBackendConfig.maxFullSongBytes),
      autoAssignEnabled: parseBool(process.env.MEDIA_INTAKE_AUTO_ASSIGN_ENABLED, true),
      minConfidence: Math.min(1, Math.max(0, Number(process.env.MEDIA_INTAKE_MIN_CONFIDENCE ?? "0.92"))),
      deleteSourceAfterSuccess: parseBool(process.env.MEDIA_INTAKE_DELETE_SOURCE_AFTER_SUCCESS, false),
      allowedExtensions: (process.env.MEDIA_INTAKE_ALLOWED_EXTENSIONS ?? "jpg,jpeg,png,webp,gif,mp3,wav,flac,aac,m4a,mp4,mov,webm")
        .split(",")
        .map((item) => item.trim().replace(/^\./, "").toLowerCase())
        .filter(Boolean),
      followSymlinks: parseBool(process.env.MEDIA_INTAKE_FOLLOW_SYMLINKS, false),
    };
    return { ...config, ...overrides };
  }

  validate(config = this.getConfig()): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const folders = [config.intakeFolder, config.archiveFolder, config.reviewFolder, config.quarantineFolder, config.failedFolder].map((item) => path.resolve(item));
    const [intake] = folders;
    if (!path.isAbsolute(intake)) errors.push("MEDIA_INTAKE_FOLDER must resolve to an absolute path.");
    if (config.followSymlinks) errors.push("MEDIA_INTAKE_FOLLOW_SYMLINKS must remain false for this implementation.");
    for (const folder of folders.slice(1)) {
      if (folder === intake) errors.push("Media intake destination folders must not equal the source intake folder.");
      if (folder.startsWith(`${intake}${path.sep}`)) errors.push("Media intake destination folders must not be nested inside the flat watched folder.");
    }
    if (!config.allowedExtensions.length) errors.push("MEDIA_INTAKE_ALLOWED_EXTENSIONS must include at least one extension.");
    if (!config.enabled) warnings.push("Media intake watcher is disabled until MEDIA_INTAKE_ENABLED=true.");
    return { valid: errors.length === 0, errors, warnings };
  }
}

export const mediaIntakeConfigService = new MediaIntakeConfigService();
