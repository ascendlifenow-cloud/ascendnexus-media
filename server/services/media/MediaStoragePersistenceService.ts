import type { MediaStorageObject } from "../../models/mediaModels";
import { jsonDatabase } from "./JsonDatabase";

export class MediaStoragePersistenceService {
  async create(storageObject: MediaStorageObject): Promise<MediaStorageObject> {
    await jsonDatabase.update((data) => data.mediaStorageObjects.push(storageObject));
    return storageObject;
  }

  async update(storageObjectId: string, patch: Partial<MediaStorageObject>): Promise<MediaStorageObject | null> {
    let updated: MediaStorageObject | null = null;
    await jsonDatabase.update((data) => {
      data.mediaStorageObjects = data.mediaStorageObjects.map((item) => {
        if (item.storageObjectId !== storageObjectId) return item;
        updated = { ...item, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
    });
    return updated;
  }

  async get(storageObjectId: string): Promise<MediaStorageObject | null> {
    const data = await jsonDatabase.read();
    return data.mediaStorageObjects.find((item) => item.storageObjectId === storageObjectId) ?? null;
  }

  async list(): Promise<MediaStorageObject[]> {
    const data = await jsonDatabase.read();
    return data.mediaStorageObjects;
  }
}

export const mediaStoragePersistenceService = new MediaStoragePersistenceService();
