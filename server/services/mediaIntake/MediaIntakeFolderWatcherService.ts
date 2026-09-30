import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { mediaIntakeConfigService, type MediaIntakeConfig } from "./MediaIntakeConfigService";
import { mediaIntakeFileStabilityService } from "./MediaIntakeFileStabilityService";
import { watchedFolderMediaIngestionService } from "./WatchedFolderMediaIngestionService";
import { mediaIntakeRecordRepository } from "./MediaIntakeRecordRepository";

const ignoredName = (filename: string): boolean =>
  filename.startsWith(".") || filename.startsWith("~") || /\.(tmp|part|crdownload|download|swp)$/i.test(filename) || ["Thumbs.db", ".DS_Store"].includes(filename);

export class MediaIntakeFolderWatcherService {
  private watcher: fs.FSWatcher | null = null;
  private timer: NodeJS.Timeout | null = null;
  private scheduled = new Set<string>();
  private lastScanAt?: string;
  private lastError?: string;
  private startedAt?: string;

  start(config = mediaIntakeConfigService.getConfig()): void {
    if (this.watcher || !config.enabled) return;
    const validation = mediaIntakeConfigService.validate(config);
    if (!validation.valid) {
      this.lastError = validation.errors.join(" ");
      return;
    }
    void fsp.mkdir(config.intakeFolder, { recursive: true }).then(() => {
      this.startedAt = new Date().toISOString();
      this.watcher = fs.watch(config.intakeFolder, { persistent: false }, (_event, filename) => {
        if (filename) void this.handleFilesystemEvent(path.join(config.intakeFolder, filename.toString()), config);
      });
      this.timer = setInterval(() => void this.scanNow(config), config.pollIntervalMs);
      void this.scanNow(config);
    }).catch((error) => {
      this.lastError = error instanceof Error ? error.message : "Media intake watcher failed to start.";
    });
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.scheduled.clear();
  }

  async scanNow(config = mediaIntakeConfigService.getConfig()) {
    this.lastScanAt = new Date().toISOString();
    const files = await this.discoverPendingFiles(config);
    for (const file of files) this.scheduleFile(file, config);
    return { success: true, scheduled: files.length, files };
  }

  async handleFilesystemEvent(filePath: string, config = mediaIntakeConfigService.getConfig()): Promise<void> {
    this.scheduleFile(filePath, config);
  }

  async discoverPendingFiles(config = mediaIntakeConfigService.getConfig()): Promise<string[]> {
    const entries = await fsp.readdir(config.intakeFolder, { withFileTypes: true }).catch(() => []);
    return entries
      .filter((entry) => entry.isFile())
      .filter((entry) => !ignoredName(entry.name))
      .map((entry) => path.join(config.intakeFolder, entry.name));
  }

  scheduleFile(filePath: string, config = mediaIntakeConfigService.getConfig()): void {
    const resolved = path.resolve(filePath);
    if (this.scheduled.has(resolved) || ignoredName(path.basename(resolved))) return;
    this.scheduled.add(resolved);
    void this.processScheduledFile(resolved, config).finally(() => this.scheduled.delete(resolved));
  }

  async processScheduledFile(filePath: string, config: MediaIntakeConfig) {
    try {
      await mediaIntakeFileStabilityService.waitForStable(filePath, config.stabilityWindowMs);
      await watchedFolderMediaIngestionService.ingest(filePath, { config });
      this.lastError = undefined;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return;
      this.lastError = error instanceof Error ? error.message : "Media intake processing failed.";
    }
  }

  getWatchStatus() {
    return {
      running: Boolean(this.watcher),
      startedAt: this.startedAt,
      lastScanAt: this.lastScanAt,
      scheduledCount: this.scheduled.size,
      lastError: this.lastError,
    };
  }

  async getHealth(config = mediaIntakeConfigService.getConfig()) {
    const validation = mediaIntakeConfigService.validate(config);
    const folderExists = await fsp.stat(config.intakeFolder).then((stat) => stat.isDirectory()).catch(() => false);
    const records = await mediaIntakeRecordRepository.list();
    const blockers = [...validation.errors, ...(config.enabled && !folderExists ? ["Configured intake folder does not exist."] : [])];
    return {
      overallStatus: blockers.length ? "degraded" : "healthy",
      enabled: config.enabled,
      watcher: this.getWatchStatus(),
      folderExists,
      intakeFolder: config.intakeFolder,
      archiveFolder: config.archiveFolder,
      reviewFolder: config.reviewFolder,
      quarantineFolder: config.quarantineFolder,
      failedFolder: config.failedFolder,
      autoAssignEnabled: config.autoAssignEnabled,
      minConfidence: config.minConfidence,
      pendingRecords: records.filter((record) => ["discovered", "waiting_for_stability", "ready", "validating", "classified", "matching"].includes(record.status)).length,
      reviewRequiredRecords: records.filter((record) => record.status === "review_required").length,
      completedRecords: records.filter((record) => record.status === "completed").length,
      duplicateRecords: records.filter((record) => record.status === "duplicate").length,
      quarantinedRecords: records.filter((record) => record.status === "quarantined").length,
      errors: blockers,
      warnings: validation.warnings,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const mediaIntakeFolderWatcherService = new MediaIntakeFolderWatcherService();
