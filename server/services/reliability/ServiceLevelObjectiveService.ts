import crypto from "node:crypto";
import type { ServiceLevelObjectiveRecord } from "../../models/observability/ObservabilityModels";
import { serviceLevelObjectiveRepository } from "../../repositories/observability/ObservabilityRepository";

const now = () => new Date().toISOString();

export class ServiceLevelObjectiveService {
  defaultSlos(): ServiceLevelObjectiveRecord[] {
    const common = { windowDays: 30, owner: "operations", status: "active" as const, createdAt: now(), updatedAt: now(), schemaVersion: 1 };
    return [
      { sloId: "slo_public_website_availability", name: "Public website availability", service: "public_site", indicator: "successful_public_homepage_synthetic_checks / total_public_homepage_synthetic_checks", target: 0.99, measurementSource: "synthetic_monitoring", exclusions: ["approved maintenance"], criticality: "critical", errorBudgetPolicy: "pause non-emergency releases when exhausted", ...common },
      { sloId: "slo_public_api_availability", name: "Public API availability", service: "public_api", indicator: "successful_eligible_public_api_requests / eligible_public_api_requests", target: 0.99, measurementSource: "http_metrics", exclusions: ["expected 4xx", "abuse rate limits"], criticality: "critical", errorBudgetPolicy: "investigate fast burn", ...common },
      { sloId: "slo_public_api_latency", name: "Public API latency", service: "public_api", indicator: "eligible_public_api_p95_under_threshold / eligible_public_api_requests", target: 0.95, measurementSource: "http_metrics", exclusions: ["large admin exports"], criticality: "high", errorBudgetPolicy: "performance regression review", ...common },
      { sloId: "slo_audio_preview_success", name: "Audio preview success", service: "audio_delivery", indicator: "confirmed_preview_starts / valid_preview_start_attempts", target: 0.97, measurementSource: "client_operational_telemetry", exclusions: ["autoplay blocked", "user canceled"], criticality: "high", errorBudgetPolicy: "CDN/audio investigation", ...common },
      { sloId: "slo_publication_success", name: "Publication success", service: "publication", indicator: "verified_completed_publications / publication_attempts", target: 0.98, measurementSource: "publication_operations", exclusions: ["user canceled"], criticality: "critical", errorBudgetPolicy: "freeze non-critical publication changes", ...common },
      { sloId: "slo_worker_reliability", name: "Worker reliability", service: "workers", indicator: "successful_jobs / completed_plus_failed_jobs", target: 0.97, measurementSource: "queue_worker_metrics", exclusions: ["known corrupt input"], criticality: "high", errorBudgetPolicy: "worker repair before scale increase", ...common },
    ];
  }

  async ensureDefaults() {
    const existing = await serviceLevelObjectiveRepository.list({ includeArchived: true });
    const ids = new Set(existing.map((slo) => slo.sloId));
    for (const slo of this.defaultSlos()) if (!ids.has(slo.sloId)) await serviceLevelObjectiveRepository.create({ ...slo, metadata: { generatedId: crypto.randomUUID() } });
    return serviceLevelObjectiveRepository.list();
  }

  validate(slo: ServiceLevelObjectiveRecord) {
    const errors = [];
    if (slo.target <= 0 || slo.target > 1) errors.push("SLO target must be between 0 and 1.");
    if (!slo.measurementSource) errors.push("SLO must have a measurement source.");
    return { valid: errors.length === 0, errors };
  }
}

export const serviceLevelObjectiveService = new ServiceLevelObjectiveService();
