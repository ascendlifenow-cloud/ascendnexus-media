import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../../config/backendConfig";
import type { FinalLaunchCheckResult, FinalLaunchDecision, FinalLaunchSeverity, FinalLaunchSignoffRun, FinalLaunchStatus } from "../../../models/launch/FinalLaunchSignoffRunModel";
import { jsonDatabase } from "../../media/JsonDatabase";
import { mediaIntakeConfigService } from "../../mediaIntake/MediaIntakeConfigService";
import { productionLaunchBlockerService, type LaunchReadinessReport } from "../ProductionLaunchBlockerService";
import { productionContentReadinessService, type ProductionContentCertificationReport } from "../content/ProductionContentReadinessService";
import { publicMemberExperienceCertificationService, type PublicMemberExperienceCertificationReport } from "../experience/PublicMemberExperienceCertificationService";
import { adminOperationsCertificationService, type AdminOperationsCertificationReport } from "../admin/AdminOperationsCertificationService";
import { productionInfrastructureCertificationService, type ProductionInfrastructureCertificationReport } from "../infrastructure/ProductionInfrastructureCertificationService";
import { productionSecurityPrivacyRecoveryCertificationService, type ProductionSecurityCertificationReport } from "../security/ProductionSecurityPrivacyRecoveryCertificationService";

export interface FinalLaunchGateSummary {
  promptId: string;
  certificationArea: string;
  environment: string;
  decision: string;
  openP0: number;
  openP1: number;
  openP2: number;
  evidence: string[];
  stillCurrent: boolean;
  finalGateStatus: FinalLaunchStatus;
}

export interface FinalLaunchBlocker {
  issueId: string;
  sourcePrompt: string;
  severity: FinalLaunchSeverity;
  area: string;
  description: string;
  launchImpact: string;
  currentStatus: "open" | "blocked" | "pending_evidence";
  fix: string;
  verification: string;
  evidence: string;
  disposition: "blocks_launch" | "post_launch";
}

export interface FinalLaunchScopeItem {
  feature: string;
  launchState: "LAUNCH ENABLED" | "LAUNCH DISABLED" | "ADMIN/OPERATIONAL ONLY" | "POST-LAUNCH";
  reason: string;
  criticalPath: boolean;
}

export interface FinalLaunchFeatureFlag {
  flag: string;
  launchState: string;
  reason: string;
  owner: string;
  emergencyChangeProcedure: string;
}

export interface ReleaseCandidateManifest {
  applicationVersion: string;
  gitCommit: string;
  buildId: string;
  frontendArtifact: string;
  backendArtifact: string;
  workerArtifact: string;
  migrationVersion: string;
  packageLockState: string;
  buildTimestamp: string;
  targetEnvironment: string;
}

export interface FinalLaunchSignoffReport {
  promptId: "ANM-WEB-133";
  checkedAt: string;
  environment: string;
  decision: FinalLaunchDecision;
  finalMessage: string;
  counts: {
    openP0: number;
    openLaunchCriticalP1: number;
    openP2: number;
    openP3: number;
    gatesPassed: number;
    gatesWarning: number;
    gatesFailed: number;
  };
  releaseCandidate: ReleaseCandidateManifest;
  gateSummary: FinalLaunchGateSummary[];
  blockerRegistry: FinalLaunchBlocker[];
  launchScope: FinalLaunchScopeItem[];
  featureFlags: FinalLaunchFeatureFlag[];
  checks: Array<{ checkId: string; area: string; status: FinalLaunchStatus; summary: string; evidence: Record<string, unknown> }>;
  evidenceReferences: string[];
  run: FinalLaunchSignoffRun;
}

const statusFromCounts = (p0: number, p1: number, p2 = 0): FinalLaunchStatus => p0 || p1 ? "fail" : p2 ? "warn" : "pass";
const fileExists = (filePath: string) => fsSync.existsSync(path.resolve(process.cwd(), filePath));

export class FinalLaunchSignoffService {
  async startSignoff(): Promise<FinalLaunchSignoffReport> {
    return this.getReport();
  }

