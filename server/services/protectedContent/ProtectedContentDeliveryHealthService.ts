import { publicDeliveryVerificationService } from "../public/PublicDeliveryVerificationService";
import { jsonDatabase } from "../media/JsonDatabase";
import { protectedContentDeliveryAuthorizationService } from "./ProtectedContentDeliveryAuthorizationService";

export class ProtectedContentDeliveryHealthService {
  async getHealthReport() {
    const profiles = await protectedContentDeliveryAuthorizationService.ensureDefaultProfiles();
    const data = await jsonDatabase.read();
    const publicSafety = await publicDeliveryVerificationService.buildFullReport();
    const activeAuthorizations = data.protectedMediaAuthorizations.filter((item) => item.status === "active" && item.expiresAt > new Date().toISOString()).length;
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!profiles.some((profile) => profile.profileKey === "protected_audio_stream" && profile.status === "active")) errors.push("Protected audio stream profile is missing.");
    if (!profiles.some((profile) => profile.profileKey === "protected_download" && profile.status === "active")) errors.push("Protected download profile is missing.");
    if (!publicSafety.success) errors.push("Public delivery safety failed.");
    if (!data.protectedMediaResources.length) warnings.push("No protected media resources have been registered yet; resources are created lazily from private storage objects.");
    return {
      overallStatus: errors.length ? "unavailable" : warnings.length ? "degraded" : "healthy",
      storageStatus: "private_storage_required",
      gatewayStatus: "protected_gateway_ready",
      cdnStatus: "signed_cdn_readiness",
      authorizationStatus: "ready",
      rangeStatus: "single_range_supported",
      playbackStatus: "session_tracking_ready",
      downloadStatus: "separate_authorization_ready",
      cacheStatus: "private_no_store",
      searchStatus: publicSafety.success ? "isolated" : "blocked",
      seoStatus: publicSafety.success ? "isolated" : "blocked",
      securityStatus: publicSafety.success ? "safe" : "blocked",
      protectedAssetCount: data.protectedMediaResources.length,
      activeAuthorizations,
      activePlaybackSessions: data.protectedPlaybackSessions.filter((item) => ["authorized", "starting", "playing", "paused"].includes(item.status)).length,
      takedowns: data.protectedContentTakedowns.filter((item) => item.status === "active").length,
      warnings,
      errors,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const protectedContentDeliveryHealthService = new ProtectedContentDeliveryHealthService();
