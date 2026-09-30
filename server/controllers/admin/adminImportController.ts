import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../../services/media/MediaAuthorizationService";
import { exportImportState, importDryRunService, importExecutionService, importPackageInspectionService } from "../../services/exportImport/ExportImportService";
import { packageSigningKeyProvider } from "../../services/exportImport/security/PackageSecurityService";
import type { ImportIdStrategy, ImportMode, ImportPublicationStrategy } from "../../models/exportImport/ExportImportModels";

const actorId = (auth: { adminId?: string; userId?: string }) => auth.userId ?? auth.adminId ?? "admin";

export class AdminImportController {
  async upload(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.upload");
    const body = await parseJsonBody(request) as { packageData?: unknown; package?: unknown; packagePath?: string };
    if (body.packagePath) {
      sendJson(response, 201, { success: true, data: await importPackageInspectionService.uploadArchiveFile(body.packagePath, actorId(auth)) });
      return;
    }
    sendJson(response, 201, { success: true, data: await importPackageInspectionService.uploadPackage(body.packageData ?? body.package, actorId(auth)) });
  }

  async inspect(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    sendJson(response, 200, { success: true, data: await importPackageInspectionService.inspect(importJobId) });
  }

  async dryRun(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.dry_run");
    const body = await parseJsonBody(request).catch(() => ({})) as { mode?: ImportMode; idStrategy?: ImportIdStrategy; publicationStrategy?: ImportPublicationStrategy };
    sendJson(response, 200, { success: true, data: await importDryRunService.dryRun(importJobId, body) });
  }

  async execute(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.execute");
    const body = await parseJsonBody(request).catch(() => ({})) as { mode?: ImportMode; idStrategy?: ImportIdStrategy; publicationStrategy?: ImportPublicationStrategy; replaceScope?: string[]; reauthenticatedAt?: string; restorePlanId?: string };
    if (body.mode === "merge") mediaAuthorizationService.requirePermission(auth, "imports.merge");
    if (body.mode === "replace_selected") mediaAuthorizationService.requirePermission(auth, "imports.replace_selected");
    if (body.mode === "restore") mediaAuthorizationService.requirePermission(auth, "imports.restore");
    if (body.publicationStrategy === "preserve_publication_state") mediaAuthorizationService.requirePermission(auth, "imports.preserve_publication");
    sendJson(response, 200, { success: true, data: await importExecutionService.execute(importJobId, body) });
  }

  async rollback(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.rollback");
    sendJson(response, 200, { success: true, data: await importExecutionService.rollback(importJobId) });
  }

  async list(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    sendJson(response, 200, { success: true, data: [...exportImportState.importJobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  }

  async get(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    sendJson(response, 200, { success: true, data: exportImportState.importJobs.get(importJobId) ?? null });
  }

  async conflicts(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.resolve_conflicts");
    sendJson(response, 200, { success: true, data: exportImportState.importConflicts.get(importJobId) ?? [] });
  }

  async resolveConflict(request: IncomingMessage, response: ServerResponse, importJobId: string, conflictId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.resolve_conflicts");
    const body = await parseJsonBody(request).catch(() => ({})) as { selectedResolution?: string };
    const conflicts = exportImportState.importConflicts.get(importJobId) ?? [];
    const conflict = conflicts.find((item) => item.conflictId === conflictId);
    if (conflict) {
      conflict.selectedResolution = body.selectedResolution ?? "skip";
      conflict.status = "resolved";
    }
    sendJson(response, 200, { success: true, data: conflict ?? null });
  }

  async verification(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    const job = exportImportState.importJobs.get(importJobId);
    sendJson(response, 200, { success: true, data: { importJobId, validationSummary: job?.validationSummary, status: job?.status ?? "missing" } });
  }

  async decrypt(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.decrypt");
    sendJson(response, 200, { success: true, data: await importPackageInspectionService.inspect(importJobId) });
  }

  async verifyIntegrity(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    const result = await importPackageInspectionService.inspect(importJobId);
    sendJson(response, 200, { success: true, data: { importJobId, integrity: result.integrity } });
  }

  async verifySignature(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.verify_signature");
    const result = await importPackageInspectionService.inspect(importJobId);
    sendJson(response, 200, { success: true, data: { importJobId, signature: "signature" in result ? result.signature : undefined } });
  }

  async security(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    const job = exportImportState.importJobs.get(importJobId);
    sendJson(response, 200, { success: true, data: { signature: job?.signatureSummary, encryption: job?.encryptionSummary, validation: job?.validationSummary } });
  }

  async checkpoints(request: IncomingMessage, response: ServerResponse, importJobId: string) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.read");
    const job = exportImportState.importJobs.get(importJobId);
    sendJson(response, 200, { success: true, data: job?.checkpointSummary ?? {} });
  }

  async trustedSigners(request: IncomingMessage, response: ServerResponse) {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, "imports.signers.read");
    const signers = await packageSigningKeyProvider.listTrustedPublicKeys();
    sendJson(response, 200, { success: true, data: signers.map(({ publicKeyPem, ...safe }) => ({ ...safe, publicKeyFingerprint: publicKeyPem.slice(0, 48) })) });
  }
}

export const adminImportController = new AdminImportController();
