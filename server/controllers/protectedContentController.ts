import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { memberIdentityService } from "../services/members/MemberIdentityService";
import { protectedContentDeliveryAuthorizationService } from "../services/protectedContent/ProtectedContentDeliveryAuthorizationService";
import { protectedContentDeliveryHealthService } from "../services/protectedContent/ProtectedContentDeliveryHealthService";
import { protectedContentTakedownService } from "../services/protectedContent/ProtectedContentTakedownService";
import { protectedMediaGatewayService } from "../services/protectedContent/ProtectedMediaGatewayService";
import { protectedPlaybackSessionService } from "../services/protectedContent/ProtectedPlaybackSessionService";
import { jsonDatabase } from "../services/media/JsonDatabase";

export class ProtectedContentController {
  async authorizeStream(request: IncomingMessage, response: ServerResponse, mediaId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    const body = await parseJsonBody(request).catch(() => ({})) as { playbackContext?: Record<string, unknown> };
    const result = await protectedContentDeliveryAuthorizationService.authorizeStream({ type: "member", member: session.member }, { mediaId, sessionId: session.sessionId, playbackContext: body.playbackContext });
    sendJson(response, result.authorized ? 200 : 403, { success: Boolean(result.authorized), data: result, errors: result.authorized ? undefined : ["Protected content is unavailable."] });
  }

  async authorizeDownload(request: IncomingMessage, response: ServerResponse, mediaId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    const result = await protectedContentDeliveryAuthorizationService.authorizeDownload({ type: "member", member: session.member }, { mediaId, sessionId: session.sessionId });
    sendJson(response, result.authorized ? 200 : 403, { success: Boolean(result.authorized), data: result, errors: result.authorized ? undefined : ["Protected content is unavailable."] });
  }

  async stream(request: IncomingMessage, response: ServerResponse, reference: string) {
    await protectedMediaGatewayService.stream(request, response, reference);
  }

  async download(request: IncomingMessage, response: ServerResponse, reference: string) {
    await protectedMediaGatewayService.download(request, response, reference);
  }

  async createPlaybackSession(request: IncomingMessage, response: ServerResponse) {
    const session = await memberIdentityService.authenticateRequest(request);
    const body = await parseJsonBody(request) as { authorizationId?: string; mediaAssetId?: string; contentId?: string; clientCategory?: string };
    if (!body.authorizationId || !body.mediaAssetId || !body.contentId) {
      sendJson(response, 400, { success: false, errors: ["Playback session requires authorization and media context."] });
      return;
    }
    sendJson(response, 201, { success: true, data: await protectedPlaybackSessionService.create({ memberId: session.member.memberId, sessionId: session.sessionId, mediaAssetId: body.mediaAssetId, contentId: body.contentId, authorizationId: body.authorizationId, clientCategory: body.clientCategory }) });
  }

  async getPlaybackSession(request: IncomingMessage, response: ServerResponse, playbackSessionId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await protectedPlaybackSessionService.get(playbackSessionId, session.member.memberId) });
  }

  async updatePlaybackSession(request: IncomingMessage, response: ServerResponse, playbackSessionId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    const body = await parseJsonBody(request) as { status?: "starting" | "playing" | "paused" | "completed" | "failed" };
    sendJson(response, 200, { success: true, data: await protectedPlaybackSessionService.update(playbackSessionId, session.member.memberId, body.status ?? "playing") });
  }

  async deletePlaybackSession(request: IncomingMessage, response: ServerResponse, playbackSessionId: string) {
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await protectedPlaybackSessionService.update(playbackSessionId, session.member.memberId, "completed") });
  }

  async adminOverview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    if (!auth.permissions.includes("media.security.read") && !auth.permissions.includes("security.read")) mediaAuthorizationService.requirePermission(auth, "security.read");
    const data = await jsonDatabase.read();
    sendJson(response, 200, {
      success: true,
      data: {
        health: await protectedContentDeliveryHealthService.getHealthReport(),
        protectedAssetCount: data.protectedMediaResources.length,
        activeAuthorizations: data.protectedMediaAuthorizations.filter((item) => item.status === "active" && item.expiresAt > new Date().toISOString()).length,
        activePlaybackSessions: data.protectedPlaybackSessions.filter((item) => ["authorized", "starting", "playing", "paused"].includes(item.status)).length,
        takedowns: data.protectedContentTakedowns.filter((item) => item.status === "active"),
      },
    });
  }

  async adminHealth(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    if (!auth.permissions.includes("media.security.read") && !auth.permissions.includes("security.read")) mediaAuthorizationService.requirePermission(auth, "security.read");
    sendJson(response, 200, { success: true, data: await protectedContentDeliveryHealthService.getHealthReport() });
  }

  async adminProfiles(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    sendJson(response, 200, { success: true, data: await protectedContentDeliveryAuthorizationService.ensureDefaultProfiles() });
  }

  async adminAssets(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const data = await jsonDatabase.read();
    sendJson(response, 200, { success: true, data: data.protectedMediaResources.map(({ privateObjectKey: _privateObjectKey, ...safe }) => safe) });
  }

  async adminPlaybackSessions(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.read");
    const data = await jsonDatabase.read();
    sendJson(response, 200, { success: true, data: data.protectedPlaybackSessions.map((session) => ({ ...session, sessionIdHash: undefined })) });
  }

  async adminTakedown(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.delete");
    const body = await parseJsonBody(request) as { resourceType?: string; resourceId?: string; reason?: string };
    sendJson(response, 200, { success: true, data: await protectedContentTakedownService.disableResource(body.resourceType ?? "media", body.resourceId ?? "", body.reason ?? "Administrative takedown", auth.userId) });
  }

  async adminRestore(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "media.edit");
    const body = await parseJsonBody(request) as { resourceType?: string; resourceId?: string };
    sendJson(response, 200, { success: true, data: await protectedContentTakedownService.restoreResource(body.resourceType ?? "media", body.resourceId ?? "", auth.userId) });
  }
}

export const protectedContentController = new ProtectedContentController();