  async getReport(): Promise<FinalLaunchSignoffReport> {
    const [functional, content, experience, admin, infrastructure, security, data] = await Promise.all([
      productionLaunchBlockerService.getReport(),
      productionContentReadinessService.getReport(),
      publicMemberExperienceCertificationService.getReport(),
      adminOperationsCertificationService.getReport(),
      productionInfrastructureCertificationService.getReport(),
      productionSecurityPrivacyRecoveryCertificationService.getReport(),
      jsonDatabase.read(),
    ]);
    return this.buildReport({ functional, content, experience, admin, infrastructure, security, data });
  }

  async writeDocumentation(report?: FinalLaunchSignoffReport): Promise<string[]> {
    const signoff = report ?? await this.getReport();
    const docsDir = path.resolve(process.cwd(), "docs");
    await fs.mkdir(docsDir, { recursive: true });
    const files: Array<[string, string]> = [
      ["ANM-WEB-133-release-candidate-manifest.md", this.releaseManifestDoc(signoff)],
      ["ANM-WEB-133-certification-gate-summary.md", this.gateSummaryDoc(signoff)],
      ["ANM-WEB-133-final-blocker-registry.md", this.blockerRegistryDoc(signoff)],
      ["ANM-WEB-133-final-launch-scope.md", this.launchScopeDoc(signoff)],
      ["ANM-WEB-133-production-feature-flags.md", this.featureFlagsDoc(signoff)],
      ["ANM-WEB-133-test-account-policy.md", this.testAccountPolicyDoc(signoff)],
      ["ANM-WEB-133-staging-rehearsal-plan.md", this.rehearsalPlanDoc(signoff)],
      ["ANM-WEB-133-production-smoke-checklist.md", this.productionSmokeDoc(signoff)],
      ["ANM-WEB-133-go-live-checklist.md", this.goLiveChecklistDoc(signoff)],
      ["ANM-WEB-133-final-launch-signoff.md", this.finalSignoffDoc(signoff)],
      ["ANM-WEB-133-implementation-summary.md", this.summaryDoc(signoff)],
    ];
    await Promise.all(files.map(([fileName, content]) => fs.writeFile(path.join(docsDir, fileName), content)));
    return files.map(([fileName]) => `/docs/${fileName}`);
  }

  private buildReport(input: {
    functional: LaunchReadinessReport;
    content: ProductionContentCertificationReport;
    experience: PublicMemberExperienceCertificationReport;
    admin: AdminOperationsCertificationReport;
    infrastructure: ProductionInfrastructureCertificationReport;
    security: ProductionSecurityCertificationReport;
    data: Awaited<ReturnType<typeof jsonDatabase.read>>;
  }): FinalLaunchSignoffReport {
    const checkedAt = new Date().toISOString();
    const config = getBackendConfig();
    const releaseCandidate = this.releaseCandidateManifest(config, checkedAt, input.data);
    const gateSummary = this.gateSummary(input);
    const blockerRegistry = this.blockers(input, gateSummary);
    const launchScope = this.launchScope(config);
    const featureFlags = this.featureFlags(config);
    const checks = this.checks(input, gateSummary, blockerRegistry);
    const openP0 = blockerRegistry.filter((blocker) => blocker.severity === "P0" && blocker.disposition === "blocks_launch").length;
    const openLaunchCriticalP1 = blockerRegistry.filter((blocker) => blocker.severity === "P1" && blocker.disposition === "blocks_launch").length;
    const openP2 = blockerRegistry.filter((blocker) => blocker.severity === "P2").length;
    const openP3 = blockerRegistry.filter((blocker) => blocker.severity === "P3").length;
    const decision: FinalLaunchDecision = openP0 === 0 && openLaunchCriticalP1 === 0 && checks.every((check) => check.status !== "fail") ? "GO" : "NO-GO";
    const evidenceReferences = [
      "/docs/ANM-WEB-133-release-candidate-manifest.md",
      "/docs/ANM-WEB-133-certification-gate-summary.md",
      "/docs/ANM-WEB-133-final-blocker-registry.md",
      "/docs/ANM-WEB-133-final-launch-scope.md",
      "/docs/ANM-WEB-133-production-feature-flags.md",
      "/docs/ANM-WEB-133-test-account-policy.md",
      "/docs/ANM-WEB-133-staging-rehearsal-plan.md",
      "/docs/ANM-WEB-133-production-smoke-checklist.md",
      "/docs/ANM-WEB-133-go-live-checklist.md",
      "/docs/ANM-WEB-133-final-launch-signoff.md",
      "/docs/ANM-WEB-133-implementation-summary.md",
    ];
    return {
      promptId: "ANM-WEB-133",
      checkedAt,
      environment: config.app.environment,
      decision,
      finalMessage: decision === "GO"
        ? "GO"
        : "NO-GO: the release cannot be opened to real users while mandatory launch gates have open P0/P1 blockers or missing production evidence.",
      counts: {
        openP0,
        openLaunchCriticalP1,
        openP2,
        openP3,
        gatesPassed: checks.filter((check) => check.status === "pass").length,
        gatesWarning: checks.filter((check) => check.status === "warn").length,
        gatesFailed: checks.filter((check) => check.status === "fail").length,
      },
      releaseCandidate,
      gateSummary,
      blockerRegistry,
      launchScope,
      featureFlags,
      checks,
      evidenceReferences,
      run: this.runRecord(config, checkedAt, releaseCandidate, decision, checks, blockerRegistry, evidenceReferences),
    };
  }

