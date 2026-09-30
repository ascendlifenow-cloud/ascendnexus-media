import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { developmentSeedService } from "../services/seeding/DevelopmentSeedService";

export class AdminDevelopmentSeedController {
  private async auth(request: IncomingMessage, permission: "users.read" | "users.manage" = "users.read") {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, permission);
    return auth;
  }

  async overview(request: IncomingMessage, response: ServerResponse, url: URL) {
    await this.auth(request, "users.read");
    const environment = url.searchParams.get("environment") ?? undefined;
    const verification = await developmentSeedService.verify({ environment });
    const users = await developmentSeedService.listUsers({ environment });
    sendJson(response, 200, { success: true, data: { verification, users } });
  }

  async run(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { environment?: string; includePasswords?: boolean };
    const result = await developmentSeedService.seed({ environment: body.environment, includePasswords: Boolean(body.includePasswords) });
    sendJson(response, 201, { success: true, data: result });
  }

  async verify(request: IncomingMessage, response: ServerResponse, url: URL) {
    await this.auth(request, "users.read");
    const environment = url.searchParams.get("environment") ?? undefined;
    sendJson(response, 200, { success: true, data: await developmentSeedService.verify({ environment }) });
  }

  async reset(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { environment?: string; confirmation?: string };
    sendJson(response, 200, { success: true, data: await developmentSeedService.reset({ environment: body.environment, confirmation: body.confirmation }) });
  }
}

export const adminDevelopmentSeedController = new AdminDevelopmentSeedController();
