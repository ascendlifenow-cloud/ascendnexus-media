import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { adminArtistService } from "../services/artists/AdminArtistService";
import { mediaProcessingJobService } from "../services/media/MediaProcessingJobService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { MediaApiError } from "../utils/media/mediaErrorUtils";

const actorId = (auth: Awaited<ReturnType<typeof mediaAuthorizationService.authenticate>>) => auth.adminId;

export class AdminArtistController {
  async list(request: IncomingMessage, response: ServerResponse, url: URL) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    const artists = await adminArtistService.listArtists({
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      featured: url.searchParams.has("featured") ? url.searchParams.get("featured") === "true" : undefined,
    });
    sendJson(response, 200, { success: true, artists, data: artists });
  }

  async create(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.create");
    const artist = await adminArtistService.createArtist(await parseJsonBody(request), actorId(auth));
    sendJson(response, 201, { success: true, artist, data: artist });
  }

  async get(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    const artist = await adminArtistService.getArtist(artistId);
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artist, data: artist });
  }

  async update(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.update");
    const artist = await adminArtistService.updateArtist(artistId, await parseJsonBody(request), actorId(auth));
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artist, data: artist });
  }

  async validate(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    const readiness = await adminArtistService.getArtistReadiness(artistId);
    if (!readiness) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, readiness, validation: readiness, data: readiness });
  }

  async readiness(request: IncomingMessage, response: ServerResponse, artistId: string) {
    return this.validate(request, response, artistId);
  }

  async preview(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    const artist = await adminArtistService.getArtist(artistId);
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    sendJson(response, 200, { success: true, mode: "draft", artist, data: artist });
  }

  async publish(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.publish");
    const artist = await adminArtistService.publishArtist(artistId, actorId(auth));
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artist, data: artist });
  }

  async unpublish(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.unpublish");
    const artist = await adminArtistService.unpublishArtist(artistId, actorId(auth));
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artist, data: artist });
  }

  async archive(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.archive");
    const artist = await adminArtistService.archiveArtist(artistId, actorId(auth));
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artist, data: artist });
  }

  async restore(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.restore");
    const artist = await adminArtistService.restoreArtist(artistId, actorId(auth));
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artist, data: artist });
  }

  async republish(request: IncomingMessage, response: ServerResponse, artistId: string) {
    return this.publish(request, response, artistId);
  }

  async media(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    sendJson(response, 200, { success: true, media: await adminArtistService.getArtistMedia(artistId) });
  }

  async versions(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    const media = await adminArtistService.getArtistMedia(artistId);
    sendJson(response, 200, { success: true, versions: media.flatMap((item) => item.metadata?.versionId ? [item.metadata] : []) });
  }

  async audit(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "audit.read");
    const events = (await mediaAuditPersistenceService.list()).filter((event) => event.entityType === "artist" && event.entityId === artistId);
    sendJson(response, 200, { success: true, auditEvents: events });
  }

  async processing(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.read");
    const artist = await adminArtistService.getArtist(artistId);
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    const assetIds = [artist.metadata?.profileImageAssetId, artist.metadata?.characterArtAssetId, artist.metadata?.profileBannerAssetId].filter((value): value is string => typeof value === "string");
    const summaries = await Promise.all(assetIds.map((assetId) => mediaProcessingJobService.buildAssetProcessingSummary(assetId)));
    sendJson(response, 200, { success: true, summaries });
  }

  async delete(request: IncomingMessage, response: ServerResponse, artistId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "artists.delete");
    const artist = await adminArtistService.softDeleteArtist(artistId, actorId(auth));
    if (!artist) throw new MediaApiError("ARTIST_NOT_FOUND", "Artist was not found.", 404, "database");
    sendJson(response, 200, { success: true, artistId });
  }
}

export const adminArtistController = new AdminArtistController();
