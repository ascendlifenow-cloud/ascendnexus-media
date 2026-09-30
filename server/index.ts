import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { mediaBackendConfig } from "./config/mediaBackendConfig";
import { getBackendConfig } from "./config/backendConfig";
import { validateBackendConfigAtStartup } from "./config/configValidation";
import { databaseConnectionService } from "./database/DatabaseConnectionService";
import { databaseIndexService } from "./database/DatabaseIndexService";
import { sendJson, sendSafeError } from "./middleware/mediaErrorMiddleware";
import { assertOriginAllowedForMutation } from "./utils/security/securityHeaderUtils";
import { handleMaintenanceMode } from "./middleware/deployment/maintenanceMode";
import { handleAdminAuthRoute } from "./routes/adminAuthRoutes";
import { handleMemberAuthRoute } from "./routes/memberAuthRoutes";
import { handleAdminArtistRoute } from "./routes/adminArtistRoutes";
import { handleAdminReleaseRoute } from "./routes/adminReleaseRoutes";
import { handleAdminGalleryRoute } from "./routes/adminGalleryRoutes";
import { handleAdminSiteConfigurationRoute } from "./routes/adminSiteConfigurationRoutes";
import { handleAdminMetadataRoute } from "./routes/adminMetadataRoutes";
import { handleAdminMediaRoute } from "./routes/adminMediaRoutes";
import { handleAdminPublicFormsRoute } from "./routes/adminPublicFormsRoutes";
import { handleAdminSecurityRoute } from "./routes/adminSecurityRoutes";
import { handleAdminDeploymentRoute } from "./routes/adminDeploymentRoutes";
import { handleAdminSeoRoute } from "./routes/adminSeoRoutes";
import { handleAdminObservabilityRoute } from "./routes/adminObservabilityRoutes";
import { handleAdminLaunchReadinessRoute } from "./routes/adminLaunchReadinessRoutes";
import { handleAdminOperationsRoute } from "./routes/adminOperationsRoutes";
import { handleAdminDistributionRoute } from "./routes/adminDistributionRoutes";
import { handleAdminIntelligenceRoute } from "./routes/adminIntelligenceRoutes";
import { handleAdminExportRoute } from "./routes/adminExportRoutes";
import { handleAdminImportRoute } from "./routes/adminImportRoutes";
import { handleAdminMemberCrmRoute } from "./routes/adminMemberCrmRoutes";
import { handleBillingRoute } from "./routes/billingRoutes";
import { handleMemberEcosystemCertificationRoute } from "./routes/memberEcosystemCertificationRoutes";
import { handleDevelopmentSeedRoute } from "./routes/developmentSeedRoutes";
import { handlePublicSeoRoute } from "./routes/publicSeoRoutes";
import { handlePublicRoute } from "./routes/publicRoutes";
import { handleAccessRoute } from "./routes/accessRoutes";
import { handleProtectedContentRoute } from "./routes/protectedContentRoutes";
import { handleMemberPortalRoute } from "./routes/memberPortalRoutes";
import { handleMemberEngagementRoute } from "./routes/memberEngagementRoutes";
import { deploymentHealthService } from "./services/deployment/DeploymentHealthService";
import { mediaIntakeConfigService } from "./services/mediaIntake/MediaIntakeConfigService";
import { mediaIntakeFolderWatcherService } from "./services/mediaIntake/MediaIntakeFolderWatcherService";
import { resolveInsideRoot } from "./utils/media/mediaPathUtils";

const backendConfig = getBackendConfig();
const startupValidation = validateBackendConfigAtStartup(backendConfig);

const logStartupSummary = () => {
  const summary = {
    environment: backendConfig.app.environment,
    serviceName: backendConfig.app.serviceName,
    version: backendConfig.app.version,
    host: mediaBackendConfig.host,
    port: mediaBackendConfig.port,
    databaseConfigured: Boolean(backendConfig.database.uri),
    redisConfigured: Boolean(backendConfig.redis.url),
    authEnabled: backendConfig.auth.enabled,
    storageProvider: backendConfig.storage.provider,
    cdnEnabled: backendConfig.cdn.enabled,
    workersEnabled: backendConfig.processing.workersEnabled,
    emailEnabled: backendConfig.email.enabled,
    publicApiEnabled: backendConfig.publicDelivery.apiEnabled,
    seedFallbackEnabled: backendConfig.publicDelivery.seedFallbackEnabled,
    monitoringEnabled: backendConfig.monitoring.enabled,
    mediaIntakeEnabled: mediaIntakeConfigService.getConfig().enabled,
    configurationValid: startupValidation.valid,
    configurationWarnings: startupValidation.warnings.map((issue) => issue.code),
  };
  console.info(`[config] ${JSON.stringify(summary)}`);
};

const prepareDatabaseForStartup = async () => {
  if (!backendConfig.database.uri) {
    if (backendConfig.app.isProduction || backendConfig.app.isStaging) {
      throw new Error("MONGODB_URI is required before starting the API in staging or production.");
    }
    return;
  }
  await databaseConnectionService.connect();
  await databaseIndexService.ensureIndexes();
};

const contentTypeForPath = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a" || ext === ".mp4") return "audio/mp4";
  return "application/octet-stream";
};

