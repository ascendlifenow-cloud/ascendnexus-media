import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { memberIdentityService } from "../services/members/MemberIdentityService";
import {
  collectionService,
  favoritesService,
  followingService,
  listeningHistoryService,
  memberFeedService,
  notificationService,
  playlistService,
  recommendationFeedbackService,
  savedSearchService,
  viewingHistoryService,
} from "../services/memberEngagement/MemberEngagementServices";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { jsonDatabase } from "../services/media/JsonDatabase";

const privateHeaders = (response: ServerResponse) => {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
};

export class MemberEngagementController {
  private async member(request: IncomingMessage) {
    return (await memberIdentityService.authenticateRequest(request)).member;
  }

  async favorites(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await favoritesService.add(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await favoritesService.list(member) });
  }

  async removeFavorite(request: IncomingMessage, response: ServerResponse, favoriteId: string) {
    privateHeaders(response);
    await favoritesService.remove(await this.member(request), favoriteId);
    sendJson(response, 200, { success: true });
  }

  async following(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await followingService.follow(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await followingService.list(member) });
  }

  async unfollow(request: IncomingMessage, response: ServerResponse, followId: string) {
    privateHeaders(response);
    await followingService.unfollow(await this.member(request), followId);
    sendJson(response, 200, { success: true });
  }

  async playlists(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await playlistService.create(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await playlistService.list(member) });
  }

  async updatePlaylist(request: IncomingMessage, response: ServerResponse, playlistId: string) {
    privateHeaders(response);
    sendJson(response, 200, { success: true, data: await playlistService.update(await this.member(request), playlistId, await parseJsonBody(request) as never) });
  }

  async deletePlaylist(request: IncomingMessage, response: ServerResponse, playlistId: string) {
    privateHeaders(response);
    await playlistService.remove(await this.member(request), playlistId);
    sendJson(response, 200, { success: true });
  }

  async addPlaylistItem(request: IncomingMessage, response: ServerResponse, playlistId: string) {
    privateHeaders(response);
    sendJson(response, 201, { success: true, data: await playlistService.addItem(await this.member(request), playlistId, await parseJsonBody(request) as never) });
  }

  async history(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await listeningHistoryService.record(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: { listening: await listeningHistoryService.recent(member), viewing: await viewingHistoryService.recent(member) } });
  }

  async viewingHistory(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await viewingHistoryService.record(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await viewingHistoryService.recent(member) });
  }

  async recent(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    sendJson(response, 200, { success: true, data: { continueListening: await listeningHistoryService.continueListening(member), recentlyPlayed: await listeningHistoryService.recent(member, 10), recentlyViewed: await viewingHistoryService.recent(member, 10) } });
  }

  async notifications(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await notificationService.create(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await notificationService.list(member) });
  }

  async markNotificationRead(request: IncomingMessage, response: ServerResponse, notificationId: string) {
    privateHeaders(response);
    await notificationService.markRead(await this.member(request), notificationId);
    sendJson(response, 200, { success: true });
  }

  async feed(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    sendJson(response, 200, { success: true, data: await memberFeedService.getFeed(await this.member(request)) });
  }

  async recommendationFeedback(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await recommendationFeedbackService.record(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await recommendationFeedbackService.list(member) });
  }

  async savedSearches(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await savedSearchService.save(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await savedSearchService.list(member) });
  }

  async collections(request: IncomingMessage, response: ServerResponse) {
    privateHeaders(response);
    const member = await this.member(request);
    if (request.method === "POST") {
      sendJson(response, 201, { success: true, data: await collectionService.create(member, await parseJsonBody(request) as never) });
      return;
    }
    sendJson(response, 200, { success: true, data: await collectionService.list(member) });
  }

  async addCollectionItem(request: IncomingMessage, response: ServerResponse, collectionId: string) {
    privateHeaders(response);
    sendJson(response, 201, { success: true, data: await collectionService.addItem(await this.member(request), collectionId, await parseJsonBody(request) as never) });
  }

  async adminOverview(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    if (!auth.permissions.includes("users.read") && !auth.permissions.includes("analytics.read")) mediaAuthorizationService.requirePermission(auth, "users.read");
    const data = await jsonDatabase.read();
    sendJson(response, 200, {
      success: true,
      data: {
        favorites: data.memberFavorites.filter((item) => item.status === "active").length,
        follows: data.memberFollows.filter((item) => item.status === "active").length,
        playlists: data.memberPlaylists.filter((item) => item.status === "active").length,
        playbackEvents: data.memberPlaybackHistory.length,
        viewingEvents: data.memberViewingHistory.length,
        notifications: data.memberNotifications.length,
        recommendationFeedback: data.memberRecommendationFeedback.length,
        savedSearches: data.memberSavedSearches.filter((item) => item.status === "active").length,
        collections: data.memberCollections.filter((item) => item.status === "active").length,
        checkedAt: new Date().toISOString(),
      },
    });
  }
}

export const memberEngagementController = new MemberEngagementController();
