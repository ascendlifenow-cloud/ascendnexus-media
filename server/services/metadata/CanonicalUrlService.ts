import { getBackendConfig } from "../../config/backendConfig";

const localFallbackBase = "https://ascendnexusmedia.com";

export class CanonicalUrlService {
  getPublicBaseUrl() {
    return (getBackendConfig().server.publicAppBaseUrl || localFallbackBase).replace(/\/+$/, "");
  }

  validateCanonicalPath(path: string) {
    return path.startsWith("/") && !path.includes("..") && !path.startsWith("/admin") && !path.startsWith("/api") && !path.startsWith("/private");
  }

  buildCanonicalUrl(path: string) {
    const clean = this.normalizePath(path);
    if (!this.validateCanonicalPath(clean)) throw new Error("METADATA_PATH_INVALID");
    return `${this.getPublicBaseUrl()}${clean === "/" ? "" : clean}`;
  }

  normalizePath(path: string) {
    const withoutQuery = path.split("?")[0]?.split("#")[0] || "/";
    const prefixed = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
    return prefixed.length > 1 ? prefixed.replace(/\/+$/, "") : "/";
  }

  normalizeCanonicalUrl(url: string) {
    const parsed = new URL(url, this.getPublicBaseUrl());
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, parsed.pathname === "/" ? "/" : "");
  }

  isSameOriginCanonical(url: string) {
    try {
      return new URL(url).origin === new URL(this.getPublicBaseUrl()).origin;
    } catch {
      return false;
    }
  }
}

export const canonicalUrlService = new CanonicalUrlService();
