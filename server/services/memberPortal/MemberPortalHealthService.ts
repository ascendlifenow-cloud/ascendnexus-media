import { memberIdentityService } from "../members/MemberIdentityService";
import { membershipAccessHealthService } from "../access/MembershipAccessHealthService";
import { protectedContentDeliveryHealthService } from "../protectedContent/ProtectedContentDeliveryHealthService";
import { memberDashboardService } from "./MemberDashboardService";
import { memberPortalCacheService } from "./MemberPortalCacheService";

export class MemberPortalHealthService {
  async getHealthReport() {
    const [identity, access, protectedDelivery, dashboard] = await Promise.all([
      memberIdentityService.getHealth(),
      membershipAccessHealthService.getHealthReport(),
      protectedContentDeliveryHealthService.getHealthReport(),
      memberDashboardService.getHealth(),
    ]);
    const errors = [
      ...(access.errors ?? []),
      ...(protectedDelivery.errors ?? []),
      ...(dashboard.errors ?? []),
    ];
    const warnings = [
      ...(access.warnings ?? []),
      ...(protectedDelivery.warnings ?? []),
      ...(dashboard.warnings ?? []),
      "Favorites, following, playlists, listening history, and notification-center persistence remain readiness features for ANM-WEB-115.",
      "Billing checkout remains readiness-only until ANM-WEB-117.",
    ];
    return {
      overallStatus: errors.length ? "degraded" : "available",
      sessionStatus: identity.sessionStoreReady ? "available" : "degraded",
      dashboardStatus: dashboard.overallStatus,
      membershipStatus: access.overallStatus,
      contentStatus: protectedDelivery.overallStatus,
      recommendationStatus: dashboard.recommendations.overallStatus,
      profileStatus: "available",
      securityStatus: identity.securityEventsReady ? "available" : "degraded",
      cacheStatus: memberPortalCacheService.getHealth(),
      privacyStatus: "available",
      warnings,
      errors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const memberPortalHealthService = new MemberPortalHealthService();
