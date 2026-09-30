import { distributionAnalyticsRepository, platformUploadRepository } from "../../repositories/operations/OperationsRepository";
import { platformConnectorRegistry } from "./PlatformConnectorRegistry";
import { id, nowIso } from "./distributionShared";

export class PlatformAnalyticsCollector {
  async collect() {
    const uploads = (await platformUploadRepository.list({ includeArchived: true })).filter((upload) => upload.status === "verified");
    const created = [];
    for (const upload of uploads) {
      const connector = platformConnectorRegistry.getConnector(upload.platform);
      const metrics = await connector.fetchAnalytics(upload.platformId);
      created.push(await distributionAnalyticsRepository.create({
        analyticsId: id("distribution_analytics"),
        platform: upload.platform,
        platformId: upload.platformId,
        distributionJobId: upload.distributionJobId,
        collectedAt: nowIso(),
        metrics,
        createdAt: nowIso(),
        metadata: { source: "platform_connector" },
        schemaVersion: 1,
      }));
    }
    return { created, checkedAt: nowIso() };
  }

  list() {
    return distributionAnalyticsRepository.list({ includeArchived: true, sort: "collectedAt", direction: "desc", limit: 100 });
  }
}

export const platformAnalyticsCollector = new PlatformAnalyticsCollector();
