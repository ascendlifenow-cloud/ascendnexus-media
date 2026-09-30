import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { cleanupProcessingTempDir, createProcessingTempDir } from "../../utils/media/temporaryFileUtils";
import { resolveInsideRoot } from "../../utils/media/mediaPathUtils";

const tempRoot = path.join(os.tmpdir(), "ascend-nexus-media-processing");

export class MediaTemporaryFileService {
  createJobDirectory(processingJobId: string) {
    return createProcessingTempDir(processingJobId);
  }

  getSafeJobPath(processingJobId: string, filename: string) {
    const safeJobId = processingJobId.replace(/[^a-zA-Z0-9._-]+/g, "-");
    return resolveInsideRoot(path.join(tempRoot, safeJobId), filename);
  }

  assertWithinTempRoot(candidatePath: string): void {
    resolveInsideRoot(tempRoot, path.relative(tempRoot, candidatePath));
  }

  cleanupJobDirectory(processingJobId: string) {
    return cleanupProcessingTempDir(processingJobId);
  }

  async findAbandonedDirectories(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const entries = await fs.readdir(tempRoot, { withFileTypes: true });
      const cutoff = Date.now() - maxAgeMs;
      const abandoned = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(tempRoot, entry.name);
        const stat = await fs.stat(fullPath);
        if (stat.mtimeMs < cutoff) abandoned.push({ name: entry.name, path: fullPath, updatedAt: stat.mtime.toISOString() });
      }
      return abandoned;
    } catch {
      return [];
    }
  }

  async cleanupAbandonedDirectories(maxAgeMs = 24 * 60 * 60 * 1000) {
    const abandoned = await this.findAbandonedDirectories(maxAgeMs);
    await Promise.all(abandoned.map((entry) => fs.rm(entry.path, { recursive: true, force: true })));
    return { cleaned: abandoned.length, abandoned };
  }

  async getTempHealth() {
    await fs.mkdir(tempRoot, { recursive: true });
    const abandoned = await this.findAbandonedDirectories();
    return {
      tempRootSafe: !tempRoot.includes("/public/"),
      abandonedDirectoryCount: abandoned.length,
      checkedAt: new Date().toISOString(),
      warnings: abandoned.length ? [`${abandoned.length} abandoned processing temp directories found.`] : [],
    };
  }
}

export const mediaTemporaryFileService = new MediaTemporaryFileService();
