import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { adminMetadataService } from "../services/metadata/AdminMetadataService";

const actorId = (auth: Awaited<ReturnType<typeof mediaAuthorizationService.authenticate>>) => auth.adminId;

export class AdminMetadataController {
  async list(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.read");
    sendJson(response, 200, { success: true, ...(await adminMetadataService.list()) });
  }

  async create(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.update");
    sendJson(response, 201, { success: true, ...(await adminMetadataService.create(await parseJsonBody(request), actorId(auth))) });
  }

  async get(request: IncomingMessage, response: ServerResponse, metadataId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.read");
    const metadata = await adminMetadataService.get(metadataId);
    if (!metadata) return sendJson(response, 404, { success: false, errors: ["METADATA_NOT_FOUND"] });
    sendJson(response, 200, { success: true, metadata, data: metadata });
  }

  async update(request: IncomingMessage, response: ServerResponse, metadataId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.update");
    const metadata = await adminMetadataService.update(metadataId, await parseJsonBody(request), actorId(auth));
    if (!metadata) return sendJson(response, 404, { success: false, errors: ["METADATA_NOT_FOUND"] });
    sendJson(response, 200, { success: true, metadata, data: metadata });
  }

  async readiness(request: IncomingMessage, response: ServerResponse, metadataId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.read");
    const readiness = await adminMetadataService.readiness(metadataId);
    if (!readiness) return sendJson(response, 404, { success: false, errors: ["METADATA_NOT_FOUND"] });
    sendJson(response, 200, { success: true, readiness, data: readiness });
  }

  async publish(request: IncomingMessage, response: ServerResponse, metadataId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.publish");
    const metadata = await adminMetadataService.publish(metadataId, actorId(auth));
    if (!metadata) return sendJson(response, 404, { success: false, errors: ["METADATA_NOT_FOUND"] });
    sendJson(response, 200, { success: true, metadata, data: metadata });
  }

  async archive(request: IncomingMessage, response: ServerResponse, metadataId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.update");
    const metadata = await adminMetadataService.archive(metadataId, actorId(auth));
    if (!metadata) return sendJson(response, 404, { success: false, errors: ["METADATA_NOT_FOUND"] });
    sendJson(response, 200, { success: true, metadata, data: metadata });
  }

  async restore(request: IncomingMessage, response: ServerResponse, metadataId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.update");
    const metadata = await adminMetadataService.restore(metadataId, actorId(auth));
    if (!metadata) return sendJson(response, 404, { success: false, errors: ["METADATA_NOT_FOUND"] });
    sendJson(response, 200, { success: true, metadata, data: metadata });
  }

  async resolvePreview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "metadata.read");
    const body = await parseJsonBody(request);
    const path = typeof body.path === "string" ? body.path : "/";
    const { publicMetadataDeliveryService } = await import("../services/public/PublicMetadataDeliveryService");
    const metadata = await publicMetadataDeliveryService.getMetadataForPath(path);
    sendJson(response, 200, { success: true, preview: metadata, data: metadata });
  }
}

export const adminMetadataController = new AdminMetadataController();
