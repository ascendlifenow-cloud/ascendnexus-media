const sensitiveParams = /token|code|email|confirmation|unsubscribe|reset|session|auth|signature|key|secret|state/i;

export class AnalyticsUrlSanitizationService {
  sanitizePath(input: unknown): { routeKey: string; path?: string } {
    const raw = typeof input === "string" ? input : "/";
    const withoutHash = raw.split("#")[0] || "/";
    const [pathname, query = ""] = withoutHash.split("?");
    const safePath = pathname.startsWith("/") && !pathname.startsWith("/admin") && !pathname.startsWith("/api") ? pathname : "/";
    if (!query) return { routeKey: safePath, path: safePath };
    const params = new URLSearchParams(query);
    const allowed = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (sensitiveParams.test(key)) continue;
      if (key === "page" || key === "sort" || key === "genre" || key === "mediaType") allowed.set(key, value.slice(0, 40));
      if (safePath === "/search" && key === "q") allowed.set("queryLength", String(value.trim().length));
    }
    const sanitizedQuery = allowed.toString();
    return { routeKey: safePath, path: sanitizedQuery ? `${safePath}?${sanitizedQuery}` : safePath };
  }
}

export const analyticsUrlSanitizationService = new AnalyticsUrlSanitizationService();
