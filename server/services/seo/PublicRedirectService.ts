import crypto from "node:crypto";
import type { PublicRedirectRecord } from "../../models/seo/PublicRedirectModel";
import { publicRedirectRepository } from "../../repositories/seo/SeoRepository";
import { publicUrlNormalizationService } from "./PublicUrlNormalizationService";

export class PublicRedirectService {
  async listRedirects() {
    return publicRedirectRepository.list({ includeArchived: true, sort: "updatedAt", direction: "desc" });
  }

  async findRedirect(path: string) {
    const normalized = publicUrlNormalizationService.normalizePublicPath(path);
    return publicRedirectRepository.findActiveBySourcePath(normalized.normalizedPath.split("?")[0] || "/");
  }

  async createRedirect(input: Pick<PublicRedirectRecord, "sourcePath" | "targetPath" | "statusCode" | "reason" | "entityType" | "entityId">) {
    const source = publicUrlNormalizationService.normalizePublicPath(input.sourcePath);
    const target = publicUrlNormalizationService.normalizePublicPath(input.targetPath);
    const issues = [...source.blockingIssues, ...target.blockingIssues];
    if (source.normalizedPath === target.normalizedPath) issues.push("Redirect source and target cannot match.");
    if (target.redirectTarget === source.normalizedPath) issues.push("Redirect would create a simple loop.");
    if (issues.length) throw Object.assign(new Error(issues.join(" ")), { status: 400, code: "SEO_REDIRECT_INVALID" });
    const now = new Date().toISOString();
    return publicRedirectRepository.create({
      redirectId: `redirect_${crypto.randomUUID()}`,
      sourcePath: source.normalizedPath,
      targetPath: target.normalizedPath,
      statusCode: input.statusCode,
      reason: input.reason,
      entityType: input.entityType,
      entityId: input.entityId,
      active: true,
      status: "active",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
  }

  async verifyRedirects() {
    const redirects = await this.listRedirects();
    const blockingIssues: string[] = [];
    const seen = new Set<string>();
    for (const redirect of redirects.filter((item) => item.active && item.status === "active")) {
      if (seen.has(redirect.sourcePath)) blockingIssues.push(`Duplicate redirect source ${redirect.sourcePath}.`);
      seen.add(redirect.sourcePath);
      if (redirect.sourcePath === redirect.targetPath) blockingIssues.push(`Redirect loop at ${redirect.sourcePath}.`);
      if (await publicRedirectRepository.findActiveBySourcePath(redirect.targetPath)) blockingIssues.push(`Redirect chain starts at ${redirect.sourcePath}.`);
    }
    return { status: blockingIssues.length ? "failed" : "passed", redirectCount: redirects.length, blockingIssues, checkedAt: new Date().toISOString() };
  }
}

export const publicRedirectService = new PublicRedirectService();
