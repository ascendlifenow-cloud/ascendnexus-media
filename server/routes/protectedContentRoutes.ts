import type { IncomingMessage, ServerResponse } from "node:http";
import { protectedContentController } from "../controllers/protectedContentController";

export const handleProtectedContentRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  const streamAuth = /^\/api\/member\/media\/([^/]+)\/stream-authorize$/.exec(path);
  if (method === "POST" && streamAuth) return protectedContentController.authorizeStream(request, response, decodeURIComponent(streamAuth[1])).then(() => true);
  const downloadAuth = /^\/api\/member\/media\/([^/]+)\/download-authorize$/.exec(path);
  if (method === "POST" && downloadAuth) return protectedContentController.authorizeDownload(request, response, decodeURIComponent(downloadAuth[1])).then(() => true);

  const streamGateway = /^\/api\/member\/media\/stream\/(.+)$/.exec(path);
  if ((method === "GET" || method === "HEAD") && streamGateway) return protectedContentController.stream(request, response, streamGateway[1]).then(() => true);
  const downloadGateway = /^\/api\/member\/media\/download\/(.+)$/.exec(path);
  if ((method === "GET" || method === "HEAD") && downloadGateway) return protectedContentController.download(request, response, downloadGateway[1]).then(() => true);

  if (method === "POST" && path === "/api/member/playback/sessions") return protectedContentController.createPlaybackSession(request, response).then(() => true);
  const playbackMatch = /^\/api\/member\/playback\/sessions\/([^/]+)$/.exec(path);
  if (method === "GET" && playbackMatch) return protectedContentController.getPlaybackSession(request, response, decodeURIComponent(playbackMatch[1])).then(() => true);
  if (method === "PATCH" && playbackMatch) return protectedContentController.updatePlaybackSession(request, response, decodeURIComponent(playbackMatch[1])).then(() => true);
  if (method === "DELETE" && playbackMatch) return protectedContentController.deletePlaybackSession(request, response, decodeURIComponent(playbackMatch[1])).then(() => true);

  if (method === "GET" && path === "/api/admin/protected-content/overview") return protectedContentController.adminOverview(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/protected-content/health") return protectedContentController.adminHealth(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/protected-content/delivery-profiles") return protectedContentController.adminProfiles(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/protected-content/assets") return protectedContentController.adminAssets(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/protected-content/playback-sessions") return protectedContentController.adminPlaybackSessions(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/protected-content/takedown") return protectedContentController.adminTakedown(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/protected-content/restore") return protectedContentController.adminRestore(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/protected-content/emergency-deny/enable") return protectedContentController.adminTakedown(request, response).then(() => true);
  if (method === "POST" && path === "/api/admin/protected-content/emergency-deny/disable") return protectedContentController.adminRestore(request, response).then(() => true);

  return false;
};
