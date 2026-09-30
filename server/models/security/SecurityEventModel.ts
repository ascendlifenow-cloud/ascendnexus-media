export type SecurityEventSeverity = "info" | "notice" | "warning" | "high" | "critical";

export interface SecurityEventRecord {
  securityEventId: string;
  eventType: string;
  severity: SecurityEventSeverity;
  actorId?: string;
  subjectId?: string;
  entityType?: string;
  entityId?: string;
  ipHash?: string;
  userAgentHash?: string;
  summary: string;
  safeDetails?: Record<string, unknown>;
  createdAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