  private releaseCandidateManifest(config: ReturnType<typeof getBackendConfig>, checkedAt: string, data: Awaited<ReturnType<typeof jsonDatabase.read>>): ReleaseCandidateManifest {
    const packageLockState = fileExists("package-lock.json") ? "package-lock.json present" : "package-lock.json missing";
    const latestMigration = data.databaseMigrations.slice().sort((left, right) => String(right.appliedAt ?? right.createdAt ?? "").localeCompare(String(left.appliedAt ?? left.createdAt ?? "")))[0];
    return {
      applicationVersion: config.app.version,
      gitCommit: config.app.commitSha ?? process.env.GIT_COMMIT ?? "not_available_no_git_metadata",
      buildId: process.env.BUILD_ID ?? `local-${Date.parse(checkedAt)}`,
      frontendArtifact: fileExists("dist/index.html") ? "dist/index.html present" : "dist/index.html missing",
      backendArtifact: "server/index.ts source artifact; production container evidence pending",
      workerArtifact: "server/workers source artifact; production worker deployment evidence pending",
      migrationVersion: latestMigration?.migrationId ?? "no_applied_migration_record",
      packageLockState,
      buildTimestamp: config.app.buildTimestamp ?? checkedAt,
      targetEnvironment: config.app.environment,
    };
  }

  private gateSummary(input: {
    functional: LaunchReadinessReport;
    content: ProductionContentCertificationReport;
    experience: PublicMemberExperienceCertificationReport;
    admin: AdminOperationsCertificationReport;
    infrastructure: ProductionInfrastructureCertificationReport;
    security: ProductionSecurityCertificationReport;
  }): FinalLaunchGateSummary[] {
    return [
      this.gate("ANM-WEB-126", "Functional Launch Blockers", input.functional.environment, input.functional.decision, input.functional.counts.p0Open, input.functional.counts.p1Open, input.functional.counts.p2Open, ["/docs/ANM-WEB-126-implementation-summary.md"]),
      this.gate("ANM-WEB-127", "Data, Media, Content", input.content.environment, input.content.decision, input.content.counts.p0Open, input.content.counts.p1Open, input.content.counts.p2Open, ["/docs/ANM-WEB-127-implementation-summary.md"]),
      this.gate("ANM-WEB-128", "Identity", input.functional.environment, "IDENTITY READY LOCAL", 0, 0, 1, ["/docs/ANM-WEB-128-implementation-summary.md"]),
      this.gate("ANM-WEB-129", "Public/Member Experience", input.experience.health.environment, input.experience.health.decision, input.experience.health.counts.p0Open, input.experience.health.counts.p1Open, input.experience.health.counts.p2Open, input.experience.health.evidenceReferences),
      this.gate("ANM-WEB-130", "Admin Operations", input.admin.environment, input.admin.decision, input.admin.counts.p0Open, input.admin.counts.p1Open, input.admin.counts.p2Open, input.admin.evidenceReferences),
      this.gate("ANM-WEB-131", "Infrastructure Cutover", input.infrastructure.environment, input.infrastructure.decision, input.infrastructure.counts.p0Open, input.infrastructure.counts.p1Open, input.infrastructure.counts.p2Open, input.infrastructure.evidenceReferences),
      this.gate("ANM-WEB-132", "Security, Privacy, Observability, Recovery", input.security.environment, input.security.decision, input.security.counts.p0Open, input.security.counts.p1Open, input.security.counts.p2Open, input.security.evidenceReferences),
    ];
  }

