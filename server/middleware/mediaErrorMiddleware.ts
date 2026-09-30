import type { ServerResponse } from "node:http";
import { toSafeMediaError } from "../utils/media/mediaErrorUtils";
import { buildCorsHeaders, buildSecurityHeaders } from "../utils/security/securityHeaderUtils";
import { getBackendConfig } from "../config/backendConfig";

export const sendJson = (response: ServerResponse, status: number, payload: unknown, headers: Record<string, string> = {}): void => {
  const setCookie = response.getHeader("Set-Cookie");
  const request = response.req;
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...(request ? buildSecurityHeaders(request) : {}),
    ...(request ? buildCorsHeaders(request) : { "Access-Control-Allow-Origin": "null", "Access-Control-Allow-Credentials": "false" }),
    ...(setCookie ? { "Set-Cookie": setCookie as string | string[] } : {}),
    ...headers,
  });
  response.end(JSON.stringify(payload));
};

export const sendSafeError = (response: ServerResponse, error: unknown): void => {
  if (error && typeof error === "object" && !(error instanceof Error && error.name === "MediaApiError")) {
    console.error("[media-api] request failed", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
  const safe = toSafeMediaError(error);
  const status = error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 400;
  const config = getBackendConfig();
  const devMessage = !config.app.isProduction && !config.app.isStaging && error instanceof Error && !(error as Error & { code?: string }).code
    ? error.message
    : safe.message;
  sendJson(response, status, { success: false, errors: [devMessage], error: { ...safe, message: devMessage } });
};
