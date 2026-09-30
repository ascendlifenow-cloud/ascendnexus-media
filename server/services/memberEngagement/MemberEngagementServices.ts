import { randomUUID } from "node:crypto";
import type { MemberAccountResponse } from "../../models/members/MemberModels";
import type { EngagementResourceType, MemberEngagementResourceRef, MemberNotificationType } from "../../models/memberEngagement/MemberEngagementModels";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { memberPortalCacheService } from "../memberPortal/MemberPortalCacheService";

const now = () => new Date().toISOString();
const forbiddenPattern = /(private\/|signedUrl|signature=|token=|storagePath|privateObjectKey|full[-_]?song|authorizationReference|streamEndpoint|downloadUrl)/i;
const id = (prefix: string) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;

const sanitizeResource = (input: Partial<MemberEngagementResourceRef>): MemberEngagementResourceRef => {
  const resourceType = input.resourceType;
  const resourceId = String(input.resourceId ?? "").trim();
  if (!resourceType || !resourceId || resourceId.length > 160) throw new AuthApiError("MEMBER_ENGAGEMENT_RESOURCE_INVALID", "A valid resource is required.", 400);
  const clean = (value?: string, max = 240) => {
    const next = String(value ?? "").trim().slice(0, max);
    return next && !forbiddenPattern.test(next) ? next : undefined;
  };
  return {
    resourceType,
    resourceId,
    title: clean(input.title),
    slug: clean(input.slug, 120),
    imageUrl: clean(input.imageUrl, 500),
    metadataSafe: input.metadataSafe && JSON.stringify(input.metadataSafe).length < 2000 ? input.metadataSafe : undefined,
  };
};

