import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../../middleware/adminMediaUploadMiddleware";
import { publicContactService } from "../../services/forms/PublicContactService";
import { publicFormHealthService } from "../../services/forms/PublicFormHealthService";
import { publicNewsletterService } from "../../services/forms/PublicNewsletterService";
import { createPublicError } from "../../utils/public/publicErrorUtils";
import { publicSuccess, sendPublicResponse } from "../../utils/public/publicResponseUtils";

const assertJsonBody = (request: IncomingMessage) => {
  const contentType = String(request.headers["content-type"] ?? "");
  if (!contentType.includes("application/json")) throw createPublicError("FORM_VALIDATION_FAILED", "JSON request body is required.", 415);
  const length = Number.parseInt(String(request.headers["content-length"] ?? "0"), 10);
  if (Number.isFinite(length) && length > 32 * 1024) throw createPublicError("FORM_VALIDATION_FAILED", "Request body is too large.", 413);
};

export class PublicFormControllers {
  async contactAvailability(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(publicFormHealthService.getPublicContactAvailability()), { cacheControl: "public, max-age=30" });
  }

  async submitContact(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request);
    const body = await parseJsonBody(request) as Record<string, unknown>;
    sendPublicResponse(request, response, publicSuccess(await publicContactService.submitContact(body, request)), { cacheControl: "no-store" });
  }

  async newsletterAvailability(request: IncomingMessage, response: ServerResponse) {
    sendPublicResponse(request, response, publicSuccess(publicFormHealthService.getPublicNewsletterAvailability()), { cacheControl: "public, max-age=30" });
  }

  async subscribeNewsletter(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request);
    const body = await parseJsonBody(request) as Record<string, unknown>;
    sendPublicResponse(request, response, publicSuccess(await publicNewsletterService.subscribe(body, request)), { cacheControl: "no-store" });
  }

  async confirmNewsletter(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request);
    const body = await parseJsonBody(request) as { token?: string };
    sendPublicResponse(request, response, publicSuccess(await publicNewsletterService.confirm(String(body.token ?? ""))), { cacheControl: "no-store" });
  }

  async unsubscribeNewsletter(request: IncomingMessage, response: ServerResponse) {
    assertJsonBody(request);
    const body = await parseJsonBody(request) as { token?: string };
    sendPublicResponse(request, response, publicSuccess(await publicNewsletterService.unsubscribe(String(body.token ?? ""))), { cacheControl: "no-store" });
  }
}

export const publicFormControllers = new PublicFormControllers();
