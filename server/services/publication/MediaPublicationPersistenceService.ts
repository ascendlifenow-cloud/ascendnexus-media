import type {
  MediaPublicationActionType,
  MediaPublicationEntityType,
  MediaPublicationLock,
  MediaPublicationOperation,
} from "../../models/mediaModels";
import { jsonDatabase } from "../media/JsonDatabase";

const activeStatuses = new Set(["requested", "validating", "waiting_for_processing", "promoting_storage", "updating_records", "activating_delivery", "verifying_sync", "rolling_back"]);

export class MediaPublicationPersistenceService {
  async createOperation(operation: MediaPublicationOperation): Promise<MediaPublicationOperation> {
    await jsonDatabase.update((data) => data.mediaPublicationOperations.push(operation));
    return operation;
  }

  async getOperation(publicationOperationId: string): Promise<MediaPublicationOperation | null> {
    const data = await jsonDatabase.read();
    return data.mediaPublicationOperations.find((operation) => operation.publicationOperationId === publicationOperationId) ?? null;
  }

  async listOperations(filters: Partial<Pick<MediaPublicationOperation, "entityType" | "entityId" | "actionType" | "status">> = {}): Promise<MediaPublicationOperation[]> {
    const data = await jsonDatabase.read();
    return data.mediaPublicationOperations
      .filter((operation) => !filters.entityType || operation.entityType === filters.entityType)
      .filter((operation) => !filters.entityId || operation.entityId === filters.entityId)
      .filter((operation) => !filters.actionType || operation.actionType === filters.actionType)
      .filter((operation) => !filters.status || operation.status === filters.status)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  async findActiveOperation(entityType: MediaPublicationEntityType, entityId: string, actionType?: MediaPublicationActionType): Promise<MediaPublicationOperation | null> {
    const operations = await this.listOperations({ entityType, entityId, actionType });
    return operations.find((operation) => activeStatuses.has(operation.status)) ?? null;
  }

  async findLatestMatchingOperation(entityType: MediaPublicationEntityType, entityId: string, actionType: MediaPublicationActionType, targetVersion?: string): Promise<MediaPublicationOperation | null> {
    const operations = await this.listOperations({ entityType, entityId, actionType });
    return operations.find((operation) => {
      if (!targetVersion) return activeStatuses.has(operation.status) || operation.status === "completed" || operation.status === "completed_with_warnings";
      return operation.metadata?.targetVersion === targetVersion && (activeStatuses.has(operation.status) || operation.status === "completed" || operation.status === "completed_with_warnings");
    }) ?? null;
  }

  async updateOperation(publicationOperationId: string, patch: Partial<MediaPublicationOperation>): Promise<MediaPublicationOperation | null> {
    let updated: MediaPublicationOperation | null = null;
    await jsonDatabase.update((data) => {
      data.mediaPublicationOperations = data.mediaPublicationOperations.map((operation) => {
        if (operation.publicationOperationId !== publicationOperationId) return operation;
        updated = { ...operation, ...patch };
        return updated;
      });
    });
    return updated;
  }

  async acquireLock(lock: MediaPublicationLock): Promise<MediaPublicationLock> {
    let existingActiveLock: MediaPublicationLock | null = null;
    await jsonDatabase.update((data) => {
      const now = new Date().toISOString();
      data.mediaPublicationLocks = data.mediaPublicationLocks.map((item) => item.status === "active" && item.expiresAt <= now ? { ...item, status: "expired" } : item);
      const existing = data.mediaPublicationLocks.find((item) =>
        item.status === "active" &&
        item.entityType === lock.entityType &&
        item.entityId === lock.entityId
      );
      if (existing) {
        existingActiveLock = existing;
        return;
      }
      data.mediaPublicationLocks.push(lock);
    });
    if (existingActiveLock && existingActiveLock.publicationOperationId !== lock.publicationOperationId) {
      throw new Error(`PUBLICATION_LOCK_CONFLICT:${lock.entityType}:${lock.entityId}`);
    }
    return lock;
  }

  async getActiveLock(entityType: MediaPublicationEntityType, entityId: string, actionType: MediaPublicationActionType): Promise<MediaPublicationLock | null> {
    const data = await jsonDatabase.read();
    const now = new Date().toISOString();
    return data.mediaPublicationLocks.find((lock) => lock.status === "active" && lock.expiresAt > now && lock.entityType === entityType && lock.entityId === entityId && lock.actionType === actionType) ?? null;
  }

  async releaseLock(publicationOperationId: string): Promise<void> {
    await jsonDatabase.update((data) => {
      const now = new Date().toISOString();
      data.mediaPublicationLocks = data.mediaPublicationLocks.map((lock) => lock.publicationOperationId === publicationOperationId && lock.status === "active" ? { ...lock, status: "released", releasedAt: now } : lock);
    });
  }

  async listLocks(): Promise<MediaPublicationLock[]> {
    const data = await jsonDatabase.read();
    return data.mediaPublicationLocks.sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt));
  }

  async expireStaleLocks(now = new Date().toISOString()): Promise<MediaPublicationLock[]> {
    const expired: MediaPublicationLock[] = [];
    await jsonDatabase.update((data) => {
      data.mediaPublicationLocks = data.mediaPublicationLocks.map((lock) => {
        if (lock.status === "active" && lock.expiresAt <= now) {
          const next = { ...lock, status: "expired" as const, releasedAt: now };
          expired.push(next);
          return next;
        }
        return lock;
      });
    });
    return expired;
  }
}

export const mediaPublicationPersistenceService = new MediaPublicationPersistenceService();
