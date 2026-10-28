import type { IncomingMessage, ServerResponse } from "node:http";
import { adminReleaseController } from "../controllers/adminReleaseController";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { productionReviewSnapshot, approveProductionRelease } from "../services/production/ProductionReleaseGate";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { authenticationService } from "../services/auth/AuthenticationService";
import { readPrivateProductionCover } from "../services/production/PrivateProductionCoverService";
import { buildCorsHeaders, buildSecurityHeaders } from "../utils/security/securityHeaderUtils";
import { listProductionAudioCandidates, selectProductionFinalAudio } from "../services/production/ProductionFinalAudioService";

export const handleAdminReleaseRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname;
  if (method === "GET" && path === "/api/admin/releases") return adminReleaseController.list(request, response, url).then(() => true);
  if (method === "POST" && path === "/api/admin/releases") return adminReleaseController.create(request, response).then(() => true);
  const match = /^\/api\/admin\/releases\/([^/]+)(?:\/([^/]+))?$/.exec(path);
  if (!match) return false;
  const releaseId = decodeURIComponent(match[1]);
  const action = match[2];
  if ((action === "production-audio-candidates" && method === "GET") || (action === "production-final-audio" && method === "POST")) {
    // Real admin identity is mandatory, even when local legacy media bypass is enabled.
    const auth = await authenticationService.authenticateRequest(request);
    mediaAuthorizationService.requirePermission({ ...auth, adminId: auth.user.userId }, "releases.read");
    mediaAuthorizationService.requirePermission({ ...auth, adminId: auth.user.userId }, "media.read");
    if (method === "POST") {
      mediaAuthorizationService.requirePermission({ ...auth, adminId: auth.user.userId }, "releases.update");
      mediaAuthorizationService.requirePermission({ ...auth, adminId: auth.user.userId }, "media.update");
    }
    const data = method === "GET" ? await listProductionAudioCandidates(releaseId) : await selectProductionFinalAudio(releaseId, await parseJsonBody(request), auth.user.userId);
    sendJson(response, 200, { success: true, data }, { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" });
    return true;
  }
  if (action === "production-cover" && method === "GET") {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const cover = await readPrivateProductionCover(releaseId);
    response.writeHead(200, { ...buildSecurityHeaders(request), ...buildCorsHeaders(request), "Content-Type": cover.mimeType, "Content-Length": cover.bytes.length, "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" });
    response.end(cover.bytes);
    return true;
  }
  if (action === "production-preview" && method === "GET") {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    sendJson(response, 200, { success: true, data: await productionReviewSnapshot(releaseId) }, { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" });
    return true;
  }
  if (action === "production-approve" && method === "POST") {
    await authenticationService.authenticateRequest(request);
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.publish");
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const approval = await approveProductionRelease(releaseId, auth.userId ?? auth.adminId, body.bundleHash);
    sendJson(response, 200, { success: true, data: approval });
    return true;
  }
  if (!action && method === "GET") return adminReleaseController.get(request, response, releaseId).then(() => true);
  if (!action && method === "PATCH") return adminReleaseController.update(request, response, releaseId).then(() => true);
  if (!action && method === "DELETE") return adminReleaseController.delete(request, response, releaseId).then(() => true);
  if (action === "validate" && (method === "GET" || method === "POST")) return adminReleaseController.validate(request, response, releaseId).then(() => true);
  if (action === "readiness" && method === "GET") return adminReleaseController.readiness(request, response, releaseId).then(() => true);
  if (action === "preview" && method === "GET") return adminReleaseController.preview(request, response, releaseId).then(() => true);
  if (action === "publish" && method === "POST") return adminReleaseController.publish(request, response, releaseId).then(() => true);
  if (action === "republish" && method === "POST") return adminReleaseController.republish(request, response, releaseId).then(() => true);
  if (action === "unpublish" && method === "POST") return adminReleaseController.unpublish(request, response, releaseId).then(() => true);
  if (action === "archive" && method === "POST") return adminReleaseController.archive(request, response, releaseId).then(() => true);
  if (action === "restore" && method === "POST") return adminReleaseController.restore(request, response, releaseId).then(() => true);
  if (action === "media" && method === "GET") return adminReleaseController.media(request, response, releaseId).then(() => true);
  if (action === "versions" && method === "GET") return adminReleaseController.versions(request, response, releaseId).then(() => true);
  if (action === "dependencies" && method === "GET") return adminReleaseController.dependencies(request, response, releaseId).then(() => true);
  if (action === "audit" && method === "GET") return adminReleaseController.audit(request, response, releaseId).then(() => true);
  if (action === "processing" && method === "GET") return adminReleaseController.processing(request, response, releaseId).then(() => true);
  return false;
};
