import type { IncomingMessage, ServerResponse } from "node:http";
import { adminGalleryService } from "../services/gallery/AdminGalleryService";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { MediaApiError } from "../utils/media/mediaErrorUtils";

const actorId = (auth: Awaited<ReturnType<typeof mediaAuthorizationService.authenticate>>) => auth.adminId;

export class AdminGalleryController {
  async list(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    const galleryItems = await adminGalleryService.listGalleryItems({
      status: url.searchParams.get("status") ?? undefined,
      sourceType: url.searchParams.get("sourceType") ?? undefined,
      mediaType: url.searchParams.get("mediaType") ?? undefined,
      search: url.searchParams.get("search") ?? url.searchParams.get("query") ?? undefined,
      featured: url.searchParams.has("featured") ? url.searchParams.get("featured") === "true" : undefined,
    });
    sendJson(response, 200, { success: true, galleryItems, data: galleryItems });
  }

  async create(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.create");
    const galleryItem = await adminGalleryService.createGalleryItem(await parseJsonBody(request), actorId(auth));
    sendJson(response, 201, { success: true, galleryItem, data: galleryItem });
  }

  async get(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    const galleryItem = await adminGalleryService.getGalleryItem(galleryItemId);
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItem, data: galleryItem });
  }

  async update(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.update");
    const galleryItem = await adminGalleryService.updateGalleryItem(galleryItemId, await parseJsonBody(request), actorId(auth));
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItem, data: galleryItem });
  }

  async validate(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    const readiness = await adminGalleryService.getGalleryReadiness(galleryItemId);
    if (!readiness) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, readiness, validation: readiness, data: readiness });
  }

  async readiness(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    return this.validate(request, response, galleryItemId);
  }

  async preview(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    const galleryItem = await adminGalleryService.getGalleryItem(galleryItemId);
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    sendJson(response, 200, { success: true, mode: "draft", galleryItem, data: galleryItem });
  }

  async publish(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.publish");
    const galleryItem = await adminGalleryService.publishGalleryItem(galleryItemId, actorId(auth));
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItem, data: galleryItem });
  }

  async republish(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    return this.publish(request, response, galleryItemId);
  }

  async unpublish(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.unpublish");
    const galleryItem = await adminGalleryService.unpublishGalleryItem(galleryItemId, actorId(auth));
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItem, data: galleryItem });
  }

  async archive(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.archive");
    const galleryItem = await adminGalleryService.archiveGalleryItem(galleryItemId, actorId(auth));
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItem, data: galleryItem });
  }

  async restore(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.restore");
    const galleryItem = await adminGalleryService.restoreGalleryItem(galleryItemId, actorId(auth));
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItem, data: galleryItem });
  }

  async reorder(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.update");
    const body = await parseJsonBody(request);
    const galleryItems = await adminGalleryService.reorderGalleryItems(Array.isArray(body.items) ? body.items : [], actorId(auth));
    sendJson(response, 200, { success: true, galleryItems, data: galleryItems });
  }

  async media(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    sendJson(response, 200, { success: true, media: await adminGalleryService.getGalleryMedia(galleryItemId) });
  }

  async versions(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    sendJson(response, 200, { success: true, versions: await adminGalleryService.getGalleryVersions(galleryItemId) });
  }

  async dependencies(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.read");
    const dependencies = await adminGalleryService.getGalleryDependencies(galleryItemId);
    if (!dependencies) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, dependencies });
  }

  async audit(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "audit.read");
    const events = (await mediaAuditPersistenceService.list()).filter((event) => event.entityType === "gallery_item" && event.entityId === galleryItemId);
    sendJson(response, 200, { success: true, auditEvents: events });
  }

  async delete(request: IncomingMessage, response: ServerResponse, galleryItemId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "gallery.delete");
    const galleryItem = await adminGalleryService.softDeleteGalleryItem(galleryItemId, actorId(auth));
    if (!galleryItem) throw new MediaApiError("GALLERY_NOT_FOUND", "Gallery item was not found.", 404, "database");
    sendJson(response, 200, { success: true, galleryItemId });
  }
}

export const adminGalleryController = new AdminGalleryController();
