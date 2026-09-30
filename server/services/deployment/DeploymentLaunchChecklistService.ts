import fs from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../config/backendConfig";
import { getConfigurationValidationResult } from "../../config/configValidation";
import { securityLaunchGateService } from "../security/SecurityLaunchGateService";
import { deploymentHealthService } from "./DeploymentHealthService";
import { deploymentReleaseService } from "./DeploymentReleaseService";

const truthy = (value: string | undefined) => ["1", "true", "yes", "verified", "pass", "passed"].includes(String(value ?? "").toLowerCase());
const docExists = (file: string) => fs.existsSync(path.join(process.cwd(), "docs", file));

export interface DeploymentChecklistItem {
  key: string;
  status: "pass" | "warn" | "block";
  message: string;
  evidence?: Record<string, unknown>;
}

export class DeploymentLaunchChecklistService {
  async buildLaunchReport(environment = getBackendConfig().app.environment) {
    const config = getBackendConfig();
    const validation = getConfigurationValidationResult(config);
    const securityDecision = await securityLaunchGateService.evaluate();
    const deploymentHealth = await deploymentHealthService.getHealth();
    const release = await deploymentReleaseService.getCurrentRelease();
    const items: DeploymentChecklistItem[] = [];
    const add = (item: DeploymentChecklistItem) => items.push(item);

    add({ key: "configuration", status: validation.valid ? "pass" : "block", message: validation.valid ? "Strict configuration is valid." : "Strict configuration has blocking errors.", evidence: { errors: validation.errors.map((issue) => issue.code) } });
    add({ key: "security", status: securityDecision.decision === "blocked" ? "block" : securityDecision.decision === "approved" ? "pass" : "warn", message: `ANM-WEB-102 security decision is ${securityDecision.decision}.`, evidence: { warnings: securityDecision.warnings } });
    add({ key: "runtime_health", status: deploymentHealth.ready ? "pass" : "block", message: deploymentHealth.ready ? "Runtime readiness passes locally." : "Runtime readiness is not healthy.", evidence: deploymentHealth.checks });
    add({ key: "artifact", status: release.artifactDigest && release.artifactDigest !== "local-unverified" ? "pass" : "block", message: release.artifactDigest === "local-unverified" ? "Immutable deployment artifact digest is not provided." : "Deployment artifact digest is present.", evidence: { artifactDigest: release.artifactDigest } });
    add({ key: "domain_dns", status: truthy(process.env.DEPLOYMENT_DNS_VERIFIED) ? "pass" : "block", message: "Production DNS verification evidence is required." });
    add({ key: "tls", status: truthy(process.env.DEPLOYMENT_TLS_VERIFIED) ? "pass" : "block", message: "Production TLS and HTTPS redirect verification evidence is required." });
    add({ key: "database_backup", status: truthy(process.env.DEPLOYMENT_BACKUP_VERIFIED) ? "pass" : "block", message: "Current encrypted backup evidence is required." });
    add({ key: "restore_test", status: truthy(process.env.DEPLOYMENT_RESTORE_VERIFIED) ? "pass" : "block", message: "A completed isolated restore test is required before production verification.", evidence: { documentationPresent: docExists("ANM-WEB-103-database-restore-test.md") } });
    add({ key: "monitoring_alerts", status: truthy(process.env.DEPLOYMENT_MONITORING_VERIFIED) ? "pass" : "block", message: "Monitoring and alert routing evidence is required." });
    add({ key: "rollback", status: truthy(process.env.DEPLOYMENT_ROLLBACK_VERIFIED) ? "pass" : "block", message: "Rollback drill or previous-release verification evidence is required." });
    add({ key: "staging_rehearsal", status: truthy(process.env.DEPLOYMENT_STAGING_REHEARSAL_VERIFIED) ? "pass" : "block", message: "Full staging launch rehearsal evidence is required." });
    add({ key: "production_smoke", status: truthy(process.env.DEPLOYMENT_PRODUCTION_SMOKE_VERIFIED) ? "pass" : environment === "production" ? "block" : "warn", message: "Production smoke evidence is required for production launch approval." });
    add({ key: "legal_content", status: truthy(process.env.DEPLOYMENT_LEGAL_CONTENT_APPROVED) ? "pass" : "block", message: "Approved privacy, terms, consent, and email footer content is required." });
    add({ key: "runtime_packaging", status: docExists("ANM-WEB-103-production-architecture-decision.md") ? "warn" : "block", message: "Server/worker production packaging remains a documented launch concern until a server emit or approved runtime wrapper exists." });

    const blockingIssues = items.filter((item) => item.status === "block").map((item) => `${item.key}: ${item.message}`);
    const warnings = items.filter((item) => item.status === "warn").map((item) => `${item.key}: ${item.message}`);
    return {
      ready: blockingIssues.length === 0,
      blockingIssues,
      warnings,
      evidence: items,
      checkedAt: new Date().toISOString(),
      releaseId: release.deploymentReleaseId,
      environment,
    };
  }

  async assertLaunchReady(environment?: string) {
    const report = await this.buildLaunchReport(environment);
    if (!report.ready) {
      const error = new Error("Production launch gate is blocked.");
      Object.assign(error, { statusCode: 409, code: "DEPLOYMENT_LAUNCH_BLOCKED", safeDetails: { blockingIssues: report.blockingIssues } });
      throw error;
    }
    return report;
  }
}

export const deploymentLaunchChecklistService = new DeploymentLaunchChecklistService();
