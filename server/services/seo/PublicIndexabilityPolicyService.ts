import { publicRouteMetadataCatalog } from "../metadata/PublicRouteMetadataCatalog";
import { publicMetadataDeliveryService } from "../public/PublicMetadataDeliveryService";
import { publicUrlNormalizationService } from "./PublicUrlNormalizationService";

export interface IndexabilityResult {
  path: string;
  indexable: boolean;
  routeKey: string;
  robots: string;
  canonicalUrl?: string;
  blockingIssues: string[];
  warnings: string[];
  checkedAt: string;
}

export class PublicIndexabilityPolicyService {
  async evaluatePath(path: string): Promise<IndexabilityResult> {
    const normalized = publicUrlNormalizationService.normalizePublicPath(path);
    const match = publicRouteMetadataCatalog.matchPath(normalized.normalizedPath);
    const blockingIssues = [...normalized.blockingIssues];
    const warnings = [...normalized.warnings];
    let robots = match.definition.indexable ? "index, follow" : "noindex, follow";
    let canonicalUrl = normalized.canonicalUrl;
    if (!publicRouteMetadataCatalog.isAllowedPublicPath(normalized.normalizedPath)) blockingIssues.push("Path is not an allowed public route.");
    const metadata = await publicMetadataDeliveryService.getMetadataForPath(normalized.normalizedPath).catch(() => undefined);
    if (!metadata && match.definition.indexable) blockingIssues.push("No published public metadata resolves for this indexable route.");
    if (metadata) {
      robots = metadata.robots;
      canonicalUrl = metadata.canonicalUrl;
      if (metadata.noIndex && match.definition.indexable) warnings.push("Published metadata currently noindexes an otherwise indexable route.");
    }
    if (!match.definition.indexable) blockingIssues.push("Route policy is noindex.");
    return {
      path: normalized.normalizedPath,
      indexable: blockingIssues.length === 0 && !robots.includes("noindex"),
      routeKey: match.definition.routeKey,
      robots,
      canonicalUrl,
      blockingIssues,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const publicIndexabilityPolicyService = new PublicIndexabilityPolicyService();
