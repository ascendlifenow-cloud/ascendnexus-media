import crypto from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import { launchCertificationEvidenceRepository } from "../../repositories/observability/ObservabilityRepository";
import { promptCompletionMatrixService } from "./PromptCompletionMatrixService";

export class CertificationEvidenceService {
  async buildEvidence(environment = getBackendConfig().app.environment) {
    const config = getBackendConfig();
    const matrix = promptCompletionMatrixService.buildMatrix();
    const existing = await launchCertificationEvidenceRepository.list({ includeArchived: true });
    const evidence = matrix.map((row) => ({
      evidenceId: `evidence_${row.promptId.toLowerCase()}_${crypto.createHash("sha1").update(row.promptId).digest("hex").slice(0, 8)}`,
      promptId: row.promptId,
      requirement: row.promptName,
      status: row.implementationSummaryPresent ? (row.blockers.length ? "verified_with_warning" as const : "verified" as const) : "missing" as const,
      source: "implementation_summary_and_launch_checklist",
      artifactPath: row.evidenceReferences[0],
      verifiedAt: new Date().toISOString(),
      verifiedBy: "ANM-WEB-105 certification service",
      environment,
      releaseVersion: config.app.version,
      notes: [...row.warnings, ...row.blockers].join(" ") || "Implementation evidence present.",
      blocking: !row.implementationSummaryPresent,
      schemaVersion: 1,
    }));
    const existingIds = new Set(existing.map((item) => item.evidenceId));
    for (const item of evidence) if (!existingIds.has(item.evidenceId)) await launchCertificationEvidenceRepository.create(item);
    return evidence;
  }
}

export const certificationEvidenceService = new CertificationEvidenceService();
