import { getBackendConfig } from "../../config/backendConfig";
import { searchEngineVerificationRepository } from "../../repositories/seo/SeoRepository";
import { canonicalUrlService } from "../metadata/CanonicalUrlService";
import { publicMetadataDeliveryService } from "../public/PublicMetadataDeliveryService";
import { productionLaunchGateService } from "../deployment/ProductionLaunchGateService";
import { publicSitemapService } from "./PublicSitemapService";
import { robotsTxtService } from "./RobotsTxtService";
import { structuredDataSafetyService } from "./StructuredDataSafetyService";
import { publicUrlNormalizationService } from "./PublicUrlNormalizationService";
import { publicRedirectService } from "./PublicRedirectService";

export class ProductionSeoHealthService {
  async buildHealth(environment = getBackendConfig().app.environment) {
    const [sitemap, robots, redirects, verifications, deployment] = await Promise.all([
      publicSitemapService.verifySitemaps(),
      Promise.resolve(robotsTxtService.verifyRobotsTxt()),
      publicRedirectService.verifyRedirects(),
      searchEngineVerificationRepository.list({ includeArchived: true }),
      productionLaunchGateService.evaluate(environment),
    ]);
    const entries = await publicSitemapService.getSitemapEntries("all");
    const metadataIssues: string[] = [];
    const structuredDataIssues: string[] = [];
    const socialImageIssues: string[] = [];
    for (const entry of entries) {
      const metadata = await publicMetadataDeliveryService.getMetadataForPath(entry.path).catch(() => undefined);
      if (!metadata) {
        metadataIssues.push(`Missing metadata for ${entry.path}.`);
        continue;
      }
      if (!metadata.title || !metadata.description || !metadata.canonicalUrl) metadataIssues.push(`Incomplete metadata for ${entry.path}.`);
      if (metadata.openGraph.image && !publicUrlNormalizationService.isPublicSafeUrl(metadata.openGraph.image)) socialImageIssues.push(`Unsafe social image for ${entry.path}.`);
      const structured = structuredDataSafetyService.inspect(metadata.structuredData);
      structuredDataIssues.push(...structured.blockingIssues.map((issue) => `${entry.path}: ${issue}`));
    }
    const productionDomainIssues = this.verifyProductionDomain();
    const searchEngineIssues = verifications.some((item) => item.status === "verified")
      ? []
      : ["No verified search-engine ownership record exists."];
    const blockingIssues = [
      ...productionDomainIssues,
      ...sitemap.blockingIssues,
      ...robots.blockingIssues,
      ...redirects.blockingIssues,
      ...metadataIssues,
      ...structuredDataIssues,
      ...socialImageIssues,
      ...(environment === "production" ? searchEngineIssues : []),
      ...(deployment.decision === "blocked" ? ["ANM-WEB-103 deployment launch gate is blocked; SEO indexing launch cannot proceed."] : []),
    ];
    const warnings = [...robots.warnings, ...(environment !== "production" ? ["SEO launch checks are running outside production; live crawler evidence is unavailable."] : [])];
    return {
      overallStatus: blockingIssues.length ? "blocked" : warnings.length ? "warning" : "healthy",
      urlCount: entries.length,
      sitemap,
      robots: { ...robots, body: undefined },
      redirects,
      metadataIssueCount: metadataIssues.length,
      structuredDataIssueCount: structuredDataIssues.length,
      socialImageIssueCount: socialImageIssues.length,
      searchEngineVerificationCount: verifications.filter((item) => item.status === "verified").length,
      deploymentDecision: deployment.decision,
      blockingIssues,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }

  verifyProductionDomain() {
    const config = getBackendConfig();
    const issues: string[] = [];
    try {
      const url = new URL(canonicalUrlService.getPublicBaseUrl());
      if (config.app.isProduction && url.protocol !== "https:") issues.push("Production public base URL must use HTTPS.");
      if (config.app.isProduction && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) issues.push("Production public base URL cannot be local.");
      if (config.app.isProduction && /staging|preview|vercel\.app|netlify\.app/i.test(url.hostname)) issues.push("Production canonical domain cannot be a staging or preview host.");
    } catch {
      issues.push("Public base URL is invalid.");
    }
    return issues;
  }
}

export const productionSeoHealthService = new ProductionSeoHealthService();