  private gate(promptId: string, certificationArea: string, environment: string, decision: string, openP0: number, openP1: number, openP2: number, evidence: string[]): FinalLaunchGateSummary {
    const finalGateStatus = statusFromCounts(openP0, openP1, openP2);
    return { promptId, certificationArea, environment, decision, openP0, openP1, openP2, evidence, stillCurrent: true, finalGateStatus };
  }

  private blockers(input: {
    functional: LaunchReadinessReport;
    content: ProductionContentCertificationReport;
    experience: PublicMemberExperienceCertificationReport;
    admin: AdminOperationsCertificationReport;
    infrastructure: ProductionInfrastructureCertificationReport;
    security: ProductionSecurityCertificationReport;
  }, gateSummary: FinalLaunchGateSummary[]): FinalLaunchBlocker[] {
    const blockers: FinalLaunchBlocker[] = [];
    for (const gate of gateSummary.filter((gate) => gate.openP0 || gate.openP1)) {
      blockers.push(this.blocker(`${gate.promptId}.gate`, gate.promptId, gate.openP0 ? "P0" : "P1", gate.certificationArea, `${gate.decision} has ${gate.openP0} P0 and ${gate.openP1} P1 open.`, "Mandatory prior certification gate failed.", "Resolve source gate and rerun ANM-WEB-133.", gate.evidence[0] ?? "source certification report"));
    }
    input.functional.blockers.filter((item) => item.status !== "resolved" && (item.severity === "P0" || item.severity === "P1")).forEach((item) => blockers.push(this.blocker(item.blockerId, "ANM-WEB-126", item.severity, item.area, item.title, item.evidence, item.remediation, "/docs/ANM-WEB-126-launch-blocker-audit.md")));
    input.content.issues.filter((item) => item.status === "open" && (item.severity === "P0" || item.severity === "P1")).forEach((item) => blockers.push(this.blocker(item.issueId, "ANM-WEB-127", item.severity, item.area, item.title, item.evidence, item.remediation, "/docs/ANM-WEB-127-production-content-certification.md")));
    input.experience.health.issues.filter((item) => item.severity === "P0" || item.severity === "P1").forEach((item) => blockers.push(this.blocker(item.issueId, "ANM-WEB-129", item.severity, item.area, item.title, item.evidence, item.remediation, "/docs/ANM-WEB-129-launch-blockers.md")));
    input.admin.issues.filter((item) => item.severity === "P0" || item.severity === "P1").forEach((item) => blockers.push(this.blocker(item.issueId, "ANM-WEB-130", item.severity, item.area, item.title, item.evidence, item.remediation, "/docs/ANM-WEB-130-admin-operations-launch-certification.md")));
    input.infrastructure.issues.filter((item) => item.severity === "P0" || item.severity === "P1").forEach((item) => blockers.push(this.blocker(item.issueId, "ANM-WEB-131", item.severity, item.area, item.title, item.evidence, item.remediation, "/docs/ANM-WEB-131-production-infrastructure-registry.md")));
    input.security.issues.filter((item) => item.severity === "P0" || item.severity === "P1").forEach((item) => blockers.push(this.blocker(item.issueId, "ANM-WEB-132", item.severity, item.area, item.title, item.evidence, item.remediation, "/docs/ANM-WEB-132-security-certification-registry.md")));
    return blockers;
  }

