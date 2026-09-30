import type { ConsentCategory } from "./ConsentPolicyModel";

export interface AnalyticsEventRecord {
  analyticsEventId: string;
  eventName: string;
  eventVersion: string;
  category: ConsentCategory;
  occurredAt: string;
  receivedAt: string;
  routeKey: string;
  path?: string;
  entityType?: string;
  entityId?: string;
  publicVersion?: string;
  properties: Record<string, unknown>;
  consentPolicyVersion: string;
  consentCategories: ConsentCategory[];
  retentionClass: "operational_short" | "analytics_standard" | "consent_audit";
  expiresAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
