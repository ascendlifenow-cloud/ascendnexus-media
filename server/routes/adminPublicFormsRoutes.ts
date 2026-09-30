import type { IncomingMessage, ServerResponse } from "node:http";
import { adminPublicFormsController } from "../controllers/admin/adminPublicFormsController";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";

const requirePermission = async (request: IncomingMessage, permission: string) => {
  const auth = await mediaAuthorizationService.authenticate(request);
  mediaAuthorizationService.requirePermission(auth, permission);
};

export const handleAdminPublicFormsRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (method === "GET" && path === "/api/admin/system/forms") {
    await requirePermission(request, "system.health.read");
    return adminPublicFormsController.health(request, response).then(() => true);
  }
  if (method === "GET" && path === "/api/admin/contact-submissions") {
    await requirePermission(request, "contact_submissions.read");
    return adminPublicFormsController.listContact(request, response, url).then(() => true);
  }
  const contactMatch = /^\/api\/admin\/contact-submissions\/([^/]+)$/.exec(path);
  if (contactMatch && method === "GET") {
    await requirePermission(request, "contact_submissions.read");
    return adminPublicFormsController.getContact(request, response, contactMatch[1]).then(() => true);
  }
  if (contactMatch && method === "PATCH") {
    await requirePermission(request, "contact_submissions.update");
    return adminPublicFormsController.updateContact(request, response, contactMatch[1]).then(() => true);
  }
  const contactDeliveryMatch = /^\/api\/admin\/contact-submissions\/([^/]+)\/deliveries$/.exec(path);
  if (contactDeliveryMatch && method === "GET") {
    await requirePermission(request, "contact_submissions.read");
    return adminPublicFormsController.contactDeliveries(request, response, contactDeliveryMatch[1]).then(() => true);
  }
  if (method === "GET" && path === "/api/admin/newsletter/subscriptions") {
    await requirePermission(request, "newsletter_subscriptions.read");
    return adminPublicFormsController.listNewsletter(request, response, url).then(() => true);
  }
  const subscriptionMatch = /^\/api\/admin\/newsletter\/subscriptions\/([^/]+)$/.exec(path);
  if (subscriptionMatch && method === "GET") {
    await requirePermission(request, "newsletter_subscriptions.read");
    return adminPublicFormsController.getNewsletter(request, response, subscriptionMatch[1]).then(() => true);
  }
  return false;
};
