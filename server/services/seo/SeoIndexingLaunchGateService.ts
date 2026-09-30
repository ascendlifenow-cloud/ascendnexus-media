import { productionSeoHealthService } from "./ProductionSeoHealthService";

export class SeoIndexingLaunchGateService {
  async evaluate(environment = "production") {
    const health = await productionSeoHealthService.buildHealth(environment);
    return {
      decision: health.overallStatus === "healthy" ? "approved" : health.overallStatus === "warning" ? "approved_with_warnings" : "blocked",
      requiredEvidence: [
        "ANM-WEB-103 production deployment launch gate approved",
        "Production domain and TLS verified",
        "Search-engine ownership verification complete",
        "Live robots.txt and sitemap.xml fetched from production",
        "Rendered head tags verified on production routes",
      ],
      ...health,
    };
  }
}

export const seoIndexingLaunchGateService = new SeoIndexingLaunchGateService();
