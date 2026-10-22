import type { AdminAuditEvent } from "../../models/mediaModels";
import { jsonDatabase } from "./JsonDatabase";

export class MediaAuditPersistenceService {
  async record(action: string, summary: string, input: Partial<AdminAuditEvent> = {}): Promise<AdminAuditEvent> {
    const event: AdminAuditEvent = {
      auditEventId: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      entityType: input.entityType ?? "media",
      entityId: input.entityId,
      actorId: input.actorId,
      summary,
      createdAt: new Date().toISOString(),
      metadata: input.metadata,
    };
    await jsonDatabase.insertCollectionRecord("adminAuditEvents", event);
    return event;
  }

  async list(): Promise<AdminAuditEvent[]> {
    return (await jsonDatabase.listCollection("adminAuditEvents"))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 1000);
  }
}

export const mediaAuditPersistenceService = new MediaAuditPersistenceService();
