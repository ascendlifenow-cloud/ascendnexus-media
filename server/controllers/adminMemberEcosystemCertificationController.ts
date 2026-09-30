import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import {
  accessibilityCertificationService,
  deploymentCertificationService,
  memberCertificationService,
  performanceCertificationService,
  productionCertificationService,
  securityCertificationService,
} from "../services/certification/MemberEcosystemCertificationService";

export class AdminMemberEcosystemCertificationController {
  private async auth(request: IncomingMessage) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch.certification.read");
    return auth;
  }

  async production(request: IncomingMessage, response: ServerResponse, url: URL) {
    await this.auth(request);
    sendJson(response, 200, { success: true, data: await productionCertificationService.certify(url.searchParams.get("environment") ?? "production") });
  }

  async member(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request);
    sendJson(response, 200, { success: true, data: await memberCertificationService.certify() });
  }

  async security(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request);
    sendJson(response, 200, { success: true, data: await securityCertificationService.certify() });
  }

  async performance(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request);
    sendJson(response, 200, { success: true, data: await performanceCertificationService.certify() });
  }

  async accessibility(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request);
    sendJson(response, 200, { success: true, data: await accessibilityCertificationService.certify() });
  }

  async deployment(request: IncomingMessage, response: ServerResponse, url: URL) {
    await this.auth(request);
    sendJson(response, 200, { success: true, data: await deploymentCertificationService.certify(url.searchParams.get("environment") ?? "production") });
  }
}

export const adminMemberEcosystemCertificationController = new AdminMemberEcosystemCertificationController();

