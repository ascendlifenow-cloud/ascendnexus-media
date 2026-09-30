import type { MediaIntakeRecord, MediaIntakeStatus } from "../../models/mediaIntake/MediaIntakeModels";
import { jsonDatabase } from "../media/JsonDatabase";

export class MediaIntakeRecordRepository {
  async list(filters: { status?: MediaIntakeStatus; limit?: number } = {}): Promise<MediaIntakeRecord[]> {
    const data = await jsonDatabase.read();
    let records = [...(data.mediaIntakeRecords ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filters.status) records = records.filter((record) => record.status === filters.status);
    return filters.limit ? records.slice(0, filters.limit) : records;
  }

  async get(intakeId: string): Promise<MediaIntakeRecord | null> {
    const data = await jsonDatabase.read();
    return data.mediaIntakeRecords.find((record) => record.intakeId === intakeId) ?? null;
  }

  async findBySourcePathHash(sourcePathHash: string): Promise<MediaIntakeRecord | null> {
    const data = await jsonDatabase.read();
    return data.mediaIntakeRecords.find((record) => record.sourcePathHash === sourcePathHash) ?? null;
  }

  async findByChecksum(checksum: string): Promise<MediaIntakeRecord | null> {
    const data = await jsonDatabase.read();
    return data.mediaIntakeRecords.find((record) => record.checksum === checksum && ["completed", "assigned", "review_required", "duplicate"].includes(record.status)) ?? null;
  }

  async create(record: MediaIntakeRecord): Promise<MediaIntakeRecord> {
    await jsonDatabase.update((data) => {
      data.mediaIntakeRecords = data.mediaIntakeRecords ?? [];
      if (data.mediaIntakeRecords.some((item) => item.intakeId === record.intakeId || item.sourcePathHash === record.sourcePathHash)) return;
      data.mediaIntakeRecords.push(record);
    });
    return record;
  }

  async patch(intakeId: string, patch: Partial<MediaIntakeRecord>): Promise<MediaIntakeRecord | null> {
    let updated: MediaIntakeRecord | null = null;
    await jsonDatabase.update((data) => {
      data.mediaIntakeRecords = (data.mediaIntakeRecords ?? []).map((record) => {
        if (record.intakeId !== intakeId) return record;
        updated = { ...record, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
    });
    return updated;
  }
}

export const mediaIntakeRecordRepository = new MediaIntakeRecordRepository();
