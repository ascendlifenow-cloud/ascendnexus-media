import { canonicalUrlService } from "../metadata/CanonicalUrlService";
import { publicRouteMetadataCatalog } from "../metadata/PublicRouteMetadataCatalog";
import { publicArtistService } from "../public/PublicArtistService";
import { publicGalleryDeliveryService } from "../public/PublicGalleryDeliveryService";
import { publicMetadataDeliveryService } from "../public/PublicMetadataDeliveryService";
import { publicReleaseService } from "../public/PublicReleaseService";
import { publicUrlNormalizationService } from "./PublicUrlNormalizationService";

export type SitemapScope = "pages" | "artists" | "releases" | "gallery" | "browse" | "all";

export interface SitemapEntry {
  loc: string;
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
  source: SitemapScope;
}

const xmlEscape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const today = () => new Date().toISOString().slice(0, 10);

export class PublicSitemapService {
  async getSitemapEntries(scope: SitemapScope = "all"): Promise<SitemapEntry[]> {
    const entries: SitemapEntry[] = [];
    if (scope === "all" || scope === "pages" || scope === "browse") entries.push(...await this.getPageEntries(scope === "browse"));
    if (scope === "all" || scope === "artists") entries.push(...await this.getArtistEntries());
    if (scope === "all" || scope === "releases") entries.push(...await this.getReleaseEntries());
    if (scope === "all" || scope === "gallery") entries.push(...await this.getGalleryEntries());
    const deduped = new Map<string, SitemapEntry>();
    for (const entry of entries) {
      const normalized = publicUrlNormalizationService.normalizePublicPath(entry.path);
      if (normalized.blockingIssues.length) continue;
      const metadata = await publicMetadataDeliveryService.getMetadataForPath(normalized.normalizedPath).catch(() => undefined);
      if (!metadata || metadata.noIndex) continue;
      if (!publicUrlNormalizationService.isPublicSafeUrl(metadata.canonicalUrl)) continue;
      deduped.set(metadata.canonicalUrl, { ...entry, loc: metadata.canonicalUrl, path: normalized.normalizedPath, lastmod: entry.lastmod ?? metadata.lastModified?.slice(0, 10) ?? today() });
    }
    return [...deduped.values()].sort((a, b) => a.loc.localeCompare(b.loc));
  }

  async generateUrlSet(scope: SitemapScope = "all") {
    const entries = await this.getSitemapEntries(scope);
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...entries.map((entry) => [
        "  <url>",
        `    <loc>${xmlEscape(entry.loc)}</loc>`,
        entry.lastmod ? `    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "",
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : "",
        entry.priority ? `    <priority>${entry.priority.toFixed(1)}</priority>` : "",
        "  </url>",
      ].filter(Boolean).join("\n")),
      "</urlset>",
    ].join("\n");
  }

  generateSitemapIndex() {
    const base = canonicalUrlService.getPublicBaseUrl();
    const scopes: SitemapScope[] = ["pages", "artists", "releases", "gallery", "browse"];
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...scopes.map((scope) => `  <sitemap><loc>${xmlEscape(`${base}/sitemaps/${scope}.xml`)}</loc><lastmod>${today()}</lastmod></sitemap>`),
      "</sitemapindex>",
    ].join("\n");
  }

  async verifySitemaps() {
    const entries = await this.getSitemapEntries("all");
    const blockingIssues: string[] = [];
    if (!entries.length) blockingIssues.push("Sitemap contains no indexable public URLs.");
    for (const entry of entries) {
      if (!entry.loc.startsWith(canonicalUrlService.getPublicBaseUrl())) blockingIssues.push(`Sitemap URL host mismatch: ${entry.loc}`);
      if (!publicUrlNormalizationService.isPublicSafeUrl(entry.loc)) blockingIssues.push(`Sitemap URL is not public safe: ${entry.loc}`);
    }
    return { status: blockingIssues.length ? "failed" : "passed", urlCount: entries.length, blockingIssues, checkedAt: new Date().toISOString() };
  }

  private async getPageEntries(includeBrowseOnly = false): Promise<SitemapEntry[]> {
    return publicRouteMetadataCatalog.list()
      .filter((route) => route.indexable || (includeBrowseOnly && route.routeKey === "browse"))
      .filter((route) => !route.pathPattern.includes(":"))
      .filter((route) => route.routeKey !== "not_found")
      .map((route) => ({
        path: route.canonicalPath,
        loc: canonicalUrlService.buildCanonicalUrl(route.canonicalPath),
        changefreq: route.routeKey === "home" ? "daily" : "weekly",
        priority: route.routeKey === "home" ? 1 : 0.7,
        source: route.routeKey === "browse" ? "browse" as const : "pages" as const,
      }));
  }

  private async getArtistEntries(): Promise<SitemapEntry[]> {
    return (await publicArtistService.listActivePublishedArtists()).map((artist) => ({ path: `/artists/${artist.slug}`, loc: canonicalUrlService.buildCanonicalUrl(`/artists/${artist.slug}`), changefreq: "weekly", priority: 0.8, source: "artists" }));
  }

  private async getReleaseEntries(): Promise<SitemapEntry[]> {
    return (await publicReleaseService.listPublishedReleases()).map((release) => ({ path: `/songs/${release.slug}`, loc: canonicalUrlService.buildCanonicalUrl(`/songs/${release.slug}`), lastmod: release.releaseDate?.slice(0, 10), changefreq: "monthly", priority: 0.8, source: "releases" }));
  }

  private async getGalleryEntries(): Promise<SitemapEntry[]> {
    return (await publicGalleryDeliveryService.listPublishedGalleryItems()).map((item) => ({ path: `/gallery/${item.slug}`, loc: canonicalUrlService.buildCanonicalUrl(`/gallery/${item.slug}`), changefreq: "monthly", priority: 0.6, source: "gallery" }));
  }
}

export const publicSitemapService = new PublicSitemapService();
