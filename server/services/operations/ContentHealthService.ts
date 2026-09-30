import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { productionConsistencyVerificationService } from "../reliability/ProductionConsistencyVerificationService";
import { storageReconciliationService } from "../reliability/StorageReconciliationService";
import { optimizationRecommendationService } from "./OptimizationRecommendationService";
import { nowIso } from "./operationsShared";

export class ContentHealthService {
  async buildHealth() {
    const [publicHealth, consistency, storage, recommendations] = await Promise.all([
      publicContentDeliveryService.buildPublicDeliveryHealth(),
      productionConsistencyVerificationService.buildConsistencyReport(),
      storageReconciliationService.reconcile(),
      optimizationRecommendationService.generateRecommendations(),
    ]);
    const blockingIssues = [
      ...(consistency.errors ?? []),
      ...(storage.status === "failed" ? storage.errors : []),
    ];
    const warnings = [
      ...(publicHealth.publicContentAvailable ? [] : ["No public content is available."]),
      ...(storage.warnings ?? []),
      ...(recommendations.totalOpen ? [`${recommendations.totalOpen} optimization recommendations are open.`] : []),
    ];
    return {
      status: blockingIssues.length ? "critical" : warnings.length ? "warning" : "healthy",
      publicHealth,
      consistency,
      storage,
      recommendations,
      blockingIssues,
      warnings,
      checkedAt: nowIso(),
    };
  }
}

export const contentHealthService = new ContentHealthService();