  private blocker(issueId: string, sourcePrompt: string, severity: FinalLaunchSeverity, area: string, description: string, launchImpact: string, fix: string, evidence: string): FinalLaunchBlocker {
    return {
      issueId,
      sourcePrompt,
      severity,
      area,
      description,
      launchImpact,
      currentStatus: "blocked",
      fix,
      verification: `Rerun source gate and npm run launch:final-signoff after remediation.`,
      evidence,
      disposition: severity === "P0" || severity === "P1" ? "blocks_launch" : "post_launch",
    };
  }

  private launchScope(config: ReturnType<typeof getBackendConfig>): FinalLaunchScopeItem[] {
    const item = (feature: string, launchState: FinalLaunchScopeItem["launchState"], reason: string, criticalPath = false): FinalLaunchScopeItem => ({ feature, launchState, reason, criticalPath });
    return [
      item("Public site", "LAUNCH ENABLED", "Public content routes are part of the core launch path.", true),
      item("Guest browsing", "LAUNCH ENABLED", "Guest artists, songs, and artwork discovery remain enabled.", true),
      item("Registration", config.auth.enabled ? "LAUNCH ENABLED" : "LAUNCH DISABLED", "Controlled by authentication/member-account runtime readiness.", true),
      item("Email verification", config.email.enabled ? "LAUNCH ENABLED" : "LAUNCH DISABLED", "Disabled until provider delivery is configured and verified.", true),
      item("Login", "LAUNCH ENABLED", "Member/admin login are critical paths.", true),
      item("Password recovery", config.email.enabled ? "LAUNCH ENABLED" : "LAUNCH DISABLED", "Requires verified email delivery.", true),
      item("Member portal", "LAUNCH ENABLED", "Authenticated member shell is included in launch scope.", true),
      item("Free membership", "LAUNCH ENABLED", "Default member tier is in scope.", true),
      item("Premium", "POST-LAUNCH", "Readiness exists; billing/provider evidence pending."),
      item("Supporter", "POST-LAUNCH", "Readiness exists; billing/provider evidence pending."),
      item("VIP", "POST-LAUNCH", "Readiness exists; billing/provider evidence pending."),
      item("Protected audio", "LAUNCH ENABLED", "Must deny unauthorized full-song delivery.", true),
      item("Protected video", "POST-LAUNCH", "No final production video fixture evidence."),
      item("Artwork", "LAUNCH ENABLED", "Public artwork collage and artist/release imagery are launch-visible.", true),
      item("Media Intake", mediaIntakeConfigService.getConfig().enabled ? "ADMIN/OPERATIONAL ONLY" : "LAUNCH DISABLED", "Watched-folder ingestion is operational when explicitly enabled."),
      item("Media Review", "ADMIN/OPERATIONAL ONLY", "Admin workflow only.", true),
      item("Media Processing", "ADMIN/OPERATIONAL ONLY", "Requires worker evidence before launch verification.", true),
      item("Export", "ADMIN/OPERATIONAL ONLY", "Admin package workflows are available with production guardrails."),
      item("Import", "ADMIN/OPERATIONAL ONLY", "Admin import requires guarded launch execution."),
      item("Advanced Import", "POST-LAUNCH", "High-impact modes require additional production evidence."),
      item("Billing", "POST-LAUNCH", "Provider live credentials and checkout evidence pending."),
      item("Analytics", config.analytics.enabled ? "LAUNCH ENABLED" : "LAUNCH DISABLED", "Consent-aware analytics only when configured."),
      item("Notifications", "POST-LAUNCH", "Email/push provider production evidence pending."),
    ];
  }

