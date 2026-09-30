import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../../middleware/adminMediaUploadMiddleware";
import { consentPolicyService } from "../../services/analytics/ConsentPolicyService";
import { consentPreferenceService } from "../../services/analytics/ConsentPreferenceService";
import { serverAnalyticsService } from "../../services/analytics/ServerAnalyticsService";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { publicSuccess, sendPublicResponse } from "../../utils/public/publicResponseUtils";

const assertJsonBody = (request: IncomingMessage, maxBytes = 32 * 1024) => {
  const contentType = String(request.headers["content-type"] ?? "");
  if (!contentType.includes("application/json")) throw createPublicError("PUBLIC_INVALID_QUERY", "JSON request body is required.", 415);
  const length = Number.parseInt(String(request.headers["content-length"] ?? "0"), 10);
  if (Number.isFinite(length) && length > maxBytes) throw createPublicError("PUBLIC_RATE_LIMITED", "Request body is too large.", 413);
};

export class PublicConsentAnalyticsControllers {
  async consentPolicy(request: IncomingMessage, response: ServerResponse) {
    const policy = await consentPolicyService.getActivePolicy();
    sendPublicResponse(request, response, publicSuccess(consentPolicyService.toPublicPolicy(policy)), { cacheControl: "public, max-age=300" });
  }

  async consentAvailability(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await consentPreferenceService.availability(request)), { cacheControl: "public, max-age=60" });
  }

  async recordConsent(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request);
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const record = await consentPreferenceService.recordConsent(body, request);
    sendPublicResponse(request, response, publicSuccess(consentPreferenceService.toPublicConsent(record)), { cacheControl: "no-store" });
  }

  async withdrawConsent(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request);
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const record = await consentPreferenceService.withdraw(body, request);
    sendPublicResponse(request, response, publicSuccess(consentPreferenceService.toPublicConsent(record), undefined, ["Optional analytics, functional, and marketing dispatch are disabled for future events."]), { cacheControl: "no-store" });
  }

  async recordAnalyticsEvents(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request, 48 * 1024);
    const body = await parseJsonBody(request) as Record<string, unknown>;
    sendPublicResponse(request, response, publicSuccess(await serverAnalyticsService.recordEvents(body, request)), { cacheControl: "no-store" });
  }

  async analyticsHealth(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(await serverAnalyticsService.getHealth()), { cacheControl: "no-store" });
  }
}

export const publicConsentAnalyticsControllers = new PublicConsentAnalyticsControllers();
