const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "health";
const { artistIntelligenceService } = await import("../server/services/intelligence/ArtistIntelligenceService.ts");
const { audienceGrowthService } = await import("../server/services/intelligence/AudienceGrowthService.ts");
const { trendDetectionService } = await import("../server/services/intelligence/TrendDetectionService.ts");
const { recommendationEngine } = await import("../server/services/intelligence/RecommendationEngine.ts");
const { platformComparisonService } = await import("../server/services/intelligence/PlatformComparisonService.ts");
const { growthForecastService } = await import("../server/services/intelligence/GrowthForecastService.ts");
const { intelligenceReportService } = await import("../server/services/intelligence/IntelligenceReportService.ts");
const { contentPerformanceService } = await import("../server/services/intelligence/ContentPerformanceService.ts");
const { seoPerformanceService } = await import("../server/services/intelligence/SeoPerformanceService.ts");

const output = (payload) => console.log(JSON.stringify(payload, null, 2));
const blocks = (payload) => /"status":\s*"failed"|"severity":\s*"critical"/.test(JSON.stringify(payload));

try {
  let result;
  switch (command) {
    case "health":
    case "verify":
      result = await artistIntelligenceService.buildGlobalDashboard();
      break;
    case "audience":
      result = await audienceGrowthService.buildAudienceDashboard();
      break;
    case "trends":
      result = await trendDetectionService.detectTrends();
      break;
    case "recommendations":
      result = await recommendationEngine.generateRecommendations();
      break;
    case "platform-comparison":
      result = await platformComparisonService.comparePlatforms();
      break;
    case "forecast":
      result = await growthForecastService.buildForecasts();
      break;
    case "reports":
      result = await intelligenceReportService.generateReport(args.get("reportType") ?? "monthly_growth", "intelligence_cli");
      break;
    case "content":
      result = await contentPerformanceService.buildContentPerformance();
      break;
    case "seo":
      result = await seoPerformanceService.buildSeoPerformance();
      break;
    default:
      throw new Error(`Unknown intelligence command: ${command}`);
  }
  output(result);
  if (blocks(result)) process.exitCode = 1;
} catch (error) {
  output({ success: false, command, message: error instanceof Error ? error.message : "Unknown intelligence verification error." });
  process.exitCode = 1;
}
