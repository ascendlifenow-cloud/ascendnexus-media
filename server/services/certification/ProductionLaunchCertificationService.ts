import crypto from "node:crypto";
import { getBackendConfig } from "../../config/backendConfig";
import { deploymentLaunchChecklistService } from "../deployment/DeploymentLaunchChecklistService";
import { securityLaunchGateService } from "../security/SecurityLaunchGateService";
import { seoIndexingLaunchGateService } from "../seo/SeoIndexingLaunchGateService";
import { reliabilityReleaseGateService } from "../reliability/ReliabilityReleaseGateService";
import { productionHealthCheckRegistry } from "../observability/ProductionHealthCheckRegistry";
import { certificationEvidenceService } from "./CertificationEvidenceService";
import { promptCompletionMatrixService } from "./PromptCompletionMatrixService";
import { launchCertificationDecisionRepository } from "../../repositories/observability/ObservabilityRepository";

export class ProductionLaunchCertificationService {
  async buildCertificationDecision(environment = "production") {
    const config = getBackendConfig();
    const [evidence, matrix, security, deployment, seo, reliability, health] = await Promise.all([
      certificationEvidenceService.buildEvidence(environment),
      Promise.resolve(promptCompletionMatrixService.buildMatrix()),
      securityLaunchGateService.evaluate(),
      deploymentLaunchChecklistService.buildLaunchReport(environment),
      seoIndexingLaunchGateService.evaluate(environment),
      reliabilityReleaseGateService.evaluate(environment),
      productionHealthCheckRegistry.runAllChecks(),
    ]);
    const blockingIssues = [
      ...evidence.filter((item) => item.blocking || item.status === "missing" || item.status === "failed").map((item) => `Missing or failed evidence: ${item.promptId} ${item.requirement}`),
      ...(security.decision === "blocked" ? ["Security launch gate is blocked."] : []),
      ...(!deployment.ready ? ["Deployment launch gate is blocked."] : []),
      ...(reliability.decision === "blocked" ? reliability.blockers : []),
      ...health.criticalFailures.map((service) => `Critical service unavailable: ${service}`),
    ];
    const warnings = [
      ...(seo.decision === "blocked" ? ["SEO indexing is deferred/blocked. Core launch may only proceed if robots/indexing policy and privacy checks remain safe."] : []),
      ...reliability.warnings,
      ...matrix.flatMap((row) => row.warnings.slice(0, 1)),
    ];
    const decision = blockingIssues.length ? "not_certified" : warnings.length ? "certified_with_warnings" : "certified";
    const record = {
      launchCertificationDecisionId: `cert_${crypto.randomUUID()}`,
      environment,
      releaseVersion: config.app.version,
      decision,
      blockingIssues,
      warnings: [...new Set(warnings)].slice(0, 50),
      evidenceCount: evidence.length,
      decidedAt: new Date().toISOString(),
      decidedBy: "ANM-WEB-105 certification service",
      status: "active" as const,
      schemaVersion: 1,
    };
    await launchCertificationDecisionRepository.create(record);
    return { ...record, securityDecision: security.decision, deploymentDecision: deployment.ready ? "approved" : "blocked", seoDecision: seo.decision, reliabilityDecision: reliability.decision, healthStatus: health.overallStatus, matrix };
  }
}

export const productionLaunchCertificationService = new ProductionLaunchCertificationService();
