import type { IncomingMessage } from "node:http";
import { getBackendConfig } from "../../config/backendConfig";

const adminMutationMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export const isAdminPath = (path: string) => path.startsWith("/api/admin");
export const isPublicPath = (path: string) => path.startsWith("/api/public");
export const isCredentialedApiPath = (path: string) =>
  path.startsWith("/api/admin") ||
  path.startsWith("/api/auth") ||
  path.startsWith("/api/account") ||
  path.startsWith("/api/member");

export const getRequestPath = (request: IncomingMessage) => {
  try {
    const host = request.headers.host ?? "localhost";
    return new URL(request.url ?? "/", `http://${host}`).pathname;
  } catch {
    return "/";
  }
};

export const buildContentSecurityPolicy = () => {
  const config = getBackendConfig();
  const media = [config.cdn.baseUrl, config.cdn.imageBaseUrl, config.cdn.audioBaseUrl, config.storage.publicBaseUrl].filter(Boolean).map((value) => new URL(value!).origin);
  const connect = [config.server.publicApiBaseUrl, config.server.publicAppBaseUrl, config.server.adminAppBaseUrl].filter(Boolean).map((value) => {
    try {
      return new URL(value!).origin;
    } catch {
      return "'self'";
    }
  });
  const unique = (items: string[]) => [...new Set(items)];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `img-src ${unique(["'self'", "data:", "blob:", ...media]).join(" ")}`,
    `media-src ${unique(["'self'", "blob:", ...media]).join(" ")}`,
    `connect-src ${unique(["'self'", ...connect, ...media]).join(" ")}`,
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
};

export const buildSecurityHeaders = (request: IncomingMessage): Record<string, string> => {
  const config = getBackendConfig();
  const path = getRequestPath(request);
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": isPublicPath(path) ? "cross-origin" : "same-origin",
    "X-Frame-Options": "DENY",
    "X-DNS-Prefetch-Control": "off",
  };
  headers["Content-Security-Policy"] = buildContentSecurityPolicy();
  if (config.app.isProduction || config.app.isStaging) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
  return headers;
};

export const getAllowedCorsOrigin = (request: IncomingMessage): string | undefined => {
  const origin = request.headers.origin;
  if (!origin || Array.isArray(origin)) return undefined;
  const config = getBackendConfig();
  const path = getRequestPath(request);
  const allowlist = new Set([
    ...config.server.corsAllowedOrigins,
    config.server.publicAppBaseUrl,
    config.server.adminAppBaseUrl,
  ].filter(Boolean));
  if (allowlist.has(origin)) return origin;
  if (!config.app.isProduction && !config.app.isStaging) {
    try {
      const parsed = new URL(origin);
      if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) return origin;
      if (
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)
      ) {
        return origin;
      }
    } catch {
      return undefined;
    }
  }
  if (isPublicPath(path) && !request.headers.cookie && !request.headers.authorization) return "*";
  return undefined;
};

export const buildCorsHeaders = (request: IncomingMessage): Record<string, string> => {
  const path = getRequestPath(request);
  const origin = getAllowedCorsOrigin(request);
  const credentialed = Boolean(origin && origin !== "*" && isCredentialedApiPath(path));
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Vary": "Origin",
    "Access-Control-Allow-Credentials": credentialed ? "true" : "false",
    "Access-Control-Allow-Headers": credentialed
      ? "Content-Type, Authorization, X-Admin-Dev-Token, X-CSRF-Token, X-Auth-Scope, If-None-Match, If-Modified-Since, Idempotency-Key"
      : "Content-Type, If-None-Match, If-Modified-Since, Idempotency-Key",
    "Access-Control-Allow-Methods": credentialed ? "GET,POST,PATCH,PUT,DELETE,OPTIONS" : "GET,POST,OPTIONS",
  };
};

export const assertOriginAllowedForMutation = (request: IncomingMessage) => {
  const method = request.method ?? "GET";
  const path = getRequestPath(request);
  if (!isAdminPath(path) || !adminMutationMethods.has(method)) return;
  const origin = request.headers.origin;
  if (!origin) return;
  const allowed = getAllowedCorsOrigin(request);
  if (!allowed || allowed === "*") {
    const error = new Error("ADMIN_ORIGIN_FORBIDDEN");
    (error as Error & { status?: number; code?: string }).status = 403;
    (error as Error & { status?: number; code?: string }).code = "ADMIN_ORIGIN_FORBIDDEN";
    throw error;
  }
};
