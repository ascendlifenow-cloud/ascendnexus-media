import type { IncomingMessage, ServerResponse } from "node:http";
import { publicSeoController } from "../controllers/public/publicSeoController";
import type { SitemapScope } from "../services/seo/PublicSitemapService";

const sitemapScopes = new Set(["pages", "artists", "releases", "gallery", "browse"]);

export const handlePublicSeoRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method !== "GET" && method !== "HEAD") return false;
  if (path === "/robots.txt") return publicSeoController.robots(request, response).then(() => true);
  if (path === "/sitemap.xml") return publicSeoController.sitemapIndex(request, response).then(() => true);
  const sitemapMatch = /^\/sitemaps\/([^/]+)\.xml$/.exec(path);
  if (sitemapMatch && sitemapScopes.has(sitemapMatch[1])) return publicSeoController.sitemap(request, response, sitemapMatch[1] as SitemapScope).then(() => true);
  return publicSeoController.redirect(request, response, path);
};
