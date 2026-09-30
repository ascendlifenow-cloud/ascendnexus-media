import fs from "node:fs/promises";
import crypto from "node:crypto";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";
import { mediaIntakeRecordRepository } from "./MediaIntakeRecordRepository";

export class MediaIntakeDuplicateService {
  async calculateChecksum(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async findExistingIntake(checksum: string) {
    return mediaIntakeRecordRepository.findByChecksum(checksum);
  }

  async findExistingMediaAsset(checksum: string) {
    const storageObject = (await mediaStoragePersistenceService.list()).find((item) => item.checksum === checksum);
    return storageObject ?? null;
  }

  resolveDuplicatePolicy(existingIntake: unknown, existingStorage: unknown) {
    if (existingIntake) return { duplicate: true, reason: "Exact file was already processed by watched-folder intake." };
    if (existingStorage) return { duplicate: true, reason: "Exact file already exists in managed media storage." };
    return { duplicate: false };
  }
}

export const mediaIntakeDuplicateService = new MediaIntakeDuplicateService();