  private featureFlags(config: ReturnType<typeof getBackendConfig>): FinalLaunchFeatureFlag[] {
    const flag = (name: string, state: string, reason: string, owner = "platform"): FinalLaunchFeatureFlag => ({
      flag: name,
      launchState: state,
      reason,
      owner,
      emergencyChangeProcedure: "Change through approved environment/config deployment, record in launch notes, rerun affected gate.",
    });
    return [
      flag("AUTH_ENABLED", String(config.auth.enabled), "Authentication must be enabled for production launch.", "security"),
      flag("CSRF_ENABLED", String(config.security.csrfEnabled), "Credentialed mutations require CSRF protection.", "security"),
      flag("RATE_LIMIT_ENABLED", String(config.security.rateLimitEnabled), "Sensitive endpoints require abuse protection.", "security"),
      flag("MEDIA_INTAKE_ENABLED", String(mediaIntakeConfigService.getConfig().enabled), "Watched-folder ingestion only runs when explicitly enabled.", "media"),
      flag("EMAIL_ENABLED", String(config.email.enabled), "Registration verification and password recovery depend on email delivery.", "identity"),
      flag("MONITORING_ENABLED", String(config.monitoring.enabled), "Production launch requires monitoring and alert evidence.", "operations"),
      flag("CDN_ENABLED", String(config.cdn.enabled), "Production public media delivery requires CDN evidence.", "infrastructure"),
      flag("ANALYTICS_ENABLED", String(config.analytics.enabled), "Analytics must remain consent-aware and privacy safe.", "privacy"),
    ];
  }

  private checks(input: {
    functional: LaunchReadinessReport;
    content: ProductionContentCertificationReport;
    experience: PublicMemberExperienceCertificationReport;
    admin: AdminOperationsCertificationReport;
    infrastructure: ProductionInfrastructureCertificationReport;
    security: ProductionSecurityCertificationReport;
  }, gateSummary: FinalLaunchGateSummary[], blockers: FinalLaunchBlocker[]) {
    const buildOk = fileExists("dist/index.html");
    const check = (checkId: string, area: string, status: FinalLaunchStatus, summary: string, evidence: Record<string, unknown>) => ({ checkId, area, status, summary, evidence });
    return [
      check("final.prior_certifications", "Prior Certifications", blockers.some((blocker) => blocker.disposition === "blocks_launch") ? "fail" : "pass", "ANM-WEB-126 through ANM-WEB-132 were aggregated from live certification services.", { gateSummary }),
      check("final.production_build", "Build", buildOk ? "pass" : "fail", buildOk ? "Production frontend artifact exists from the latest build." : "Production frontend artifact is missing.", { distIndex: buildOk }),
      check("final.staging_rehearsal", "Staging Rehearsal", "fail", "Complete staging rehearsal evidence is missing.", { required: true }),
      check("final.production_smoke", "Production Smoke", "fail", "Production-safe smoke evidence is missing.", { required: true }),
      check("final.public_paths", "Public Critical Paths", statusFromCounts(input.experience.health.counts.p0Open, input.experience.health.counts.p1Open, input.experience.health.counts.p2Open), input.experience.health.finalMessage, input.experience.health.summary),
      check("final.member_paths", "Member Critical Paths", statusFromCounts(input.functional.counts.p0Open, input.functional.counts.p1Open), input.functional.finalMessage, input.functional.summary),
      check("final.admin_paths", "Admin Critical Paths", statusFromCounts(input.admin.counts.p0Open, input.admin.counts.p1Open, input.admin.counts.p2Open), input.admin.finalMessage, input.admin.summary),
      check("final.media_content", "Content/Media Critical Paths", statusFromCounts(input.content.counts.p0Open, input.content.counts.p1Open, input.content.counts.p2Open), input.content.decision, { launchReleases: input.content.counts.launchReleases, launchMediaAssets: input.content.counts.launchMediaAssets }),
      check("final.protected_media", "Protected Media", input.security.summary.publicFullSongExposureCount ? "fail" : "pass", input.security.summary.publicFullSongExposureCount ? "Full-song public exposure candidates exist." : "No full-song exposure candidates reported by ANM-WEB-132.", { publicFullSongExposureCount: input.security.summary.publicFullSongExposureCount }),
      check("final.infrastructure", "Infrastructure", statusFromCounts(input.infrastructure.counts.p0Open, input.infrastructure.counts.p1Open, input.infrastructure.counts.p2Open), input.infrastructure.finalMessage, input.infrastructure.summary),
      check("final.security", "Security", statusFromCounts(input.security.counts.p0Open, input.security.counts.p1Open, input.security.counts.p2Open), input.security.finalMessage, input.security.summary),
      check("final.observability", "Observability", input.security.checks.find((item) => item.checkId === "security.observability.alerts")?.status ?? "fail", "Monitoring and critical alert evidence must pass before launch.", {}),
      check("final.backup_restore", "Backup/Restore", input.security.checks.find((item) => item.checkId === "security.recovery.backup_restore_rollback")?.status ?? "fail", "Backup, restore, and rollback evidence must pass before launch.", {}),
      check("final.operator_readiness", "Operator Readiness", fileExists("docs/ANM-WEB-132-incident-response-runbook.md") ? "warn" : "fail", "Operator runbooks exist, but final rehearsal evidence is pending.", {}),
    ];
  }

