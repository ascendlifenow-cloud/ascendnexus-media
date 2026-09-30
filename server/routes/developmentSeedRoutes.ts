import type { IncomingMessage, ServerResponse } from "node:http";
import { adminDevelopmentSeedController } from "../controllers/adminDevelopmentSeedController";

export const handleDevelopmentSeedRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "GET" && path === "/api/admin/development/seeds") return adminDevelopmentSeedController.overview(request, response, url).then(() => true);
  if (method === "POST" && path === "/api/admin/development/seeds/run") return adminDevelopmentSeedController.run(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/development/seeds/verify") return adminDevelopmentSeedController.verify(request, response, url).then(() => true);
  if (method === "POST" && path === "/api/admin/development/seeds/reset") return adminDevelopmentSeedController.reset(request, response).then(() => true);

  return false;
};
