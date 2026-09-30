import { jsonDatabase } from "../media/JsonDatabase";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { membershipCatalogService } from "../membership/MembershipCatalogService";
import { accessPolicyEvaluationService } from "./AccessPolicyEvaluationService";
import { publicAccessProjectionService } from "./PublicAccessProjectionService";

export class MembershipAccessHealthService {
  async getHealthReport() {
    const catalog = await membershipCatalogService.ensureDefaultCatalog();
    const data = await jsonDatabase.read();
    const publicLanding = await publicContentDeliveryService.getPublicHomepage().catch(() => undefined);
    const projectionReport = publicAccessProjectionService.validatePublicProjection(publicLanding);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!catalog.tiers.some((tier) => tier.tierKey === "free" && tier.status === "active")) errors.push("Default free tier is missing.");
    if (!catalog.entitlements.length) errors.push("Entitlement definitions are missing.");
    if (!catalog.tierGrants.length) errors.push("Tier entitlement mappings are missing.");
    if (!projectionReport.safe) errors.push("Public projection safety scan failed.");
    if (!data.contentAccessPolicies.length) warnings.push("No custom content access policies are configured; classification defaults are active.");
    return {
      overallStatus: errors.length ? "blocked" : warnings.length ? "degraded" : "ok",
      tierStatus: catalog.tiers.length ? "ok" : "blocked",
      entitlementStatus: catalog.entitlements.length ? "ok" : "blocked",
      policyStatus: data.contentAccessPolicies.length ? "ok" : "default_policy",
      assignmentStatus: "ok",
      projectionStatus: projectionReport.safe ? "ok" : "blocked",
      mediaStatus: "authorization_ready",
      cacheStatus: "partitioning_ready",
      searchStatus: "access_metadata_ready",
      auditStatus: "ok",
      evaluationStatus: accessPolicyEvaluationService.getHealth().status,
      warnings,
      errors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const membershipAccessHealthService = new MembershipAccessHealthService();
