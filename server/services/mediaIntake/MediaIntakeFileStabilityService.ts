import fs from "node:fs/promises";

export interface MediaIntakeFileSnapshot {
  size: number;
  mtimeMs: number;
  checkedAt: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MediaIntakeFileStabilityService {
  async getFileSnapshot(filePath: string): Promise<MediaIntakeFileSnapshot> {
    const stat = await fs.stat(filePath);
    const handle = await fs.open(filePath, "r");
    await handle.close();
    return { size: stat.size, mtimeMs: stat.mtimeMs, checkedAt: new Date().toISOString() };
  }

  compareSnapshots(previous: MediaIntakeFileSnapshot, current: MediaIntakeFileSnapshot): boolean {
    return previous.size === current.size && previous.mtimeMs === current.mtimeMs;
  }

  async isStable(filePath: string, stabilityWindowMs = 1_500): Promise<boolean> {
    const first = await this.getFileSnapshot(filePath);
    await sleep(stabilityWindowMs);
    const second = await this.getFileSnapshot(filePath);
    return this.compareSnapshots(first, second);
  }

  async waitForStable(filePath: string, stabilityWindowMs = 1_500, attempts = 3): Promise<MediaIntakeFileSnapshot> {
    let last = await this.getFileSnapshot(filePath);
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await sleep(stabilityWindowMs);
      const next = await this.getFileSnapshot(filePath);
      if (this.compareSnapshots(last, next)) return next;
      last = next;
    }
    throw new Error("File is still changing.");
  }
}

export const mediaIntakeFileStabilityService = new MediaIntakeFileStabilityService();
