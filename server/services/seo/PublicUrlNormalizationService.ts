import { getBackendConfig } from "../../config/backendConfig";
import { canonicalUrlService } from "../metadata/CanonicalUrlService";

const trackingParams = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "msclkid"]);
const blockedPrefixes = ["/admin", "/api", "/private", "/preview", "/internal"];
const localhostHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export interface UrlNormalizationResult {
  originalPath: string;
  normalizedPath: string;
  canonicalUrl?: string;
  redirectRequired: boolean;
  redirectTarget?: string;
  blockingIssues: string[];
  warnings: string[];
}

export class PublicUrlNormalizationService {
  normalizePublicPath(rawPath: string): UrlNormalizationResult {
    const warnings: string[] = [];
    const blockingIssues: string[] = [];
    const originalPath = rawPath || "/";
    let parsed: URL;
    try {
      parsed = new URL(originalPath, canonicalUrlService.getPublicBaseUrl());
    } catch {
      return { originalPath, normalizedPath: "/", redirectRequired: false, blockingIssues: ["Invalid public URL."], warnings };
    }
    const decodedPath = decodeURIComponent(parsed.pathname || "/");
    let normalizedPath = decodedPath.replace(/\/{2,}/g, "/");
    if (!normalizedPath.startsWith("/")) normalizedPath = `/${normalizedPath}`;
    if (normalizedPath.length > 1) normalizedPath = normalizedPath.replace(/\/+$/, "");
    const lowerPath = normalizedPath.toLowerCase();
    const hasUppercase = normalizedPath !== lowerPath;
    normalizedPath = lowerPath || "/";
    const search = new URLSearchParams(parsed.search);
    for (const key of [...search.keys()]) {
      if (trackingParams.has(key.toLowerCase())) {
        search.delete(key);
        warnings.push(`Removed tracking query parameter ${key}.`);
      }
    }
    const allowedQuery = search.toString();
    const pathWithQuery = `${normalizedPath}${allowedQuery ? `?${allowedQuery}` : ""}`;
    if (blockedPrefixes.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
      blockingIssues.push("Admin, API, preview, private, and internal paths are not public indexable URLs.");
    }
    if (normalizedPath.includes("..")) blockingIssues.push("Path traversal is not allowed.");
    try {
      const base = new URL(canonicalUrlService.getPublicBaseUrl());
      if (getBackendConfig().app.isProduction && (base.protocol !== "https:" || localhostHosts.has(base.hostname) || base.hostname.includes("staging"))) {
        blockingIssues.push("Production canonical base URL must be HTTPS and cannot be local or staging.");
      }
    } catch {
      blockingIssues.push("Configured public base URL is invalid.");
    }
    const canonicalUrl = blockingIssues.length ? undefined : canonicalUrlService.buildCanonicalUrl(normalizedPath);
    const redirectRequired = hasUppercase || decodedPath !== normalizedPath || parsed.search !== (allowedQuery ? `?${allowedQuery}` : "");
    return {
      originalPath,
      normalizedPath: pathWithQuery,
      canonicalUrl,
      redirectRequired,
      redirectTarget: redirectRequired ? pathWithQuery : undefined,
      blockingIssues,
      warnings,
    };
  }

  isPublicSafeUrl(value: unknown) {
    if (typeof value !== "string" || !value) return false;
    if (value.includes("token=") || value.includes("signature=") || value.includes("private/") || value.includes("fullSong") || value.includes("full-song")) return false;
    try {
      const parsed = new URL(value, canonicalUrlService.getPublicBaseUrl());
      return ["http:", "https:"].includes(parsed.protocol) && !localhostHosts.has(parsed.hostname);
    } catch {
      return false;
    }
  }
}

export const publicUrlNormalizationService = new PublicUrlNormalizationService();
