import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { artistIntelligenceService } from "../services/intelligence/ArtistIntelligenceService";
import { audienceGrowthService } from "../services/intelligence/AudienceGrowthService";
import { trendDetectionService } from "../services/intelligence/TrendDetectionService";
import { recommendationEngine } from "../services/intelligence/RecommendationEngine";
import { platformComparisonService } from "../services/intelligence/PlatformComparisonService";
import { growthForecastService } from "../services/intelligence/GrowthForecastService";
import { intelligenceReportService } from "../services/intelligence/IntelligenceReportService";
import { campaignAnalyticsService } from "../services/intelligence/CampaignAnalyticsService";
import { contentPerformanceService } from "../services/intelligence/ContentPerformanceService";
import { seoPerformanceService } from "../services/intelligence/SeoPerformanceService";
import type { IntelligenceReportRecord } from "../models/operations/OperationsModels";

const actorId = (auth: { user?: { userId?: string } }) => auth.user?.userId ?? "admin";

export class AdminIntelligenceController {
  async overview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "intelligence.read");
    const [dashboard, audience, platforms, trends, forecasts, seo] = await Promise.all([
      artistIntelligenceService.buildGlobalDashboard(),
      audienceGrowthService.buildAudienceDashboard(),
      platformComparisonService.comparePlatforms(),
      trendDetectionService.detectTrends(),
      growthForecastService.listForecasts(),
      seoPerformanceService.buildSeoPerformance(),
    ]);
    sendJson(response, 200, { success: true, data: { dashboard, audience, platforms, trends, forecasts, seo } });
  }

  async artist(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "intelligence.read");
    sendJson(response, 200, { success: true, data: await artistIntelligenceService.buildArtistProfile(artistId) });
  }

  async audience(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "intelligence.read");
    sendJson(response, 200, { success: true, data: await audienceGrowthService.buildAudienceDashboard() });
  }

  async trends(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "intelligence.manage" : "intelligence.read");
    sendJson(response, 200, { success: true, data: await trendDetectionService.detectTrends() });
  }

  async recommendations(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "intelligence.manage" : "intelligence.read");
    sendJson(response, 200, { success: true, data: await recommendationEngine.generateRecommendations() });
  }

  async platforms(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "intelligence.read");
    sendJson(response, 200, { success: true, data: await platformComparisonService.comparePlatforms() });
  }

  async forecasts(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "intelligence.manage" : "intelligence.read");
    const data = request.method === "POST" ? await growthForecastService.buildForecasts() : await growthForecastService.listForecasts();
    sendJson(response, 200, { success: true, data });
  }

  async reports(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "intelligence.manage" : "intelligence.reports");
    const body = request.method === "POST" ? await parseJsonBody(request).catch(() => ({})) as { reportType?: IntelligenceReportRecord["reportType"] } : {};
    const data = request.method === "POST" ? await intelligenceReportService.generateReport(body.reportType ?? "monthly_growth", actorId(auth)) : await intelligenceReportService.listReports();
    sendJson(response, request.method === "POST" ? 201 : 200, { success: true, data });
  }

  async campaigns(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "intelligence.read");
    sendJson(response, 200, { success: true, data: await campaignAnalyticsService.buildCampaignDashboard() });
  }

  async content(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "intelligence.read");
    sendJson(response, 200, { success: true, data: await contentPerformanceService.buildContentPerformance() });
  }
}

export const adminIntelligenceController = new AdminIntelligenceController();
