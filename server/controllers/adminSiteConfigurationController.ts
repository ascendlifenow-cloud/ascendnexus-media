import type { IncomingMessage, ServerResponse } from "node:http";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { adminSiteConfigurationService } from "../services/site/AdminSiteConfigurationService";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";

const actorId = (auth: Awaited<ReturnType<typeof mediaAuthorizationService.authenticate>>) => auth.adminId;

export class AdminSiteConfigurationController {
  async getSiteSettings(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.read");
    const siteConfig = await adminSiteConfigurationService.getDraft(actorId(auth));
    sendJson(response, 200, { success: true, siteConfig, data: siteConfig });
  }

  async updateSiteSettings(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.update");
    const siteConfig = await adminSiteConfigurationService.updateDraft(await parseJsonBody(request), actorId(auth));
    sendJson(response, 200, { success: true, siteConfig, data: siteConfig });
  }

  async siteReadiness(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.read");
    const readiness = await adminSiteConfigurationService.getReadiness();
    sendJson(response, 200, { success: true, readiness, data: readiness });
  }

  async publishSiteSettings(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.publish");
    const siteConfig = await adminSiteConfigurationService.publishDraft(actorId(auth));
    sendJson(response, 200, { success: true, siteConfig, data: siteConfig });
  }

  async archiveSiteSettings(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.update");
    const siteConfig = await adminSiteConfigurationService.archiveDraft(actorId(auth));
    sendJson(response, 200, { success: true, siteConfig, data: siteConfig });
  }

  async rollbackSiteSettings(request: IncomingMessage, response: ServerResponse, versionId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.publish");
    const siteConfig = await adminSiteConfigurationService.rollbackToVersion(Number(versionId), actorId(auth));
    sendJson(response, 200, { success: true, siteConfig, data: siteConfig });
  }

  async versions(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "site_settings.read");
    sendJson(response, 200, { success: true, versions: await adminSiteConfigurationService.getVersions() });
  }

  async getHomepage(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "homepage.read");
    const homepage = await adminSiteConfigurationService.getHomepageDraft(actorId(auth));
    sendJson(response, 200, { success: true, homepage, data: homepage });
  }

  async updateHomepage(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "homepage.update");
    const body = await parseJsonBody(request);
    const siteConfig = await adminSiteConfigurationService.updateDraft({ homepageSections: Array.isArray(body.sections) ? body.sections : body.homepageSections }, actorId(auth));
    const homepage = await adminSiteConfigurationService.getHomepageDraft(actorId(auth));
    sendJson(response, 200, { success: true, homepage, siteConfig, data: homepage });
  }

  async homepageReadiness(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "homepage.read");
    const readiness = await adminSiteConfigurationService.getReadiness();
    sendJson(response, 200, { success: true, readiness, data: readiness });
  }

  async publishHomepage(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "homepage.publish");
    const siteConfig = await adminSiteConfigurationService.publishDraft(actorId(auth));
    const homepage = await adminSiteConfigurationService.getHomepagePublished(actorId(auth));
    sendJson(response, 200, { success: true, homepage, siteConfig, data: homepage });
  }
}

export const adminSiteConfigurationController = new AdminSiteConfigurationController();