const handleLocalPublicMedia = (request: http.IncomingMessage, response: http.ServerResponse, url: URL): boolean => {
  const method = request.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") return false;
  const publicMount = mediaBackendConfig.publicBaseUrl.startsWith("/") ? mediaBackendConfig.publicBaseUrl.replace(/\/+$/, "") : "";
  if (!publicMount || !url.pathname.startsWith(`${publicMount}/`)) return false;
  const storagePath = decodeURIComponent(url.pathname.slice(publicMount.length + 1));
  if (!storagePath.startsWith(`${mediaBackendConfig.publicPrefix}/`) || storagePath.includes("\0")) {
    sendJson(response, 404, { success: false, errors: ["Public media not found."] });
    return true;
  }
  let absolutePath: string;
  try {
    absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, storagePath);
  } catch {
    sendJson(response, 404, { success: false, errors: ["Public media not found."] });
    return true;
  }
  fs.stat(absolutePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      sendJson(response, 404, { success: false, errors: ["Public media not found."] });
      return;
    }
    response.writeHead(200, {
      "Content-Type": contentTypeForPath(absolutePath),
      "Content-Length": stat.size,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    });
    if (method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(absolutePath).pipe(response);
  });
  return true;
};

export const createMediaApiServer = () => http.createServer(async (request, response) => {
  try {
    assertOriginAllowedForMutation(request);
    if (handleMaintenanceMode(request, response)) return;
    const host = request.headers.host ?? `127.0.0.1:${mediaBackendConfig.port}`;
    const url = new URL(request.url ?? "/", `http://${host}`);
    if (handleLocalPublicMedia(request, response, url)) return;
    if (url.pathname === "/health/live") {
      sendJson(response, 200, { success: true, live: true, service: "ascend-nexus-media-api", checkedAt: new Date().toISOString() });
      return;
    }
    if (url.pathname === "/health/ready") {
      const health = await deploymentHealthService.getHealth();
      sendJson(response, health.ready ? 200 : 503, { success: health.ready, data: health });
      return;
    }
    if (url.pathname === "/api/health") {
      sendJson(response, 200, { success: true, service: "ascend-nexus-media-api", checkedAt: new Date().toISOString() });
      return;
    }
    if (await handlePublicSeoRoute(request, response, url)) return;
    if (await handleProtectedContentRoute(request, response, url)) return;
    if (await handleMemberEngagementRoute(request, response, url)) return;
    if (await handleMemberPortalRoute(request, response, url)) return;
    if (await handleBillingRoute(request, response, url)) return;
    if (await handleAccessRoute(request, response, url)) return;
    if (await handlePublicRoute(request, response, url)) return;
    if (await handleAdminMemberCrmRoute(request, response, url)) return;
    if (await handleDevelopmentSeedRoute(request, response, url)) return;
    if (await handleMemberAuthRoute(request, response, url)) return;
    if (await handleAdminAuthRoute(request, response, url)) return;
    if (await handleAdminArtistRoute(request, response, url)) return;
    if (await handleAdminReleaseRoute(request, response, url)) return;
    if (await handleAdminGalleryRoute(request, response, url)) return;
    if (await handleAdminSiteConfigurationRoute(request, response, url)) return;
    if (await handleAdminMetadataRoute(request, response, url)) return;
    if (await handleAdminMediaRoute(request, response, url)) return;
    if (await handleAdminPublicFormsRoute(request, response, url)) return;
    if (await handleAdminSecurityRoute(request, response, url)) return;
    if (await handleAdminDeploymentRoute(request, response, url)) return;
    if (await handleAdminSeoRoute(request, response, url)) return;
    if (await handleAdminLaunchReadinessRoute(request, response, url)) return;
    if (await handleMemberEcosystemCertificationRoute(request, response, url)) return;
    if (await handleAdminObservabilityRoute(request, response, url)) return;
    if (await handleAdminOperationsRoute(request, response, url)) return;
    if (await handleAdminDistributionRoute(request, response, url)) return;
    if (await handleAdminIntelligenceRoute(request, response, url)) return;
    if (await handleAdminExportRoute(request, response, url)) return;
    if (await handleAdminImportRoute(request, response, url)) return;
    sendJson(response, 404, { success: false, errors: ["Route not found."] });
  } catch (error) {
    sendSafeError(response, error);
  }
});

if (process.argv[1]?.endsWith("server/index.ts") || process.argv[1]?.endsWith("server/index.js")) {
  logStartupSummary();
  prepareDatabaseForStartup()
    .then(() => {
      const mediaIntakeConfig = mediaIntakeConfigService.getConfig();
      if (mediaIntakeConfig.enabled) mediaIntakeFolderWatcherService.start(mediaIntakeConfig);
      createMediaApiServer().listen(mediaBackendConfig.port, mediaBackendConfig.host, () => {
        console.log(`Ascend Nexus Media API listening on http://${mediaBackendConfig.host}:${mediaBackendConfig.port}`);
      });
    })
    .catch((error) => {
      console.error(`[database] startup failed: ${error instanceof Error ? error.message : "Unknown database error."}`);
      process.exitCode = 1;
    });
}
