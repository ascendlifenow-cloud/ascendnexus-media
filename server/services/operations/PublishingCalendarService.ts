import { publishingCalendarEventRepository } from "../../repositories/operations/OperationsRepository";
import { asRecord, asString, id, nowIso } from "./operationsShared";

export class PublishingCalendarService {
  async listEvents(params: URLSearchParams = new URLSearchParams()) {
    const from = params.get("from");
    const to = params.get("to");
    return (await publishingCalendarEventRepository.list({ includeArchived: true, sort: "startsAt", direction: "asc" }))
      .filter((event) => !from || event.startsAt >= from)
      .filter((event) => !to || event.startsAt <= to);
  }

  async createEvent(payload: unknown, actorId: string) {
    const body = asRecord(payload);
    const startsAt = asString(body.startsAt, nowIso());
    return publishingCalendarEventRepository.create({
      calendarEventId: id("calendar_event"),
      title: asString(body.title, "Untitled Calendar Event"),
      eventType: asString(body.eventType, "scheduled_release") as never,
      status: asString(body.status, "planned") as never,
      startsAt,
      endsAt: asString(body.endsAt) || undefined,
      timezone: asString(body.timezone, "UTC"),
      workflowId: asString(body.workflowId) || undefined,
      entityType: asString(body.entityType) || undefined,
      entityId: asString(body.entityId) || undefined,
      campaignId: asString(body.campaignId) || undefined,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
      createdBy: actorId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      metadata: asRecord(body.metadata),
      schemaVersion: 1,
    });
  }
}

export const publishingCalendarService = new PublishingCalendarService();