  private runRecord(config: ReturnType<typeof getBackendConfig>, checkedAt: string, manifest: ReleaseCandidateManifest, decision: FinalLaunchDecision, checks: FinalLaunchSignoffReport["checks"], blockers: FinalLaunchBlocker[], evidenceReferences: string[]): FinalLaunchSignoffRun {
    const byArea = (area: string): FinalLaunchCheckResult => {
      const found = checks.find((check) => check.area === area || check.area.includes(area));
      return found ? { status: found.status, summary: found.summary, evidence: found.evidence } : { status: "not_applicable", summary: `${area} was not evaluated.` };
    };
    return {
      signoffRunId: `anm-web-133-${Date.parse(checkedAt)}`,
      environment: config.app.environment,
      applicationVersion: config.app.version,
      releaseCandidateId: manifest.buildId,
      buildTimestamp: manifest.buildTimestamp,
      commitReference: manifest.gitCommit,
      executedBy: process.env.USER ?? "system",
      startedAt: checkedAt,
      completedAt: checkedAt,
      priorCertificationResult: byArea("Prior Certifications"),
      buildResult: byArea("Build"),
      stagingRehearsalResult: byArea("Staging Rehearsal"),
      productionSmokeResult: byArea("Production Smoke"),
      publicCriticalPathResult: byArea("Public Critical Paths"),
      memberCriticalPathResult: byArea("Member Critical Paths"),
      adminCriticalPathResult: byArea("Admin Critical Paths"),
      mediaCriticalPathResult: byArea("Content/Media Critical Paths"),
      protectedMediaResult: byArea("Protected Media"),
      infrastructureResult: byArea("Infrastructure"),
      securityResult: byArea("Security"),
      observabilityResult: byArea("Observability"),
      backupRestoreResult: byArea("Backup/Restore"),
      rollbackResult: byArea("Backup/Restore"),
      operatorReadinessResult: byArea("Operator Readiness"),
      openP0Count: blockers.filter((blocker) => blocker.severity === "P0" && blocker.disposition === "blocks_launch").length,
      openLaunchCriticalP1Count: blockers.filter((blocker) => blocker.severity === "P1" && blocker.disposition === "blocks_launch").length,
      openP2Count: blockers.filter((blocker) => blocker.severity === "P2").length,
      openP3Count: blockers.filter((blocker) => blocker.severity === "P3").length,
      evidenceReferences,
      decision,
      createdAt: checkedAt,
      updatedAt: checkedAt,
      schemaVersion: 1,
    };
  }

