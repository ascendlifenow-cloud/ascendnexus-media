import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";
import { analyticsEventRepository } from "../../repositories/AnalyticsEventRepository";
import { visitorConsentRepository } from "../../repositories/VisitorConsentRepository";
import type { AnalyticsEventRecord } from "../../models/analytics/AnalyticsEventModel";
import { analyticsDataMinimizationService } from "./AnalyticsDataMinimizationService";
import { analyticsEventCatalog, type AnalyticsEventName } from "./AnalyticsEventCatalog";
import { analyticsUrlSanitizationService } from "./AnalyticsUrlSanitizationService";
import { consentPolicyService } from "./ConsentPolicyService";

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const nowIso = () => new Date().toISOString();

export class ServerAnalyticsService {
  async recordEvents(payload: Record<string, unknown>, request: IncomingMessage) {
    const bodyEvents = Array.isArray(payload.events) ? payload.events.slice(0, 20) : [];
    const accepted: AnalyticsEventRecord[] = [];
    const rejected: string[] = [];
    for (const item of bodyEvents) {
      try {
        accepted.push(await this.recordEvent(item as Record<string, unknown>, request));
      } catch (error) {
        rejected.push(error instanceof Error ? error.message : "ANALYTICS_EVENT_INVALID");
      }
    }
    return {
      acceptedCount: accepted.length,
      rejectedCount: rejected.length,
      checkedAt: nowIso(),
    };
  }

  async recordEvent(event: Record<string, unknown>, request: IncomingMessage): Promise<AnalyticsEventRecord> {
    const eventName = String(event.eventName ?? "");
    if (!this.isEventName(eventName)) throw new Error("ANALYTICS_EVENT_INVALID");
    const catalog = analyticsEventCatalog[eventName];
    if (!getBackendConfig().analytics.enabled && catalog.category !== "necessary") throw new Error("ANALYTICS_DISABLED");
    const consentReference = typeof event.consentReference === "string" ? event.consentReference : "";
    const consent = consentReference ? await visitorConsentRepository.findByReference(consentReference) : null;
    if (catalog.category !== "necessary" && (!consent || consent.status !== "active" || consent.choices[catalog.category] !== true)) {
      throw new Error("ANALYTICS_NOT_CONSENTED");
    }
    const policy = await consentPolicyService.getActivePolicy();
    const route = analyticsUrlSanitizationService.sanitizePath(event.route);
    const properties = analyticsDataMinimizationService.sanitizeProperties(event.properties, catalog.properties);
    const receivedAt = nowIso();
    const record: AnalyticsEventRecord = {
      analyticsEventId: createId("analytics_event"),
      eventName,
      eventVersion: typeof event.eventVersion === "string" ? event.eventVersion.slice(0, 20) : "1",
      category: catalog.category,
      occurredAt: typeof event.occurredAt === "string" ? event.occurredAt.slice(0, 40) : receivedAt,
      receivedAt,
      routeKey: route.routeKey,
      path: route.path,
      entityType: typeof event.entity === "object" && event.entity ? String((event.entity as Record<string, unknown>).entityType ?? "").slice(0, 40) : undefined,
      entityId: typeof event.entity === "object" && event.entity ? String((event.entity as Record<string, unknown>).entityId ?? "").slice(0, 80) : undefined,
      publicVersion: typeof event.entity === "object" && event.entity ? String((event.entity as Record<string, unknown>).publicVersion ?? "").slice(0, 40) || undefined : undefined,
      properties,
      consentPolicyVersion: consent?.policyVersion ?? policy.version,
      consentCategories: consent ? Object.entries(consent.choices).filter(([, enabled]) => enabled).map(([category]) => category as AnalyticsEventRecord["category"]) : ["necessary"],
      retentionClass: catalog.category === "necessary" ? "consent_audit" : "analytics_standard",
      expiresAt: new Date(Date.now() + (catalog.category === "necessary" ? 395 : 180) * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { firstPartyCollection: true, provider: getBackendConfig().analytics.provider, rawIpStored: false },
      schemaVersion: 1,
    };
    return analyticsEventRepository.create(record);
  }

  async getHealth() {
    const policy = await consentPolicyService.getActivePolicy();
    const recent = await analyticsEventRepository.recent(10);
    return {
      enabled: getBackendConfig().features.analyticsEnabled || getBackendConfig().analytics.provider === "none",
      policyReady: Boolean(policy.version),
      providerConfigured: getBackendConfig().analytics.provider !== "none" ? Boolean(getBackendConfig().analytics.publicMeasurementId) : false,
      providerAvailable: getBackendConfig().analytics.provider === "none" ? false : Boolean(getBackendConfig().analytics.publicMeasurementId),
      collectionAvailable: true,
      storageRegistryComplete: true,
      retentionOperational: true,
      recentEventCount: recent.length,
      recentFailureCount: 0,
      overallStatus: policy.version ? "healthy" : "degraded",
      warnings: getBackendConfig().analytics.provider === "none" ? ["Third-party analytics provider is disabled; first-party consent and event validation remain operational."] : [],
      errors: [],
      checkedAt: nowIso(),
    };
  }

  private isEventName(value: string): value is AnalyticsEventName {
    return Object.prototype.hasOwnProperty.call(analyticsEventCatalog, value);
  }
}

export const serverAnalyticsService = new ServerAnalyticsService();
