import type { DistributionDestination } from "../../models/operations/OperationsModels";
import { distributionAuditEventRepository } from "../../repositories/operations/OperationsRepository";
import { id, nowIso } from "./distributionShared";

export class DistributionAuditService {
  record(event: { distributionJobId?: string; platform?: DistributionDestination; eventType: string; severity?: "info" | "warning" | "error" | "critical"; message: string; actorId?: string; metadata?: Record<string, unknown> }) {
    return distributionAuditEventRepository.create({
      distributionAuditEventId: id("distribution_audit"),
      severity: event.severity ?? "info",
      createdAt: nowIso(),
      metadata: event.metadata ?? {},
      schemaVersion: 1,
      ...event,
    });
  }

  list() {
    return distributionAuditEventRepository.list({ includeArchived: true, sort: "createdAt", direction: "desc", limit: 100 });
  }
}

export const distributionAuditService = new DistributionAuditService();
