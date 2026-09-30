import type { MemberDashboardContentCard } from "./memberPortalTypes";

const apiBase = () => String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

export interface EngagementResourceRef {
  resourceType: "song" | "release" | "album" | "artist" | "video" | "gallery" | "playlist" | "collection" | "search";
  resourceId: string;
  title?: string;
  slug?: string;
  imageUrl?: string;
}

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", "X-Auth-Scope": "member", ...(init.headers ?? {}) },
  });
  const payload = await response.json().catch(() => ({ success: false, errors: [`Request failed with ${response.status}`] })) as ApiResponse<T>;
  if (!response.ok || !payload.success) throw new Error(payload.errors?.[0] ?? `Engagement request failed with ${response.status}`);
  return payload.data;
};

export const memberEngagementApiService = {
  favorites: () => request<Array<Record<string, unknown>>>("/api/member/favorites"),
  addFavorite: (resource: EngagementResourceRef) => request<Record<string, unknown>>("/api/member/favorites", { method: "POST", body: JSON.stringify(resource) }),
  removeFavorite: (favoriteId: string) => request<void>(`/api/member/favorites/${encodeURIComponent(favoriteId)}`, { method: "DELETE" }),
  following: () => request<Array<Record<string, unknown>>>("/api/member/following"),
  follow: (resource: EngagementResourceRef) => request<Record<string, unknown>>("/api/member/following", { method: "POST", body: JSON.stringify(resource) }),
  unfollow: (followId: string) => request<void>(`/api/member/following/${encodeURIComponent(followId)}`, { method: "DELETE" }),
  playlists: () => request<Array<Record<string, unknown>>>("/api/member/playlists"),
  createPlaylist: (input: { name: string; description?: string }) => request<Record<string, unknown>>("/api/member/playlists", { method: "POST", body: JSON.stringify(input) }),
  addPlaylistItem: (playlistId: string, resource: EngagementResourceRef) => request<Array<Record<string, unknown>>>(`/api/member/playlists/${encodeURIComponent(playlistId)}/items`, { method: "POST", body: JSON.stringify(resource) }),
  history: () => request<{ listening: Array<Record<string, unknown>>; viewing: Array<Record<string, unknown>> }>("/api/member/history"),
  recordPlayback: (resource: EngagementResourceRef & { eventType?: string; lastPositionSeconds?: number; durationSeconds?: number }) => request<Array<Record<string, unknown>>>("/api/member/history", { method: "POST", body: JSON.stringify(resource) }),
  recent: () => request<{ continueListening: Array<Record<string, unknown>>; recentlyPlayed: Array<Record<string, unknown>>; recentlyViewed: Array<Record<string, unknown>> }>("/api/member/recent"),
  notifications: () => request<Array<Record<string, unknown>>>("/api/member/notifications"),
  markNotificationRead: (notificationId: string) => request<void>(`/api/member/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST", body: "{}" }),
  feed: () => request<Record<string, unknown>>("/api/member/feed"),
  feedback: () => request<Array<Record<string, unknown>>>("/api/member/recommendation-feedback"),
  recordFeedback: (resource: EngagementResourceRef & { action: "liked" | "hidden" | "not_interested" | "favorited"; recommendationId?: string }) => request<Array<Record<string, unknown>>>("/api/member/recommendation-feedback", { method: "POST", body: JSON.stringify(resource) }),
  savedSearches: () => request<Array<Record<string, unknown>>>("/api/member/saved-searches"),
  saveSearch: (input: { name: string; query: string }) => request<Record<string, unknown>>("/api/member/saved-searches", { method: "POST", body: JSON.stringify(input) }),
  collections: () => request<Array<Record<string, unknown>>>("/api/member/collections"),
  createCollection: (input: { name: string; description?: string }) => request<Record<string, unknown>>("/api/member/collections", { method: "POST", body: JSON.stringify(input) }),
  addCollectionItem: (collectionId: string, resource: EngagementResourceRef) => request<Array<Record<string, unknown>>>(`/api/member/collections/${encodeURIComponent(collectionId)}/items`, { method: "POST", body: JSON.stringify(resource) }),
};

export const cardToResource = (item: MemberDashboardContentCard): EngagementResourceRef => ({
  resourceType: item.contentType === "announcement" ? "collection" : item.contentType === "release" ? "release" : item.contentType,
  resourceId: item.contentId,
  title: item.title,
  imageUrl: item.imageUrl,
  slug: item.href.split("/").pop(),
});
