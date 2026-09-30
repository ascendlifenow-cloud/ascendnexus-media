import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { adminReleaseService } from "../services/releases/AdminReleaseService";
import { mediaProcessingJobService } from "../services/media/MediaProcessingJobService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { MediaApiError } from "../utils/media/mediaErrorUtils";

const actorId = (auth: Awaited<ReturnType<typeof mediaAuthorizationService.authenticate>>) => auth.adminId;

export class AdminReleaseController {
  async list(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const releases = await adminReleaseService.listReleases({
      artistId: url.searchParams.get("artistId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      query: url.searchParams.get("query") ?? url.searchParams.get("search") ?? undefined,
      featured: url.searchParams.has("featured") ? url.searchParams.get("featured") === "true" : undefined,
    });
    sendJson(response, 200, { success: true, releases, data: releases });
  }

  async create(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.create");
    const release = await adminReleaseService.createRelease(await parseJsonBody(request), actorId(auth));
    sendJson(response, 201, { success: true, release, data: release });
  }

  async get(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const release = await adminReleaseService.getRelease(releaseId);
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, release, data: release });
  }

  async update(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.update");
    const release = await adminReleaseService.updateRelease(releaseId, await parseJsonBody(request), actorId(auth));
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, release, data: release });
  }

  async validate(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const readiness = await adminReleaseService.getReleaseReadiness(releaseId);
    if (!readiness) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, readiness, validation: readiness, data: readiness });
  }

  async readiness(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    return this.validate(request, response, releaseId);
  }

  async preview(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const release = await adminReleaseService.getRelease(releaseId);
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    sendJson(response, 200, { success: true, mode: "draft", release, data: release });
  }

  async publish(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.publish");
    const release = await adminReleaseService.publishRelease(releaseId, actorId(auth));
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, release, data: release });
  }

  async unpublish(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.unpublish");
    const release = await adminReleaseService.unpublishRelease(releaseId, actorId(auth));
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, release, data: release });
  }

  async archive(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.archive");
    const release = await adminReleaseService.archiveRelease(releaseId, actorId(auth));
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, release, data: release });
  }

  async restore(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.restore");
    const release = await adminReleaseService.restoreRelease(releaseId, actorId(auth));
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, release, data: release });
  }

  async republish(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    return this.publish(request, response, releaseId);
  }

  async media(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    sendJson(response, 200, { success: true, media: await adminReleaseService.getReleaseMedia(releaseId) });
  }

  async versions(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const media = await adminReleaseService.getReleaseMedia(releaseId);
    sendJson(response, 200, { success: true, versions: media.flatMap((item) => item.metadata?.versionId ? [item.metadata] : []) });
  }

  async dependencies(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const release = await adminReleaseService.getRelease(releaseId);
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, dependencies: { artistId: release.artistId, media: await adminReleaseService.getReleaseMedia(releaseId) } });
  }

  async audit(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "audit.read");
    const events = (await mediaAuditPersistenceService.list()).filter((event) => event.entityType === "release" && event.entityId === releaseId);
    sendJson(response, 200, { success: true, auditEvents: events });
  }

  async processing(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.read");
    const release = await adminReleaseService.getRelease(releaseId);
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    const assetIds = [release.metadata?.coverArtAssetId, release.metadata?.audioPreviewAssetId, release.metadata?.fullSongAssetId].filter((value): value is string => typeof value === "string");
    const summaries = await Promise.all(assetIds.map((assetId) => mediaProcessingJobService.buildAssetProcessingSummary(assetId)));
    sendJson(response, 200, { success: true, summaries });
  }

  async delete(request: IncomingMessage, response: ServerResponse, releaseId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "releases.delete");
    const release = await adminReleaseService.softDeleteRelease(releaseId, actorId(auth));
    if (!release) throw new MediaApiError("RELEASE_NOT_FOUND", "Release was not found.", 404, "database");
    sendJson(response, 200, { success: true, releaseId });
  }
}

export const adminReleaseController = new AdminReleaseController();