export class FavoritesService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberFavorites.filter((item) => item.memberId === member.memberId && item.status === "active").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async add(member: MemberAccountResponse, resource: Partial<MemberEngagementResourceRef>) {
    const safe = sanitizeResource(resource);
    const timestamp = now();
    let favoriteId = "";
    await jsonDatabase.update((data) => {
      const existing = data.memberFavorites.find((item) => item.memberId === member.memberId && item.resource.resourceType === safe.resourceType && item.resource.resourceId === safe.resourceId);
      if (existing) {
        existing.status = "active";
        existing.resource = safe;
        existing.updatedAt = timestamp;
        favoriteId = existing.favoriteId;
        return;
      }
      favoriteId = id("favorite");
      data.memberFavorites.push({ favoriteId, memberId: member.memberId, resource: safe, status: "active", createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 });
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return (await this.list(member)).find((item) => item.favoriteId === favoriteId);
  }

  async remove(member: MemberAccountResponse, favoriteId: string) {
    await jsonDatabase.update((data) => {
      const item = data.memberFavorites.find((record) => record.favoriteId === favoriteId && record.memberId === member.memberId);
      if (item) {
        item.status = "removed";
        item.updatedAt = now();
      }
    });
    memberPortalCacheService.invalidateMember(member.memberId);
  }
}

export class FollowingService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberFollows.filter((item) => item.memberId === member.memberId && item.status === "active").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async follow(member: MemberAccountResponse, resource: Partial<MemberEngagementResourceRef>) {
    const safe = sanitizeResource(resource);
    const timestamp = now();
    let followId = "";
    await jsonDatabase.update((data) => {
      const existing = data.memberFollows.find((item) => item.memberId === member.memberId && item.resource.resourceType === safe.resourceType && item.resource.resourceId === safe.resourceId);
      if (existing) {
        existing.status = "active";
        existing.resource = safe;
        existing.updatedAt = timestamp;
        followId = existing.followId;
        return;
      }
      followId = id("follow");
      data.memberFollows.push({ followId, memberId: member.memberId, resource: safe, status: "active", createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 });
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return (await this.list(member)).find((item) => item.followId === followId);
  }

  async unfollow(member: MemberAccountResponse, followId: string) {
    await jsonDatabase.update((data) => {
      const item = data.memberFollows.find((record) => record.followId === followId && record.memberId === member.memberId);
      if (item) {
        item.status = "unfollowed";
        item.updatedAt = now();
      }
    });
    memberPortalCacheService.invalidateMember(member.memberId);
  }
}

export class PlaylistService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberPlaylists.filter((item) => item.memberId === member.memberId && item.status === "active").map((playlist) => ({
      ...playlist,
      items: data.memberPlaylistItems.filter((item) => item.memberId === member.memberId && item.playlistId === playlist.playlistId).sort((a, b) => a.position - b.position),
    })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(member: MemberAccountResponse, input: { name?: string; description?: string }) {
    const timestamp = now();
    const playlistId = id("playlist");
    await jsonDatabase.update((data) => {
      data.memberPlaylists.push({
        playlistId,
        memberId: member.memberId,
        name: String(input.name ?? "Untitled playlist").trim().slice(0, 120) || "Untitled playlist",
        description: String(input.description ?? "").trim().slice(0, 500) || undefined,
        visibility: "private",
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: 1,
      });
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return (await this.list(member)).find((item) => item.playlistId === playlistId);
  }

  async update(member: MemberAccountResponse, playlistId: string, input: { name?: string; description?: string }) {
    await jsonDatabase.update((data) => {
      const playlist = data.memberPlaylists.find((item) => item.playlistId === playlistId && item.memberId === member.memberId && item.status === "active");
      if (!playlist) throw new AuthApiError("MEMBER_PLAYLIST_NOT_FOUND", "Playlist was not found.", 404);
      if (input.name !== undefined) playlist.name = input.name.trim().slice(0, 120) || playlist.name;
      if (input.description !== undefined) playlist.description = input.description.trim().slice(0, 500) || undefined;
      playlist.updatedAt = now();
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return (await this.list(member)).find((item) => item.playlistId === playlistId);
  }

  async remove(member: MemberAccountResponse, playlistId: string) {
    await jsonDatabase.update((data) => {
      const playlist = data.memberPlaylists.find((item) => item.playlistId === playlistId && item.memberId === member.memberId);
      if (playlist) {
        playlist.status = "deleted";
        playlist.updatedAt = now();
      }
      data.memberPlaylistItems = data.memberPlaylistItems.filter((item) => !(item.playlistId === playlistId && item.memberId === member.memberId));
    });
    memberPortalCacheService.invalidateMember(member.memberId);
  }

  async addItem(member: MemberAccountResponse, playlistId: string, resource: Partial<MemberEngagementResourceRef>) {
    const safe = sanitizeResource(resource);
    const timestamp = now();
    await jsonDatabase.update((data) => {
      const playlist = data.memberPlaylists.find((item) => item.playlistId === playlistId && item.memberId === member.memberId && item.status === "active");
      if (!playlist) throw new AuthApiError("MEMBER_PLAYLIST_NOT_FOUND", "Playlist was not found.", 404);
      const position = data.memberPlaylistItems.filter((item) => item.playlistId === playlistId && item.memberId === member.memberId).length + 1;
      data.memberPlaylistItems.push({ playlistItemId: id("playlist-item"), playlistId, memberId: member.memberId, resource: safe, position, addedAt: timestamp, schemaVersion: 1 });
      playlist.updatedAt = timestamp;
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return this.list(member);
  }
}

export class ListeningHistoryService {
  async record(member: MemberAccountResponse, input: Partial<MemberEngagementResourceRef> & { eventType?: string; lastPositionSeconds?: number; durationSeconds?: number; listenedSeconds?: number }) {
    const safe = sanitizeResource(input);
    await jsonDatabase.update((data) => {
      data.memberPlaybackHistory.unshift({
        historyId: id("playback-history"),
        memberId: member.memberId,
        resource: safe,
        eventType: ["played", "completed", "skipped", "resumed"].includes(String(input.eventType)) ? input.eventType as never : "played",
        lastPositionSeconds: Math.max(0, Number(input.lastPositionSeconds ?? 0)),
        durationSeconds: input.durationSeconds === undefined ? undefined : Math.max(0, Number(input.durationSeconds)),
        listenedSeconds: input.listenedSeconds === undefined ? undefined : Math.max(0, Number(input.listenedSeconds)),
        playbackDevice: "web",
        occurredAt: now(),
        schemaVersion: 1,
      });
      data.memberPlaybackHistory = data.memberPlaybackHistory.slice(0, 5000);
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return this.recent(member);
  }

  async recent(member: MemberAccountResponse, limit = 20) {
    const data = await jsonDatabase.read();
    return data.memberPlaybackHistory.filter((item) => item.memberId === member.memberId).slice(0, limit);
  }

  async continueListening(member: MemberAccountResponse, limit = 6) {
    const recent = await this.recent(member, 100);
    const seen = new Set<string>();
    return recent.filter((item) => {
      const key = `${item.resource.resourceType}:${item.resource.resourceId}`;
      if (seen.has(key) || item.eventType === "completed") return false;
      seen.add(key);
      return (item.lastPositionSeconds ?? 0) > 0;
    }).slice(0, limit);
  }
}

export class ViewingHistoryService {
  async record(member: MemberAccountResponse, resource: Partial<MemberEngagementResourceRef>) {
    const safe = sanitizeResource(resource);
    await jsonDatabase.update((data) => {
      data.memberViewingHistory.unshift({ viewingHistoryId: id("viewing-history"), memberId: member.memberId, resource: safe, occurredAt: now(), schemaVersion: 1 });
      data.memberViewingHistory = data.memberViewingHistory.slice(0, 5000);
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return this.recent(member);
  }

  async recent(member: MemberAccountResponse, limit = 20) {
    const data = await jsonDatabase.read();
    return data.memberViewingHistory.filter((item) => item.memberId === member.memberId).slice(0, limit);
  }
}

export class ContinueListeningService {
  getForMember(member: MemberAccountResponse, limit = 6) {
    return listeningHistoryService.continueListening(member, limit);
  }
}

export class NotificationService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberNotifications.filter((item) => item.memberId === member.memberId && item.status !== "archived").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(member: MemberAccountResponse, input: { type?: MemberNotificationType; title?: string; body?: string; resource?: Partial<MemberEngagementResourceRef> }) {
    const notificationId = id("notification");
    await jsonDatabase.update((data) => {
      data.memberNotifications.unshift({
        notificationId,
        memberId: member.memberId,
        type: input.type ?? "system_message",
        title: String(input.title ?? "Member notification").trim().slice(0, 160),
        body: String(input.body ?? "").trim().slice(0, 600),
        resource: input.resource?.resourceType ? sanitizeResource(input.resource) : undefined,
        delivery: { inApp: true, emailReady: true, pushReady: false, digestReady: false },
        status: "unread",
        createdAt: now(),
        schemaVersion: 1,
      });
    });
    return (await this.list(member)).find((item) => item.notificationId === notificationId);
  }

  async markRead(member: MemberAccountResponse, notificationId: string) {
    await jsonDatabase.update((data) => {
      const item = data.memberNotifications.find((record) => record.memberId === member.memberId && record.notificationId === notificationId);
      if (item && item.status === "unread") {
        item.status = "read";
        item.readAt = now();
      }
    });
  }
}

export class RecommendationFeedbackService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberRecommendationFeedback.filter((item) => item.memberId === member.memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async record(member: MemberAccountResponse, input: Partial<MemberEngagementResourceRef> & { action?: string; recommendationId?: string; reason?: string }) {
    const safe = sanitizeResource(input);
    await jsonDatabase.update((data) => {
      data.memberRecommendationFeedback.unshift({
        feedbackId: id("recommendation-feedback"),
        memberId: member.memberId,
        recommendationId: String(input.recommendationId ?? "").slice(0, 160) || undefined,
        resource: safe,
        action: ["liked", "hidden", "not_interested", "favorited"].includes(String(input.action)) ? input.action as never : "liked",
        reason: String(input.reason ?? "").slice(0, 240) || undefined,
        createdAt: now(),
        schemaVersion: 1,
      });
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return this.list(member);
  }
}

export class SavedSearchService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberSavedSearches.filter((item) => item.memberId === member.memberId && item.status === "active").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async save(member: MemberAccountResponse, input: { name?: string; query?: string; filters?: Record<string, string> }) {
    const timestamp = now();
    const savedSearchId = id("saved-search");
    await jsonDatabase.update((data) => {
      data.memberSavedSearches.push({ savedSearchId, memberId: member.memberId, name: String(input.name ?? input.query ?? "Saved search").slice(0, 120), query: String(input.query ?? "").slice(0, 240), filters: input.filters, status: "active", createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 });
    });
    return (await this.list(member)).find((item) => item.savedSearchId === savedSearchId);
  }
}

export class CollectionService {
  async list(member: MemberAccountResponse) {
    const data = await jsonDatabase.read();
    return data.memberCollections.filter((item) => item.memberId === member.memberId && item.status === "active").map((collection) => ({
      ...collection,
      items: data.memberCollectionItems.filter((item) => item.memberId === member.memberId && item.collectionId === collection.collectionId).sort((a, b) => a.position - b.position),
    })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async create(member: MemberAccountResponse, input: { name?: string; description?: string }) {
    const timestamp = now();
    const collectionId = id("collection");
    await jsonDatabase.update((data) => {
      data.memberCollections.push({ collectionId, memberId: member.memberId, name: String(input.name ?? "New collection").slice(0, 120), description: String(input.description ?? "").slice(0, 500) || undefined, status: "active", createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1 });
    });
    return (await this.list(member)).find((item) => item.collectionId === collectionId);
  }

  async addItem(member: MemberAccountResponse, collectionId: string, resource: Partial<MemberEngagementResourceRef>) {
    const safe = sanitizeResource(resource);
    await jsonDatabase.update((data) => {
      const collection = data.memberCollections.find((item) => item.memberId === member.memberId && item.collectionId === collectionId && item.status === "active");
      if (!collection) throw new AuthApiError("MEMBER_COLLECTION_NOT_FOUND", "Collection was not found.", 404);
      const position = data.memberCollectionItems.filter((item) => item.memberId === member.memberId && item.collectionId === collectionId).length + 1;
      data.memberCollectionItems.push({ collectionItemId: id("collection-item"), collectionId, memberId: member.memberId, resource: safe, position, addedAt: now(), schemaVersion: 1 });
      collection.updatedAt = now();
    });
    memberPortalCacheService.invalidateMember(member.memberId);
    return this.list(member);
  }
}

export class MemberFeedService {
  async getFeed(member: MemberAccountResponse) {
    const [favorites, follows, playlists, playback, viewing, notifications] = await Promise.all([
      favoritesService.list(member),
      followingService.list(member),
      playlistService.list(member),
      listeningHistoryService.continueListening(member),
      viewingHistoryService.recent(member, 8),
      notificationService.list(member),
    ]);
    return {
      continueListening: playback,
      recentlyViewed: viewing,
      favoriteCount: favorites.length,
      followingCount: follows.length,
      playlistCount: playlists.length,
      unreadNotifications: notifications.filter((item) => item.status === "unread").length,
      generatedAt: now(),
    };
  }
}

export class NotificationPreferenceService {
  getDeliveryReadiness(member: MemberAccountResponse) {
    return {
      inApp: true,
      email: member.preferences.notifications.newsletter || member.preferences.notifications.systemNotifications,
      push: false,
      digest: false,
    };
  }
}

export const favoritesService = new FavoritesService();
export const followingService = new FollowingService();
export const playlistService = new PlaylistService();
export const listeningHistoryService = new ListeningHistoryService();
export const viewingHistoryService = new ViewingHistoryService();
export const continueListeningService = new ContinueListeningService();
export const notificationService = new NotificationService();
export const notificationPreferenceService = new NotificationPreferenceService();
export const recommendationFeedbackService = new RecommendationFeedbackService();
export const savedSearchService = new SavedSearchService();
export const collectionService = new CollectionService();
export const memberFeedService = new MemberFeedService();

export const supportedEngagementResourceTypes: EngagementResourceType[] = ["song", "release", "album", "artist", "video", "gallery", "playlist", "collection", "search"];