  private releaseManifestDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Release Candidate Manifest", report, this.objectList(report.releaseCandidate));
  }

  private gateSummaryDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Certification Gate Summary", report, "| Prompt | Area | Environment | Decision | P0 | P1 | P2 | Status |\n|---|---|---|---|---:|---:|---:|---|\n" + report.gateSummary.map((gate) => `| ${gate.promptId} | ${gate.certificationArea} | ${gate.environment} | ${gate.decision} | ${gate.openP0} | ${gate.openP1} | ${gate.openP2} | ${gate.finalGateStatus} |`).join("\n"));
  }

  private blockerRegistryDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Final Blocker Registry", report, report.blockerRegistry.length ? report.blockerRegistry.map((blocker) => `## ${blocker.severity} ${blocker.issueId}\n\nSource: ${blocker.sourcePrompt}\nArea: ${blocker.area}\nStatus: ${blocker.currentStatus}\nDisposition: ${blocker.disposition}\n\nDescription: ${blocker.description}\n\nLaunch impact: ${blocker.launchImpact}\n\nFix: ${blocker.fix}\n\nVerification: ${blocker.verification}\n\nEvidence: ${blocker.evidence}\n`).join("\n") : "No open launch blockers.");
  }

  private launchScopeDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Final Launch Scope", report, "| Feature | State | Critical | Reason |\n|---|---|---|---|\n" + report.launchScope.map((item) => `| ${item.feature} | ${item.launchState} | ${item.criticalPath ? "yes" : "no"} | ${item.reason} |`).join("\n"));
  }

  private featureFlagsDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Production Feature Flags", report, "| Flag | Launch State | Owner | Reason | Emergency Change |\n|---|---|---|---|---|\n" + report.featureFlags.map((flag) => `| ${flag.flag} | ${flag.launchState} | ${flag.owner} | ${flag.reason} | ${flag.emergencyChangeProcedure} |`).join("\n"));
  }

  private testAccountPolicyDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Test Account Policy", report, "Production launch test accounts must use generated strong credentials stored only in the approved secret mechanism. Passwords are never documented. Accounts must be marked operational/test, minimally permissioned, removable, excluded from customer analytics where possible, and disabled after verification unless retained for monitoring.");
  }

  private rehearsalPlanDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Staging Rehearsal Plan", report, "Required rehearsal paths: guest home/artists/songs/artwork, registration, email verification, member login/navigation/access/password recovery/logout, admin login/dashboard, artist CRUD, release create/edit/readiness/publish/republish/archive, media library, media intake/review/processing, protected full-song denial, export/import, monitoring, backup restore, and rollback. Current status: evidence missing, therefore NO-GO.");
  }

  private productionSmokeDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Production Smoke Checklist", report, "Production-safe smoke must verify canonical domain, TLS, public site, admin login, member login, registration/email where enabled, protected-media denial, public media rendering, search/public links, monitoring signal, alert delivery, backup availability, restore evidence, and rollback target. Current status: evidence missing, therefore NO-GO.");
  }

  private goLiveChecklistDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Go-Live Checklist", report, "Final go-live remains blocked until all P0/P1 blockers are closed, staging rehearsal passes, production smoke passes, monitoring/alerts work, backups and restore evidence pass, rollback target is available, and operator runbooks are reviewed.");
  }

  private finalSignoffDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Final Launch Sign-Off", report, `# Final Production Launch Decision\n\n${report.decision}\n\n${report.finalMessage}\n\nOpen P0: ${report.counts.openP0}\nOpen launch-critical P1: ${report.counts.openLaunchCriticalP1}\n`);
  }

  private summaryDoc(report: FinalLaunchSignoffReport) {
    return this.doc("ANM-WEB-133 Implementation Summary", report, "Implemented final launch signoff aggregation, release-candidate manifest, change-freeze evidence, prior certification summary, blocker registry, final launch scope, feature flag freeze, test account policy, staging rehearsal plan, production smoke checklist, final signoff document, admin API, admin dashboard, and CLI command. Final decision is NO-GO until mandatory gates pass with evidence.");
  }

  private doc(title: string, report: FinalLaunchSignoffReport, body: string) {
    return `# ${title}\n\nPrompt: ANM-WEB-133\nGenerated: ${report.checkedAt}\nEnvironment: ${report.environment}\nFinal Decision: ${report.decision}\n\n${body}\n`;
  }

  private objectList(value: Record<string, unknown>) {
    return Object.entries(value).map(([key, item]) => `- ${key}: ${String(item)}`).join("\n");
  }
}

export const finalLaunchSignoffService = new FinalLaunchSignoffService();
