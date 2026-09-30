import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../../services/media/MediaAuthorizationService";
import { exportEstimationService, exportImportCertificationService, exportImportHealthService, exportPackageService } from "../../services/exportImport/ExportImportService";
import { exportPackageEncryptionService, exportPackageSigningService, packageSigningKeyProvider } from "../../services/exportImport/security/PackageSecurityService";
import type { ExportOptions, ExportSelection } from "../../models/exportImport/ExportImportModels";

const actorId = (auth: { adminId?: string; userId?: string }) => auth.userId ?? auth.adminId ?? "admin";

export class AdminExportController {
  async estimate(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.read");
    const body = await parseJsonBody(request).catch(() => ({})) as { selection?: ExportSelection; options?: ExportOptions };
    sendJson(response, 200, { success: true, data: await exportEstimationService.estimate(body.selection ?? {}, body.options ?? {}) });
  }

  async create(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.create");
    const body = await parseJsonBody(request) as { selection?: ExportSelection; options?: ExportOptions };
    sendJson(response, 201, { success: true, data: await exportPackageService.createExport(body.selection ?? {}, body.options ?? {}, actorId(auth)) });
  }

  async list(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.read");
    sendJson(response, 200, { success: true, data: exportPackageService.listJobs() });
  }

  async get(request: IncomingMessage, response: ServerResponse, exportJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.read");
    sendJson(response, 200, { success: true, data: exportPackageService.getJob(exportJobId) });
  }

  async cancel(request: IncomingMessage, response: ServerResponse, exportJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.create");
    const job = exportPackageService.getJob(exportJobId);
    if (job && job.status !== "completed") {
      job.status = "cancelled";
      job.currentStage = "Cancelled";
      job.updatedAt = new Date().toISOString();
    }
    sendJson(response, 200, { success: true, data: job });
  }

  async authorizeDownload(request: IncomingMessage, response: ServerResponse, exportJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.download");
    sendJson(response, 200, { success: true, data: await exportPackageService.authorizeDownload(exportJobId) });
  }

  async download(request: IncomingMessage, response: ServerResponse, downloadReference: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.download");
    const download = await exportPackageService.readAuthorizedDownload(downloadReference);
    response.writeHead(200, {
      "Content-Type": "application/vnd.ascend-nexus.export+json",
      "Content-Disposition": `attachment; filename="${download.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Length": download.payload.byteLength,
    });
    response.end(download.payload);
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.health.read");
    sendJson(response, 200, { success: true, data: await exportImportHealthService.getHealthReport() });
  }

  async capabilities(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.read");
    sendJson(response, 200, {
      success: true,
      data: {
        activePackageVersion: "2.0.0",
        archiveFormat: "tar",
        binaryMediaEncoding: "separate_archive_entries",
        legacyV1ImportSupported: true,
        legacyV1ProductionExportDisabled: true,
        signing: await exportPackageSigningService.getHealth(),
        encryption: await exportPackageEncryptionService.getHealth(),
      },
    });
  }

  async securityPolicy(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "export_import.security.read");
    sendJson(response, 200, {
      success: true,
      data: {
        exportPolicy: {
          signatureRequired: true,
          protectedMediaEncryptionRequired: true,
          fullBackupEncryptionRequired: true,
          defaultPackageVersion: "2.0.0",
        },
        importPolicy: {
          productionSignaturePolicy: "require_trusted_signature",
          nonProductionSignaturePolicy: "allow_unsigned_with_warning",
          advancedModesRequireReauthentication: true,
        },
        trustedSigners: (await packageSigningKeyProvider.listTrustedPublicKeys()).map(({ publicKeyPem: _publicKeyPem, ...safe }) => safe),
      },
    });
  }

  async jobSecurity(request: IncomingMessage, response: ServerResponse, exportJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.read");
    const job = exportPackageService.getJob(exportJobId);
    sendJson(response, 200, { success: true, data: job?.securitySummary ?? null });
  }

  async verify(request: IncomingMessage, response: ServerResponse, exportJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "exports.read");
    const job = exportPackageService.getJob(exportJobId);
    sendJson(response, 200, { success: true, data: { exportJobId, status: job?.status ?? "missing", packageVersion: job?.packageVersion, checksum: job?.packageChecksum, securitySummary: job?.securitySummary } });
  }

  async certificationStatus(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "export_import.certification.read");
    sendJson(response, 200, { success: true, data: exportImportCertificationService.getLatestCertificationStatus() });
  }

  async runCertification(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "export_import.certification.execute");
    sendJson(response, 200, { success: true, data: await exportImportCertificationService.startCertification(process.env.NODE_ENV ?? "development", actorId(auth)) });
  }
}

export const adminExportController = new AdminExportController();
