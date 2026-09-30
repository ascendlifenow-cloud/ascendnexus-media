import type { DistributionDestination, PlatformConnectorRecord } from "../../models/operations/OperationsModels";
import { platformConnectorRepository } from "../../repositories/operations/OperationsRepository";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { publicSitemapService } from "../seo/PublicSitemapService";
import { id, nowIso, supportedDistributionDestinations } from "./distributionShared";

export interface PlatformConnector {
  platform: DistributionDestination;
  authenticate(): Promise<{ ok: boolean; message: string }>;
  validate(payload: Record<string, unknown>): Promise<{ ok: boolean; message: string }>;
  upload(payload: Record<string, unknown>): Promise<{ ok: boolean; platformId?: string; platformUrl?: string; message: string; retryable: boolean }>;
  verify(platformId?: string): Promise<{ ok: boolean; message: string }>;
  update(payload: Record<string, unknown>): Promise<{ ok: boolean; message: string }>;
  delete(platformId?: string): Promise<{ ok: boolean; message: string }>;
  retry(payload: Record<string, unknown>): Promise<{ ok: boolean; message: string }>;
  fetchAnalytics(platformId?: string): Promise<Record<string, number>>;
  healthCheck(): Promise<{ status: PlatformConnectorRecord["status"]; warnings: string[]; errors: string[] }>;
  rateLimitStatus(): Promise<PlatformConnectorRecord["rateLimitStatus"]>;
}

class BaseConnector implements PlatformConnector {
  constructor(public readonly platform: DistributionDestination, private readonly local = false) {}
  async authenticate() { return this.local ? { ok: true, message: "Local connector does not require external authentication." } : { ok: false, message: "External connector credentials are not configured." }; }
  async validate(payload: Record<string, unknown>) { return payload.title ? { ok: true, message: "Payload metadata is valid." } : { ok: false, message: "Title is required." }; }
  async upload(payload: Record<string, unknown>) {
    if (!this.local) return { ok: false, message: "External connector upload is disabled until credentials and provider policy are configured.", retryable: false };
    return { ok: true, platformId: `${this.platform}:${payload.entityType ?? "entity"}:${payload.entityId ?? "unknown"}`, platformUrl: String(payload.canonicalUrl ?? "/"), message: "Local destination updated or verified.", retryable: false };
  }
  async verify() {
    if (this.platform === "rss_feed" || this.platform === "seo_index") {
      const sitemap = await publicSitemapService.verifySitemaps();
      return { ok: sitemap.status === "passed", message: sitemap.blockingIssues[0] ?? "Sitemap/RSS-adjacent public index verification passed." };
    }
    if (this.local) {
      const health = await publicContentDeliveryService.buildPublicDeliveryHealth();
      return { ok: health.status === "ok", message: "Public delivery health verified." };
    }
    return { ok: false, message: "External verification requires configured provider credentials." };
  }
  async update() { return this.local ? { ok: true, message: "Local connector update accepted." } : { ok: false, message: "External update unavailable without credentials." }; }
  async delete() { return { ok: false, message: "Delete is disabled by default; use platform policy and approval." }; }
  async retry(payload: Record<string, unknown>) { const upload = await this.upload(payload); return { ok: upload.ok, message: upload.message }; }
  async fetchAnalytics() { return this.local ? { views: 0, streams: 0 } : {}; }
  async healthCheck() { return this.local ? { status: "enabled" as const, warnings: [], errors: [] } : { status: "needs_configuration" as const, warnings: ["Connector is registered but credentials are not configured."], errors: [] }; }
  async rateLimitStatus() { return this.local ? "ok" as const : "unknown" as const; }
}

const localPlatforms: DistributionDestination[] = ["website", "homepage", "artist_pages", "release_pages", "gallery", "rss_feed", "search_index", "seo_index", "newsletter", "email_campaigns"];

export class PlatformConnectorRegistry {
  getConnector(platform: DistributionDestination): PlatformConnector {
    return new BaseConnector(platform, localPlatforms.includes(platform));
  }

  async ensureConnectors() {
    const existing = await platformConnectorRepository.list({ includeArchived: true });
    const existingPlatforms = new Set(existing.map((item) => item.platform));
    const created: PlatformConnectorRecord[] = [];
    for (const platform of supportedDistributionDestinations) {
      if (existingPlatforms.has(platform)) continue;
      const connector = this.getConnector(platform);
      const health = await connector.healthCheck();
      const createdAt = nowIso();
      created.push(await platformConnectorRepository.create({
        connectorId: id("connector"),
        platform,
        displayName: platform.replace(/_/g, " "),
        status: health.status,
        supportsUpload: true,
        supportsUpdate: true,
        supportsDelete: false,
        supportsAnalytics: !localPlatforms.includes(platform) || platform === "website",
        authStatus: localPlatforms.includes(platform) ? "not_required" : "missing",
        rateLimitStatus: await connector.rateLimitStatus(),
        lastHealthCheckAt: createdAt,
        warnings: health.warnings,
        errors: health.errors,
        createdAt,
        updatedAt: createdAt,
        metadata: { localConnector: localPlatforms.includes(platform) },
        schemaVersion: 1,
      }));
    }
    return [...existing, ...created];
  }

  async health() {
    const connectors = await this.ensureConnectors();
    const refreshed = [];
    for (const record of connectors) {
      const connector = this.getConnector(record.platform);
      const health = await connector.healthCheck();
      const next = await platformConnectorRepository.update(record.connectorId, {
        status: health.status,
        rateLimitStatus: await connector.rateLimitStatus(),
        lastHealthCheckAt: nowIso(),
        warnings: health.warnings,
        errors: health.errors,
      });
      if (next) refreshed.push(next);
    }
    return refreshed;
  }
}

export const platformConnectorRegistry = new PlatformConnectorRegistry();
