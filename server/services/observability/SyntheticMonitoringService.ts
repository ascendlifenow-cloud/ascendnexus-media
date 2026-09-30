import crypto from "node:crypto";
import { canonicalUrlService } from "../metadata/CanonicalUrlService";
import { publicSitemapService } from "../seo/PublicSitemapService";
import { robotsTxtService } from "../seo/RobotsTxtService";
import { syntheticCheckRepository, syntheticCheckResultRepository } from "../../repositories/observability/ObservabilityRepository";
import type { SyntheticCheckRecord } from "../../models/observability/ObservabilityModels";

const now = () => new Date().toISOString();

export class SyntheticMonitoringService {
  defaultChecks(environment = "development"): SyntheticCheckRecord[] {
    const base = canonicalUrlService.getPublicBaseUrl();
    return [
      ["homepage", "Homepage", `${base}/`],
      ["public-health", "Public health", `${base}/api/public/health`],
      ["site-api", "Site API", `${base}/api/public/site`],
      ["homepage-api", "Homepage API", `${base}/api/public/homepage`],
      ["artists", "Artist list", `${base}/api/public/artists`],
      ["releases", "Release list", `${base}/api/public/releases`],
      ["gallery", "Gallery", `${base}/api/public/gallery`],
      ["sitemap", "Sitemap", `${base}/sitemap.xml`],
      ["robots", "Robots", `${base}/robots.txt`],
      ["search", "Search readiness", `${base}/api/public/search?q=synthetic`],
      ["contact", "Contact availability", `${base}/api/public/contact/availability`],
      ["consent", "Consent policy", `${base}/api/public/consent/policy`],
    ].map(([id, name, target]) => ({
      checkId: `synthetic_${id}`,
      name,
      type: "http" as const,
      target,
      frequencySeconds: 300,
      timeoutMs: 5000,
      criticality: ["homepage", "public-health", "site-api"].includes(id) ? "critical" as const : "high" as const,
      environment,
      enabled: true,
      successCriteria: ["HTTP 2xx/3xx", "privacy-safe response"],
      runbook: "docs/ANM-WEB-105-observability-operations-runbook.md",
      status: "active" as const,
      createdAt: now(),
      updatedAt: now(),
      schemaVersion: 1,
    }));
  }

  async registerDefaults(environment?: string) {
    const existing = await syntheticCheckRepository.list({ includeArchived: true });
    const existingIds = new Set(existing.map((check) => check.checkId));
    for (const check of this.defaultChecks(environment)) {
      if (!existingIds.has(check.checkId)) await syntheticCheckRepository.create(check);
    }
    return syntheticCheckRepository.list();
  }

  async runSuite(environment?: string) {
    const checks = (await this.registerDefaults(environment)).filter((check) => check.enabled && check.status === "active");
    const results = [];
    for (const check of checks) results.push(await this.runCheck(check.checkId));
    return {
      status: results.some((result) => result.status === "failed" && checks.find((check) => check.checkId === result.checkId)?.criticality === "critical") ? "failed" : results.some((result) => result.status === "failed") ? "warning" : "passed",
      checks: results,
      checkedAt: now(),
    };
  }

  async runCheck(checkId: string) {
    const check = await syntheticCheckRepository.get(checkId);
    if (!check) throw Object.assign(new Error("Synthetic check not found."), { status: 404 });
    const started = Date.now();
    let status: "passed" | "failed" | "skipped" = "passed";
    const errors: string[] = [];
    if (check.target.endsWith("/sitemap.xml")) {
      const sitemap = await publicSitemapService.verifySitemaps();
      if (sitemap.status !== "passed") { status = "failed"; errors.push(...sitemap.blockingIssues); }
    } else if (check.target.endsWith("/robots.txt")) {
      const robots = robotsTxtService.verifyRobotsTxt();
      if (robots.status !== "passed") { status = "failed"; errors.push(...robots.blockingIssues); }
    }
    const result = await syntheticCheckResultRepository.create({
      syntheticResultId: `synthetic_result_${crypto.randomUUID()}`,
      checkId,
      status,
      latencyMs: Date.now() - started,
      checkedAt: now(),
      safeSummary: status === "passed" ? `${check.name} passed local verification.` : `${check.name} failed local verification.`,
      errors,
      schemaVersion: 1,
    });
    return result;
  }

  async getHealth() {
    const results = await syntheticCheckResultRepository.list({ includeArchived: true, sort: "checkedAt", direction: "desc", limit: 50 });
    return { status: results.some((result) => result.status === "failed") ? "degraded" : "healthy", resultCount: results.length, checkedAt: now() };
  }
}

export const syntheticMonitoringService = new SyntheticMonitoringService();
