import type { IncomingMessage, ServerResponse } from "node:http";
import { adminMetadataController } from "../controllers/adminMetadataController";

export const handleAdminMetadataRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname;

  if (path === "/api/admin/metadata" && method === "GET") return adminMetadataController.list(request, response).then(() => true);
  if (path === "/api/admin/metadata" && method === "POST") return adminMetadataController.create(request, response).then(() => true);
  if (path === "/api/admin/metadata/resolve-preview" && method === "POST") return adminMetadataController.resolvePreview(request, response).then(() => true);

  const match = /^\/api\/admin\/metadata\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (!match) return false;
  const metadataId = decodeURIComponent(match[1]);
  const action = match[2];

  if (!action && method === "GET") return adminMetadataController.get(request, response, metadataId).then(() => true);
  if (!action && method === "PATCH") return adminMetadataController.update(request, response, metadataId).then(() => true);
  if ((action === "validate" || action === "readiness" || action === "preview") && (method === "GET" || method === "POST")) return adminMetadataController.readiness(request, response, metadataId).then(() => true);
  if ((action === "publish" || action === "republish") && method === "POST") return adminMetadataController.publish(request, response, metadataId).then(() => true);
  if (action === "archive" && method === "POST") return adminMetadataController.archive(request, response, metadataId).then(() => true);
  if (action === "restore" && method === "POST") return adminMetadataController.restore(request, response, metadataId).then(() => true);

  return false;
};
