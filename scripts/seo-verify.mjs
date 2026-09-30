const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.length ? rest.join("=") : "true"];
}));

const command = args.get("command") || "verify";
const environment = args.get("environment") || process.env.DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || "development";
const target = args.get("target") || "/";
const json = args.get("json") === "true" || args.has("json");

if (environment === "production") {
  process.env.DEPLOYMENT_ENVIRONMENT = "production";
  process.env.NODE_ENV = "production";
}

const { productionSeoHealthService } = await import("../server/services/seo/ProductionSeoHealthService.ts");
const { seoIndexingLaunchGateService } = await import("../server/services/seo/SeoIndexingLaunchGateService.ts");
const { publicSitemapService } = await import("../server/services/seo/PublicSitemapService.ts");
const { robotsTxtService } = await import("../server/services/seo/RobotsTxtService.ts");
const { publicRedirectService } = await import("../server/services/seo/PublicRedirectService.ts");
const { publicIndexabilityPolicyService } = await import("../server/services/seo/PublicIndexabilityPolicyService.ts");
const { publicMetadataDeliveryService } = await import("../server/services/public/PublicMetadataDeliveryService.ts");
const { structuredDataSafetyService } = await import("../server/services/seo/StructuredDataSafetyService.ts");

const summarize = (payload) => {
  if (json) return JSON.stringify(payload, null, 2);
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload, null, 2);
};

const run = async () => {
  switch (command) {
    case "health":
    case "verify":
    case "privacy-scan":
    case "links-verify":
    case "social-verify":
    case "renderability-verify":
    case "orphan-scan":
      return productionSeoHealthService.buildHealth(environment);
    case "metadata-verify": {
      const metadata = await publicMetadataDeliveryService.getMetadataForPath(target);
      return { status: metadata ? "passed" : "failed", target, metadata, checkedAt: new Date().toISOString(), blockingIssues: metadata ? [] : ["Metadata did not resolve for target."] };
    }
    case "canonical-verify":
      return publicIndexabilityPolicyService.evaluatePath(target);
    case "sitemap-generate":
      return args.has("json") ? { sitemap: await publicSitemapService.generateUrlSet("all") } : await publicSitemapService.generateUrlSet("all");
    case "sitemap-verify":
      return publicSitemapService.verifySitemaps();
    case "robots-generate":
      return robotsTxtService.generateRobotsTxt();
    case "robots-verify":
      return robotsTxtService.verifyRobotsTxt();
    case "redirects-verify":
      return publicRedirectService.verifyRedirects();
    case "structured-data-verify": {
      const metadata = await publicMetadataDeliveryService.getMetadataForPath(target);
      const safety = structuredDataSafetyService.inspect(metadata?.structuredData);
      return { status: safety.valid ? "passed" : "failed", target, ...safety };
    }
    case "search-engine-verify": {
      const health = await productionSeoHealthService.buildHealth("production");
      return { status: health.searchEngineVerificationCount > 0 ? "passed" : "failed", searchEngineVerificationCount: health.searchEngineVerificationCount, blockingIssues: health.searchEngineVerificationCount > 0 ? [] : ["No verified search-engine ownership record exists."], checkedAt: health.checkedAt };
    }
    case "indexing-launch-gate":
      return seoIndexingLaunchGateService.evaluate(environment);
    default:
      throw new Error(`Unknown SEO verification command: ${command}`);
  }
};

try {
  const result = await run();
  console.log(summarize(result));
  const text = typeof result === "string" ? result : JSON.stringify(result);
  const failed = /"status":"failed"|"overallStatus":"blocked"|"decision":"blocked"/.test(text.replace(/\s/g, ""));
  if (failed) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ success: false, command, message: error instanceof Error ? error.message : "Unknown SEO verification error." }, null, 2));
  process.exitCode = 1;
}
