import type { IncomingMessage, ServerResponse } from "node:http";
import { memberEngagementController } from "../controllers/memberEngagementController";

export const handleMemberEngagementRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if ((method === "GET" || method === "POST") && path === "/api/member/favorites") return memberEngagementController.favorites(request, response).then(() => true);
  const favoriteMatch = /^\/api\/member\/favorites\/([^/]+)$/.exec(path);
  if (method === "DELETE" && favoriteMatch) return memberEngagementController.removeFavorite(request, response, favoriteMatch[1]).then(() => true);

  if ((method === "GET" || method === "POST") && path === "/api/member/following") return memberEngagementController.following(request, response).then(() => true);
  const followMatch = /^\/api\/member\/following\/([^/]+)$/.exec(path);
  if (method === "DELETE" && followMatch) return memberEngagementController.unfollow(request, response, followMatch[1]).then(() => true);

  if ((method === "GET" || method === "POST") && path === "/api/member/playlists") return memberEngagementController.playlists(request, response).then(() => true);
  const playlistMatch = /^\/api\/member\/playlists\/([^/]+)$/.exec(path);
  if (method === "PATCH" && playlistMatch) return memberEngagementController.updatePlaylist(request, response, playlistMatch[1]).then(() => true);
  if (method === "DELETE" && playlistMatch) return memberEngagementController.deletePlaylist(request, response, playlistMatch[1]).then(() => true);
  const playlistItemMatch = /^\/api\/member\/playlists\/([^/]+)\/items$/.exec(path);
  if (method === "POST" && playlistItemMatch) return memberEngagementController.addPlaylistItem(request, response, playlistItemMatch[1]).then(() => true);

  if ((method === "GET" || method === "POST") && path === "/api/member/history") return memberEngagementController.history(request, response).then(() => true);
  if ((method === "GET" || method === "POST") && path === "/api/member/history/viewing") return memberEngagementController.viewingHistory(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/recent") return memberEngagementController.recent(request, response).then(() => true);

  if ((method === "GET" || method === "POST") && path === "/api/member/notifications") return memberEngagementController.notifications(request, response).then(() => true);
  const notificationReadMatch = /^\/api\/member\/notifications\/([^/]+)\/read$/.exec(path);
  if (method === "POST" && notificationReadMatch) return memberEngagementController.markNotificationRead(request, response, notificationReadMatch[1]).then(() => true);

  if (method === "GET" && path === "/api/member/feed") return memberEngagementController.feed(request, response).then(() => true);
  if ((method === "GET" || method === "POST") && path === "/api/member/recommendation-feedback") return memberEngagementController.recommendationFeedback(request, response).then(() => true);
  if ((method === "GET" || method === "POST") && path === "/api/member/saved-searches") return memberEngagementController.savedSearches(request, response).then(() => true);
  if ((method === "GET" || method === "POST") && path === "/api/member/collections") return memberEngagementController.collections(request, response).then(() => true);
  const collectionItemMatch = /^\/api\/member\/collections\/([^/]+)\/items$/.exec(path);
  if (method === "POST" && collectionItemMatch) return memberEngagementController.addCollectionItem(request, response, collectionItemMatch[1]).then(() => true);

  if (method === "GET" && ["/api/admin/member-engagement", "/api/admin/playlists", "/api/admin/notifications", "/api/admin/member-feed", "/api/admin/recommendation-feedback", "/api/admin/member-activity"].includes(path)) return memberEngagementController.adminOverview(request, response).then(() => true);

  return false;
};
