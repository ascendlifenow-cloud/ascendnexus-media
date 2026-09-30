import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { productionSeoHealthService } from "../services/seo/ProductionSeoHealthService";
import { publicSitemapService } from "../services/seo/PublicSitemapService";
import { robotsTxtService } from "../services/seo/RobotsTxtService";
import { publicRedirectService } from "../services/seo/PublicRedirectService";
import { seoIndexingLaunchGateService } from "../services/seo/SeoIndexingLaunchGateService";
import { publicIndexabilityPolicyService } from "../services/seo/PublicIndexabilityPolicyService";

export class AdminSeoController {
  async overview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "seo.read");
    sendJson(response, 200, { success: true, data: await productionSeoHealthService.buildHealth() });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    return this.overview(request, response);
  }

  async routes(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "seo.read");
    const path = url.searchParams.get("path") ?? "/";
    sendJson(response, 200, { success: true, data: await publicIndexabilityPolicyService.evaluatePath(path) });
  }

  async sitemap(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "seo.read");
    sendJson(response, 200, { success: true, data: { verification: await publicSitemapService.verifySitemaps(), entries: await publicSitemapService.getSitemapEntries("all") } });
  }

  async robots(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "seo.read");
    sendJson(response, 200, { success: true, data: robotsTxtService.verifyRobotsTxt() });
  }

  async redirects(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, request.method === "POST" ? "seo.redirects.manage" : "seo.read");
    if (request.method === "POST") {
      const body = await parseJsonBody(request) as Record<string, unknown>;
      const redirect = await publicRedirectService.createRedirect({
        sourcePath: String(body.sourcePath ?? ""),
        targetPath: String(body.targetPath ?? ""),
        statusCode: Number(body.statusCode ?? 301) as 301 | 302 | 307 | 308,
        reason: String(body.reason ?? "manual redirect"),
        entityType: body.entityType as never,
        entityId: typeof body.entityId === "string" ? body.entityId : undefined,
      });
      sendJson(response, 201, { success: true, data: redirect });
      return;
    }
    sendJson(response, 200, { success: true, data: { redirects: await publicRedirectService.listRedirects(), verification: await publicRedirectService.verifyRedirects() } });
  }

  async searchEngineVerification(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "seo.verify");
    const health = await productionSeoHealthService.buildHealth("production");
    sendJson(response, 200, { success: true, data: { verified: health.searchEngineVerificationCount > 0, count: health.searchEngineVerificationCount, checkedAt: health.checkedAt } });
  }

  async launchGate(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "seo.launch.review");
    sendJson(response, 200, { success: true, data: await seoIndexingLaunchGateService.evaluate(url.searchParams.get("environment") ?? "production") });
  }
}

export const adminSeoController = new AdminSeoController();
