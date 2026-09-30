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
    await jsonDatabase.update((data) => {
      data.adminAuditEvents.unshift(event);
      data.adminAuditEvents = data.adminAuditEvents.slice(0, 1000);
    });
    return event;
  }

  async list(): Promise<AdminAuditEvent[]> {
    const data = await jsonDatabase.read();
    return data.adminAuditEvents;
  }
}

export const mediaAuditPersistenceService = new MediaAuditPersistenceService();
