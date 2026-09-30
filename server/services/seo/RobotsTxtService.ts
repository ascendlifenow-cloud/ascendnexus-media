import { getBackendConfig } from "../../config/backendConfig";
import { canonicalUrlService } from "../metadata/CanonicalUrlService";

const productionDisallow = ["/admin/", "/api/", "/private/", "/preview/", "/internal/", "/login", "/health", "/newsletter/confirm", "/newsletter/unsubscribe"];

export class RobotsTxtService {
  generateRobotsTxt() {
    const config = getBackendConfig();
    if (!config.app.isProduction) {
      return ["User-agent: *", "Disallow: /", `Sitemap: ${canonicalUrlService.getPublicBaseUrl()}/sitemap.xml`, ""].join("\n");
    }
    return [
      "User-agent: *",
      "Allow: /",
      ...productionDisallow.map((path) => `Disallow: ${path}`),
      "Disallow: /search?",
      `Sitemap: ${canonicalUrlService.getPublicBaseUrl()}/sitemap.xml`,
      "",
    ].join("\n");
  }

  verifyRobotsTxt() {
    const config = getBackendConfig();
    const body = this.generateRobotsTxt();
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    if (config.app.isProduction && /Disallow:\s*\/\s*(?:\n|$)/.test(body)) blockingIssues.push("Production robots.txt cannot disallow the entire site.");
    if (!body.includes("/sitemap.xml")) blockingIssues.push("robots.txt must include the sitemap URL.");
    if (config.app.isProduction && !canonicalUrlService.getPublicBaseUrl().startsWith("https://")) blockingIssues.push("Production sitemap URL must use HTTPS.");
    if (!config.app.isProduction) warnings.push("Non-production robots.txt intentionally disallows crawling.");
    return { status: blockingIssues.length ? "failed" : "passed", blockingIssues, warnings, checkedAt: new Date().toISOString(), body };
  }
}

export const robotsTxtService = new RobotsTxtService();
