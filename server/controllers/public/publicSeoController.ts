import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../middleware/mediaErrorMiddleware";
import { buildCorsHeaders, buildSecurityHeaders } from "../../utils/security/securityHeaderUtils";
import { publicSitemapService, type SitemapScope } from "../../services/seo/PublicSitemapService";
import { robotsTxtService } from "../../services/seo/RobotsTxtService";
import { publicRedirectService } from "../../services/seo/PublicRedirectService";

const sendText = (request: IncomingMessage, response: ServerResponse, status: number, body: string, contentType: string) => {
  response.writeHead(status, {
    ...buildSecurityHeaders(request),
    ...buildCorsHeaders(request),
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300, stale-while-revalidate=300",
    "X-Robots-Tag": "noarchive",
  });
  response.end(body);
};

export class PublicSeoController {
  async robots(request: IncomingMessage, response: ServerResponse) {
    sendText(request, response, 200, robotsTxtService.generateRobotsTxt(), "text/plain; charset=utf-8");
  }

  async sitemapIndex(request: IncomingMessage, response: ServerResponse) {
    sendText(request, response, 200, publicSitemapService.generateSitemapIndex(), "application/xml; charset=utf-8");
  }

  async sitemap(request: IncomingMessage, response: ServerResponse, scope: SitemapScope) {
    sendText(request, response, 200, await publicSitemapService.generateUrlSet(scope), "application/xml; charset=utf-8");
  }

  async redirect(request: IncomingMessage, response: ServerResponse, path: string) {
    const redirect = await publicRedirectService.findRedirect(path);
    if (!redirect) return false;
    response.writeHead(redirect.statusCode, { Location: redirect.targetPath, "Cache-Control": "public, max-age=3600", ...buildSecurityHeaders(request), ...buildCorsHeaders(request) });
    response.end();
    return true;
  }

  async health(_request: IncomingMessage, response: ServerResponse) {
    sendJson(response, 200, { success: true, data: await publicSitemapService.verifySitemaps() });
  }
}

export const publicSeoController = new PublicSeoController();
