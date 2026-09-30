import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import { productionLaunchBlockerService } from "../services/launch/ProductionLaunchBlockerService";
import { publicMemberExperienceCertificationService } from "../services/launch/experience/PublicMemberExperienceCertificationService";
import { adminOperationsCertificationService } from "../services/launch/admin/AdminOperationsCertificationService";
import { productionInfrastructureCertificationService } from "../services/launch/infrastructure/ProductionInfrastructureCertificationService";
import { productionSecurityPrivacyRecoveryCertificationService } from "../services/launch/security/ProductionSecurityPrivacyRecoveryCertificationService";
import { finalLaunchSignoffService } from "../services/launch/final/FinalLaunchSignoffService";

export class AdminLaunchReadinessController {
  async report(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch.certification.read");
    sendJson(response, 200, { success: true, data: await productionLaunchBlockerService.getReport() });
  }

  async experience(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch.certification.read");
    sendJson(response, 200, { success: true, data: await publicMemberExperienceCertificationService.getReport() });
  }

  async adminOperations(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch.certification.read");
    sendJson(response, 200, { success: true, data: await adminOperationsCertificationService.getReport() });
  }

  async infrastructure(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch_infrastructure.read");
    sendJson(response, 200, { success: true, data: await productionInfrastructureCertificationService.getReport() });
  }

  async verifyInfrastructure(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch_infrastructure.verify");
    const report = await productionInfrastructureCertificationService.startCertification();
    await productionInfrastructureCertificationService.writeDocumentation(report);
    sendJson(response, 200, { success: true, data: report });
  }

  async securityRecovery(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch_security.read");
    sendJson(response, 200, { success: true, data: await productionSecurityPrivacyRecoveryCertificationService.getReport() });
  }

  async verifySecurityRecovery(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch_security.verify");
    const report = await productionSecurityPrivacyRecoveryCertificationService.startCertification();
    await productionSecurityPrivacyRecoveryCertificationService.writeDocumentation(report);
    sendJson(response, 200, { success: true, data: report });
  }

  async finalSignoff(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch_final.read");
    sendJson(response, 200, { success: true, data: await finalLaunchSignoffService.getReport() });
  }

  async verifyFinalSignoff(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "launch_final.verify");
    const report = await finalLaunchSignoffService.startSignoff();
    await finalLaunchSignoffService.writeDocumentation(report);
    sendJson(response, 200, { success: true, data: report });
  }
}

export const adminLaunchReadinessController = new AdminLaunchReadinessController();
