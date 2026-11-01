import { publicDeliveryVerificationService } from "../public/PublicDeliveryVerificationService";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import { protectedDeliveryTelemetryService, type ProtectedDeliveryTelemetryService } from "./ProtectedDeliveryTelemetryService";

export class ProtectedContentDeliveryHealthService {
  constructor(private readonly telemetry: ProtectedDeliveryTelemetryService = protectedDeliveryTelemetryService) {}

  async getHealthReport(snapshot?: MediaDatabaseShape) {
    const data = snapshot ?? await jsonDatabase.read();
    const profiles = data.mediaDeliveryProfiles;
    const publicSafety = await publicDeliveryVerificationService.buildFullReport();
    const now = Date.now();
    const activeAuthorizations = data.protectedMediaAuthorizations.filter((item) => item.status === "active" && Date.parse(item.expiresAt) > now).length;
    const observations = this.telemetry.getSnapshot();
    const errors: string[] = [];
    const warnings: string[] = [];
    const validProfile = (key: string, action: "stream" | "download") => {
      const matches = profiles.filter(profile => profile.profileKey === key);
      const profile = matches.length === 1 ? matches[0] : undefined;
      return Boolean(profile && profile.status === "active" && profile.deliveryMode === "protected_gateway" && profile.mediaType === "audio"
        && profile.publicCacheAllowed === false && profile.privateCacheAllowed === false && profile.cdnAllowed === false
        && profile.memberBindingRequired === true && profile.sessionBindingRequired === true
        && Array.isArray(profile.allowedActions) && profile.allowedActions.length === 1 && profile.allowedActions[0] === action
        && profile.requiredEntitlementKey === (action === "stream" ? "audio.stream.full" : "audio.download")
        && Number.isSafeInteger(profile.tokenTtlSeconds) && profile.tokenTtlSeconds > 0 && profile.tokenTtlSeconds <= 900
        && profile.downloadAllowed === (action === "download")
        && (action === "download" ? profile.maxUses === 1 : profile.rangeRequestsAllowed === true));
    };
    const streamConfigured = validProfile("protected_audio_stream", "stream");
    const downloadConfigured = validProfile("protected_download", "download");
    if (!streamConfigured) errors.push("Protected audio stream profile is missing, ambiguous, or unsafe.");
    if (!downloadConfigured) errors.push("Protected download profile is missing, ambiguous, or unsafe.");
    if (!publicSafety.success) errors.push("Public delivery safety failed.");
    if (observations.serverFailures) errors.push("Recent protected delivery server failures were observed in this process.");
    if (observations.stalledRequests) errors.push("Protected delivery requests have exceeded the expected completion window.");
    warnings.push("Deployed browser/CDN delivery, private storage permissions, search, SEO, and caches are not verified by this report.");
    if (!observations.originByteResponsesCompleted) warnings.push("No completed protected byte response has been observed in this process during the retained window.");
    if (!data.protectedMediaResources.length) warnings.push("No protected media resources have been registered yet; resources are created lazily from private storage objects.");
    return {
      overallStatus: errors.length ? "unavailable" : "degraded",
      verificationScope: "configuration_public_projection_checks_and_single_process_origin_observations",
      endToEndVerified: false,
      storageStatus: "not_probed",
      gatewayStatus: observations.serverFailures || observations.stalledRequests ? "origin_failures_observed" : observations.originByteResponsesCompleted ? "origin_byte_delivery_observed" : "unverified",
      cdnStatus: "not_probed",
      authorizationStatus: streamConfigured && downloadConfigured ? "profiles_configured" : "configuration_invalid",
      rangeStatus: observations.originRangeResponsesCompleted ? "origin_range_delivery_observed" : "unverified",
      playbackStatus: "session_records_checked_not_client_playback",
      downloadStatus: !downloadConfigured ? "configuration_invalid" : observations.originDownloadsCompleted ? "origin_download_observed" : "unverified",
      cacheStatus: "not_probed",
      searchStatus: "not_probed",
      seoStatus: "not_probed",
      securityStatus: publicSafety.success ? "public_projection_check_passed" : "public_projection_check_failed",
      protectedAssetCount: data.protectedMediaResources.length,
      activeAuthorizations,
      activePlaybackSessions: data.protectedPlaybackSessions.filter((item) => ["authorized", "starting", "playing", "paused"].includes(item.status) && Date.parse(item.expiresAt) > now).length,
      takedowns: data.protectedContentTakedowns.filter((item) => item.status === "active").length,
      warnings,
      errors,
      observations,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const protectedContentDeliveryHealthService = new ProtectedContentDeliveryHealthService();
