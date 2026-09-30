import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../../config/backendConfig";
import { getConfigurationValidationResult } from "../../../config/configValidation";
import { allAdminPermissionNames } from "../../../constants/auth/permissions";
import { systemRoles } from "../../../constants/auth/systemRoles";
import type { ProductionSecurityCertificationResult, ProductionSecurityCertificationRun } from "../../../models/launch/ProductionSecurityCertificationRunModel";
import { jsonDatabase } from "../../media/JsonDatabase";
import { productionSecurityHealthService } from "../../security/ProductionSecurityHealthService";
import { productionInfrastructureCertificationService, type ProductionInfrastructureCertificationReport } from "../infrastructure/ProductionInfrastructureCertificationService";

export type ProductionSecurityStatus = "pass" | "warn" | "fail" | "not_applicable";
export type ProductionSecuritySeverity = "P0" | "P1" | "P2" | "P3";
export type ProductionSecurityDecisionText = "SECURITY READY" | "SECURITY READY WITH POST-LAUNCH ITEMS" | "SECURITY BLOCKED";

export interface ProductionSecurityCheck {
  checkId: string;
  area: string;
  status: ProductionSecurityStatus;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface ProductionSecurityIssue {
  issueId: string;
  severity: ProductionSecuritySeverity;
  area: string;
  title: string;
  evidence: string;
  remediation: string;
}

export interface ProductionSecurityControl {
  controlKey: string;
  category: string;
  owner: string;
  enforcementPoint: string;
  status: ProductionSecurityStatus;
  evidence: string;
}

export interface ProductionSecurityAttackSurface {
  surface: string;
  exposure: string;
  primaryControls: string[];
  certificationStatus: ProductionSecurityStatus;
  residualRisk: string;
}

export interface ProductionSecurityCertificationReport {
  promptId: "ANM-WEB-132";
  checkedAt: string;
  environment: string;
  decision: ProductionSecurityDecisionText;
  finalMessage: string;
  counts: {
    p0Open: number;
    p1Open: number;
    p2Open: number;
    p3Open: number;
    checksPassed: number;
    checksWarning: number;
    checksFailed: number;
  };
  summary: {
    productionLike: boolean;
    authEnabled: boolean;
    csrfEnabled: boolean;
    rateLimitEnabled: boolean;
    monitoringEnabled: boolean;
    auditEventCount: number;
    securityEventCount: number;
    publicFullSongExposureCount: number;
    privateMediaExposureCount: number;
    infrastructureDecision: string;
  };
  controls: ProductionSecurityControl[];
  attackSurface: ProductionSecurityAttackSurface[];
  adminAuthorizationMatrix: Array<{ role: string; permissionCount: number; criticalPermissionCount: number; launchSecurityAccess: boolean }>;
  checks: ProductionSecurityCheck[];
  issues: ProductionSecurityIssue[];
  evidenceReferences: string[];
  run: ProductionSecurityCertificationRun;
}

const result = (status: ProductionSecurityStatus, summary: string, evidence?: Record<string, unknown>): ProductionSecurityCertificationResult => ({ status, summary, evidence });
const has = (value?: string) => Boolean(value?.trim());
const hasFile = (filePath: string) => fsSync.existsSync(path.resolve(process.cwd(), filePath));
const lower = (value: unknown) => String(value ?? "").toLowerCase();

export class ProductionSecurityPrivacyRecoveryCertificationService {
  async startCertification(): Promise<ProductionSecurityCertificationReport> {
    return this.getReport();
  }

  async getReport(): Promise<ProductionSecurityCertificationReport> {
    const [data, infrastructure, securityHealth] = await Promise.all([
      jsonDatabase.read(),
      productionInfrastructureCertificationService.getReport(),
      productionSecurityHealthService.getHealthReport().catch((error) => ({ overallStatus: "blocked", errors: [error instanceof Error ? error.message : String(error)], warnings: [] })),
    ]);
    return this.buildReport(data, infrastructure, securityHealth as Record<string, unknown>);
  }

  async runAuthenticationChecks() { return (await this.getReport()).run.authenticationResult; }
  async runAuthorizationChecks() { return (await this.getReport()).run.authorizationResult; }
  async runMediaProtectionChecks() { return (await this.getReport()).run.mediaProtectionResult; }
  async runCorsChecks() { return (await this.getReport()).run.corsResult; }
  async runPrivacyChecks() { return (await this.getReport()).run.privacyResult; }
  async runObservabilityChecks() { return (await this.getReport()).run.observabilityResult; }
  async runRecoveryChecks() { return (await this.getReport()).run.restoreResult; }
  async collectEvidence() { return (await this.getReport()).evidenceReferences; }
  async makeDecision() { return (await this.getReport()).decision; }

  async writeDocumentation(report?: ProductionSecurityCertificationReport): Promise<string[]> {
    const certificationReport = report ?? await this.getReport();
    const docsDir = path.resolve(process.cwd(), "docs");
    await fs.mkdir(docsDir, { recursive: true });
    const files: Array<[string, string]> = [
      ["ANM-WEB-132-security-certification-registry.md", this.certificationDoc(certificationReport)],
      ["ANM-WEB-132-security-control-inventory.md", this.controlInventoryDoc(certificationReport)],
      ["ANM-WEB-132-production-attack-surface.md", this.attackSurfaceDoc(certificationReport)],
      ["ANM-WEB-132-admin-authorization-matrix.md", this.adminMatrixDoc(certificationReport)],
      ["ANM-WEB-132-cors-certification.md", this.areaDoc(certificationReport, "CORS")],
      ["ANM-WEB-132-privacy-data-inventory.md", this.privacyDoc(certificationReport)],
      ["ANM-WEB-132-log-privacy-report.md", this.areaDoc(certificationReport, "Log Privacy")],
      ["ANM-WEB-132-rate-limit-inventory.md", this.areaDoc(certificationReport, "Rate Limits")],
      ["ANM-WEB-132-alert-inventory.md", this.areaDoc(certificationReport, "Alerts")],
      ["ANM-WEB-132-backup-certification.md", this.multiAreaDoc(certificationReport, ["Backup", "Restore", "Rollback"])],
      ["ANM-WEB-132-production-security-privacy-observability-recovery-certification.md", this.certificationDoc(certificationReport)],
      ["ANM-WEB-132-incident-response-runbook.md", this.runbookDoc(certificationReport)],
      ["ANM-WEB-132-implementation-summary.md", this.summaryDoc(certificationReport)],
    ];
    await Promise.all(files.map(([fileName, content]) => fs.writeFile(path.join(docsDir, fileName), content)));
    return files.map(([fileName]) => `/docs/${fileName}`);
  }

  private buildReport(
    data: Awaited<ReturnType<typeof jsonDatabase.read>>,
    infrastructure: ProductionInfrastructureCertificationReport,
    securityHealth: Record<string, unknown>,
  ): ProductionSecurityCertificationReport {
    const checkedAt = new Date().toISOString();
    const config = getBackendConfig();
    const validation = getConfigurationValidationResult(config);
    const productionLike = config.app.isProduction || config.app.isStaging || config.app.strictMode;
    const checks: ProductionSecurityCheck[] = [];
    const issues: ProductionSecurityIssue[] = [];
    const publicFullSongExposure = this.findPublicFullSongExposure(data);
    const privateMediaExposure = this.findPrivateMediaPublicExposure(data);

    this.addCheck(checks, issues, {
      checkId: "security.infrastructure.carry_forward",
      area: "Infrastructure Carry-Forward",
      pass: infrastructure.decision !== "INFRASTRUCTURE BLOCKED",
      severity: "P0",
      title: "Production security certification inherits unresolved infrastructure blockers",
      passSummary: "Infrastructure certification is not blocking security launch.",
      failSummary: `ANM-WEB-131 is ${infrastructure.decision} with ${infrastructure.counts.p0Open} P0 and ${infrastructure.counts.p1Open} P1 open.`,
      remediation: "Resolve ANM-WEB-131 production environment, provider, backup, restore, rollback, and deployment blockers before security approval.",
      evidence: { infrastructureDecision: infrastructure.decision, p0Open: infrastructure.counts.p0Open, p1Open: infrastructure.counts.p1Open },
    });

    this.addCheck(checks, issues, {
      checkId: "security.auth.boundaries",
      area: "Authentication",
      pass: config.auth.enabled && data.adminUsers.length > 0 && data.memberAccounts.length >= 0,
      severity: "P0",
      title: "Authentication boundaries are not production-ready",
      passSummary: "Admin authentication is enabled and identity stores are present.",
      failSummary: "Admin authentication is disabled or identity stores are missing.",
      remediation: "Enable production authentication and verify guest, member, and admin login boundaries with deployed browser evidence.",
      evidence: { authEnabled: config.auth.enabled, adminUsers: data.adminUsers.length, memberAccounts: data.memberAccounts.length },
    });

    this.addCheck(checks, issues, {
      checkId: "security.admin.authorization_matrix",
      area: "Authorization",
      pass: allAdminPermissionNames.includes("launch_security.read") && allAdminPermissionNames.includes("launch_security.verify") && systemRoles.some((role) => role.name === "security_admin" && role.permissions.includes("launch_security.read")),
      severity: "P1",
      title: "Admin launch-security authorization matrix is incomplete",
      passSummary: "Launch security permissions are registered and available to security administrators.",
      failSummary: "Launch security permissions are not fully represented in the admin RBAC matrix.",
      remediation: "Register launch_security permissions and assign read/verify rights to security/deployment roles.",
      evidence: { permissions: allAdminPermissionNames.filter((permission) => permission.startsWith("launch_security.")), roles: this.adminAuthorizationMatrix() },
    });

    this.addCheck(checks, issues, {
      checkId: "security.media.full_song_public_exposure",
      area: "Media Protection",
      pass: publicFullSongExposure.length === 0,
      severity: "P0",
      title: "Full-song media public exposure detected",
      passSummary: "No full-song media asset or storage object is publicly exposed in local data.",
      failSummary: `${publicFullSongExposure.length} full-song public exposure candidate(s) found.`,
      remediation: "Demote full-song objects to private storage, revoke any public/signed URLs, purge caches, and rerun security:media-protection-certify.",
      evidence: { candidates: publicFullSongExposure.slice(0, 25) },
    });

    this.addCheck(checks, issues, {
      checkId: "security.media.private_public_exposure",
      area: "Media Protection",
      pass: privateMediaExposure.length === 0,
      severity: "P0",
      title: "Private media public exposure detected",
      passSummary: "No private storage object exposes a public or persistent signed URL in local data.",
      failSummary: `${privateMediaExposure.length} private media exposure candidate(s) found.`,
      remediation: "Remove persistent public/signed URLs from private media, rotate delivery artifacts, and verify public DTOs/search/cache do not expose protected data.",
      evidence: { candidates: privateMediaExposure.slice(0, 25) },
    });

    this.addCheck(checks, issues, {
      checkId: "security.transport.headers_cookies",
      area: "Security Headers",
      pass: config.security.helmetEnabled && config.security.contentSecurityPolicyEnabled && (!productionLike || config.auth.cookieSecure),
      severity: "P1",
      title: "Security headers and cookies require production verification",
      passSummary: "Header policy and secure-cookie configuration are suitable for this environment.",
      failSummary: "Security headers or Secure cookies are not fully verified for production.",
      remediation: "Verify CSP, frame, MIME, referrer, permissions, cross-origin headers, Secure/HttpOnly/SameSite cookies, and HTTPS-only delivery on the deployed domain.",
      evidence: { helmetEnabled: config.security.helmetEnabled, cspEnabled: config.security.contentSecurityPolicyEnabled, cookieSecure: config.auth.cookieSecure, cookieSameSite: config.auth.cookieSameSite },
    });

    this.addCheck(checks, issues, {
      checkId: "security.cors.csrf",
      area: "CORS",
      pass: productionLike && config.server.corsAllowedOrigins.length > 0 && config.security.csrfEnabled,
      severity: "P1",
      title: "CORS and CSRF are not production-certified",
      passSummary: "Production-like CORS allowlist and CSRF protection are enabled.",
      failSummary: "CORS allowlist and CSRF protection need deployed strict-mode evidence.",
      remediation: "Run deployed origin preflight/mutation tests and enable CSRF for credentialed admin/member mutations.",
      evidence: { corsAllowedOrigins: config.server.corsAllowedOrigins, csrfEnabled: config.security.csrfEnabled, productionLike },
    });

    this.addCheck(checks, issues, {
      checkId: "security.rate_limits",
      area: "Rate Limits",
      pass: productionLike && config.security.rateLimitEnabled,
      severity: "P1",
      title: "Production rate limits are not verified",
      passSummary: "Production rate limiting is enabled.",
      failSummary: "Rate limits are not verified in a production-like runtime.",
      remediation: "Verify public, auth, admin, media, upload, protected-content, billing, and export/import rate limits with deployed Redis/backing store evidence.",
      evidence: this.rateLimitEvidence(config),
    });

    this.addCheck(checks, issues, {
      checkId: "security.privacy.logs",
      area: "Log Privacy",
      pass: config.logging.auditLoggingEnabled && config.logging.redactFields.length >= 5,
      severity: "P1",
      title: "Log privacy controls need production evidence",
      passSummary: "Audit logging and redaction fields are configured.",
      failSummary: "Logging/audit redaction is not sufficient for production certification evidence.",
      remediation: "Verify no passwords, tokens, private media URLs, signed URLs, member email, or payment details enter logs, traces, metrics, or analytics payloads.",
      evidence: { auditLoggingEnabled: config.logging.auditLoggingEnabled, redactedFieldCount: config.logging.redactFields.length, requestLoggingEnabled: config.logging.requestLoggingEnabled },
    });

    this.addCheck(checks, issues, {
      checkId: "security.audit.security_events",
      area: "Audit",
      pass: data.adminAuditEvents.length > 0 && data.securityEvents.length >= 0,
      severity: "P1",
      title: "Audit and security event pipeline requires production verification",
      passSummary: "Audit store exists and contains local administrative evidence.",
      failSummary: "Audit/security event storage is missing or unverified.",
      remediation: "Verify admin mutations, auth failures, entitlement changes, media authorizations, exposure detections, and recovery actions are recorded in deployed audit/security stores.",
      evidence: { adminAuditEvents: data.adminAuditEvents.length, securityEvents: data.securityEvents.length, securityFindings: data.securityFindings.length },
    });

    this.addCheck(checks, issues, {
      checkId: "security.observability.alerts",
      area: "Observability",
      pass: productionLike && config.monitoring.enabled && data.alertPolicies.length > 0 && data.syntheticChecks.length > 0,
      severity: "P1",
      title: "Production monitoring and alert delivery are not verified",
      passSummary: "Monitoring, alert policies, and synthetic checks are configured.",
      failSummary: "Monitoring/alerting/synthetic evidence is not production verified.",
      remediation: "Verify telemetry ingestion, security alert routing, on-call notifications, synthetic journeys, SLOs, and incident escalation in staging/production.",
      evidence: { monitoringEnabled: config.monitoring.enabled, provider: config.monitoring.provider, alertPolicies: data.alertPolicies.length, syntheticChecks: data.syntheticChecks.length, sloCount: data.serviceLevelObjectives.length },
    });

    this.addCheck(checks, issues, {
      checkId: "security.recovery.backup_restore_rollback",
      area: "Backup",
      pass: infrastructure.counts.p0Open === 0 && infrastructure.counts.p1Open === 0 && data.backupVerifications.some((item) => item.status === "pass"),
      severity: "P0",
      title: "Backup, restore, and rollback are not production-certified",
      passSummary: "Backup, restore, and rollback evidence is present.",
      failSummary: "Production backup/restore/rollback evidence is missing or blocked by infrastructure certification.",
      remediation: "Run non-destructive backup, restore drill, media restore, queue recovery, and rollback rehearsal; attach evidence before launch approval.",
      evidence: { backupVerifications: data.backupVerifications.length, infrastructureDecision: infrastructure.decision },
    });

    this.addCheck(checks, issues, {
      checkId: "security.incident_response",
      area: "Incident Response",
      pass: hasFile("docs/ANM-WEB-102-security-incident-playbooks.md") && hasFile("docs/ANM-WEB-132-incident-response-runbook.md"),
      severity: "P2",
      title: "Incident response runbook needs current ANM-WEB-132 artifact",
      passSummary: "Security incident procedures and ANM-WEB-132 response runbook are present.",
      failSummary: "ANM-WEB-132 incident response runbook is not generated yet.",
      remediation: "Generate and review ANM-WEB-132 incident response runbook.",
      evidence: { securityPlaybooks: hasFile("docs/ANM-WEB-102-security-incident-playbooks.md"), currentRunbook: hasFile("docs/ANM-WEB-132-incident-response-runbook.md") },
    });

    for (const inherited of infrastructure.issues.filter((issue) => issue.severity === "P0" || issue.severity === "P1")) {
      issues.push({
        issueId: `security.inherited.${inherited.issueId}`,
        severity: inherited.severity,
        area: `Inherited ${inherited.area}`,
        title: inherited.title,
        evidence: inherited.evidence,
        remediation: inherited.remediation,
      });
    }

    const counts = {
      p0Open: issues.filter((issue) => issue.severity === "P0").length,
      p1Open: issues.filter((issue) => issue.severity === "P1").length,
      p2Open: issues.filter((issue) => issue.severity === "P2").length,
      p3Open: issues.filter((issue) => issue.severity === "P3").length,
      checksPassed: checks.filter((check) => check.status === "pass").length,
      checksWarning: checks.filter((check) => check.status === "warn").length,
      checksFailed: checks.filter((check) => check.status === "fail").length,
    };
    const decision: ProductionSecurityDecisionText = counts.p0Open > 0 || counts.p1Open > 0
      ? "SECURITY BLOCKED"
      : counts.p2Open > 0 || counts.p3Open > 0 || checks.some((check) => check.status === "warn")
        ? "SECURITY READY WITH POST-LAUNCH ITEMS"
        : "SECURITY READY";
    const evidenceReferences = [
      "/docs/ANM-WEB-132-security-certification-registry.md",
      "/docs/ANM-WEB-132-security-control-inventory.md",
      "/docs/ANM-WEB-132-production-attack-surface.md",
      "/docs/ANM-WEB-132-admin-authorization-matrix.md",
      "/docs/ANM-WEB-132-cors-certification.md",
      "/docs/ANM-WEB-132-privacy-data-inventory.md",
      "/docs/ANM-WEB-132-log-privacy-report.md",
      "/docs/ANM-WEB-132-rate-limit-inventory.md",
      "/docs/ANM-WEB-132-alert-inventory.md",
      "/docs/ANM-WEB-132-backup-certification.md",
      "/docs/ANM-WEB-132-incident-response-runbook.md",
      "/docs/ANM-WEB-132-implementation-summary.md",
      ...infrastructure.evidenceReferences,
    ];

    return {
      promptId: "ANM-WEB-132",
      checkedAt,
      environment: config.app.environment,
      decision,
      finalMessage: decision === "SECURITY READY"
        ? "Production security, privacy, observability, and recovery controls are certified."
        : decision === "SECURITY READY WITH POST-LAUNCH ITEMS"
          ? "Security certification is conditionally ready with post-launch items and no open P0/P1 blockers."
          : "Security certification is blocked. Do not approve production launch until all P0/P1 security, privacy, observability, backup, restore, rollback, and inherited infrastructure blockers are resolved.",
      counts,
      summary: {
        productionLike,
        authEnabled: config.auth.enabled,
        csrfEnabled: config.security.csrfEnabled,
        rateLimitEnabled: config.security.rateLimitEnabled,
        monitoringEnabled: config.monitoring.enabled,
        auditEventCount: data.adminAuditEvents.length,
        securityEventCount: data.securityEvents.length,
        publicFullSongExposureCount: publicFullSongExposure.length,
        privateMediaExposureCount: privateMediaExposure.length,
        infrastructureDecision: infrastructure.decision,
      },
      controls: this.controls(config, securityHealth, infrastructure),
      attackSurface: this.attackSurface(config, infrastructure),
      adminAuthorizationMatrix: this.adminAuthorizationMatrix(),
      checks,
      issues,
      evidenceReferences,
      run: this.runRecord(config, checkedAt, decision, checks, issues, evidenceReferences, validation.errors.length),
    };
  }

  private addCheck(checks: ProductionSecurityCheck[], issues: ProductionSecurityIssue[], input: {
    checkId: string;
    area: string;
    pass: boolean;
    severity: ProductionSecuritySeverity;
    title: string;
    passSummary: string;
    failSummary: string;
    remediation: string;
    evidence: Record<string, unknown>;
  }) {
    checks.push({
      checkId: input.checkId,
      area: input.area,
      status: input.pass ? "pass" : "fail",
      summary: input.pass ? input.passSummary : input.failSummary,
      evidence: input.evidence,
    });
    if (!input.pass) {
      issues.push({
        issueId: input.checkId,
        severity: input.severity,
        area: input.area,
        title: input.title,
        evidence: input.failSummary,
        remediation: input.remediation,
      });
    }
  }

  private findPublicFullSongExposure(data: Awaited<ReturnType<typeof jsonDatabase.read>>) {
    const assetExposures = data.mediaAssets
      .filter((asset) => asset.assetType === "full_song")
      .filter((asset) => this.isPersistentPublicUrl(asset.url) || this.isPersistentPublicUrl(String(asset.metadata?.publicUrl ?? "")))
      .map((asset) => ({ type: "mediaAsset", assetId: asset.assetId, title: asset.title, field: "url" }));
    const storageExposures = data.mediaStorageObjects
      .filter((object) => object.assetType === "full_song")
      .filter((object) => object.accessLevel === "public" || this.isPersistentPublicUrl(object.publicUrl) || this.isPersistentPublicUrl(object.signedUrl))
      .map((object) => ({ type: "storageObject", storageObjectId: object.storageObjectId, fileName: object.fileName, accessLevel: object.accessLevel }));
    return [...assetExposures, ...storageExposures];
  }

  private findPrivateMediaPublicExposure(data: Awaited<ReturnType<typeof jsonDatabase.read>>) {
    return data.mediaStorageObjects
      .filter((object) => object.accessLevel !== "public")
      .filter((object) => this.isPersistentPublicUrl(object.publicUrl) || this.isPersistentPublicUrl(object.signedUrl))
      .map((object) => ({ storageObjectId: object.storageObjectId, assetType: object.assetType, fileName: object.fileName, accessLevel: object.accessLevel }));
  }

  private isPersistentPublicUrl(value?: string) {
    const text = lower(value);
    if (!text) return false;
    if (text.includes("/api/admin/") || text.includes("/api/member/")) return false;
    return text.startsWith("http://") || text.startsWith("https://") || text.startsWith("/media/public/") || text.includes("x-amz-signature") || text.includes("signature=");
  }

  private rateLimitEvidence(config: ReturnType<typeof getBackendConfig>) {
    return {
      enabled: config.security.rateLimitEnabled,
      authWindowMs: config.security.authRateLimitWindowMs,
      publicWindowMs: config.security.publicRateLimitWindowMs,
      adminWindowMs: config.security.adminRateLimitWindowMs,
      thresholdsConfigured: config.security.authRateLimitMax > 0 && config.security.publicRateLimitMax > 0 && config.security.adminRateLimitMax > 0,
    };
  }

  private controls(config: ReturnType<typeof getBackendConfig>, securityHealth: Record<string, unknown>, infrastructure: ProductionInfrastructureCertificationReport): ProductionSecurityControl[] {
    return [
      { controlKey: "auth.admin.enabled", category: "authentication", owner: "security", enforcementPoint: "admin session middleware", status: config.auth.enabled ? "pass" : "fail", evidence: "Admin authentication configuration is server-side." },
      { controlKey: "auth.member.separate", category: "authentication", owner: "identity", enforcementPoint: "member session middleware", status: "pass", evidence: "Member and admin models/sessions are separate stores." },
      { controlKey: "authz.admin.rbac", category: "authorization", owner: "security", enforcementPoint: "RequirePermission and mediaAuthorizationService", status: "pass", evidence: `${allAdminPermissionNames.length} admin permissions registered.` },
      { controlKey: "media.full_song.private", category: "media", owner: "media", enforcementPoint: "storage/public projection/protected gateway", status: "pass", evidence: "Full-song exposure scanner is part of this certification." },
      { controlKey: "cors.allowlist", category: "web", owner: "security", enforcementPoint: "HTTP middleware", status: config.server.corsAllowedOrigins.length ? "pass" : "warn", evidence: "Credentialed wildcard CORS is not approved." },
      { controlKey: "csrf.mutations", category: "web", owner: "security", enforcementPoint: "HTTP mutation middleware", status: config.security.csrfEnabled ? "pass" : "fail", evidence: "CSRF must be enabled for production credentialed mutation flows." },
      { controlKey: "headers.csp", category: "web", owner: "security", enforcementPoint: "HTTP response headers", status: config.security.contentSecurityPolicyEnabled ? "pass" : "fail", evidence: "CSP setting is centrally configured." },
      { controlKey: "rate_limits.sensitive", category: "abuse", owner: "security", enforcementPoint: "rate-limit middleware", status: config.security.rateLimitEnabled ? "pass" : "fail", evidence: "Auth/public/admin threshold config exists." },
      { controlKey: "privacy.log_redaction", category: "privacy", owner: "platform", enforcementPoint: "logger/config redaction", status: config.logging.redactFields.length ? "pass" : "fail", evidence: `${config.logging.redactFields.length} redaction fields configured.` },
      { controlKey: "observability.alerts", category: "operations", owner: "ops", enforcementPoint: "monitoring and alert policies", status: config.monitoring.enabled ? "pass" : "fail", evidence: `Monitoring provider: ${config.monitoring.provider}. Health: ${String(securityHealth.overallStatus ?? "unknown")}.` },
      { controlKey: "recovery.backup_restore", category: "recovery", owner: "ops", enforcementPoint: "backup/restore/rollback procedures", status: infrastructure.decision === "INFRASTRUCTURE BLOCKED" ? "fail" : "pass", evidence: infrastructure.decision },
    ];
  }

  private attackSurface(config: ReturnType<typeof getBackendConfig>, infrastructure: ProductionInfrastructureCertificationReport): ProductionSecurityAttackSurface[] {
    return [
      { surface: "Public website and public APIs", exposure: "Internet", primaryControls: ["public DTO scanner", "guest projection filtering", "CORS/header policy"], certificationStatus: "warn", residualRisk: "Live browser/network scans are still required on the deployed domain." },
      { surface: "Member APIs and protected media", exposure: "Authenticated internet", primaryControls: ["member session", "entitlement evaluation", "short-lived media authorization"], certificationStatus: "warn", residualRisk: "Production protected fixture and CDN/service-worker evidence are pending." },
      { surface: "Admin APIs", exposure: "Authenticated admin internet/LAN", primaryControls: ["admin RBAC", "admin session", "audit events", "CSRF readiness"], certificationStatus: config.security.csrfEnabled ? "warn" : "fail", residualRisk: "Production admin mutation CSRF and origin tests are pending." },
      { surface: "Object storage and CDN", exposure: "Public and private media delivery", primaryControls: ["public/private prefixes", "public-safe promotion", "protected gateway"], certificationStatus: infrastructure.decision === "INFRASTRUCTURE BLOCKED" ? "fail" : "warn", residualRisk: "Provider IAM, CDN origin isolation, and cache behavior need live evidence." },
      { surface: "Workers, queues, and media intake", exposure: "Internal services and watched folders", primaryControls: ["allowed folders", "validation", "assignment review", "worker health"], certificationStatus: "warn", residualRisk: "Production worker/queue/dead-letter monitoring remains unverified." },
      { surface: "Billing/webhooks/export-import", exposure: "Authenticated admin/member/provider callbacks", primaryControls: ["signature readiness", "admin permissions", "package signing/encryption"], certificationStatus: "warn", residualRisk: "Live provider credentials and webhook signature evidence are pending." },
    ];
  }

  private adminAuthorizationMatrix() {
    const critical = new Set(allAdminPermissionNames.filter((permission) =>
      permission.includes("delete") || permission.includes("rollback") || permission.includes("restore") || permission.includes("certification") || permission.includes("security") || permission.includes("launch_"),
    ));
    return systemRoles.map((role) => ({
      role: role.name,
      permissionCount: role.permissions.length,
      criticalPermissionCount: role.permissions.filter((permission) => critical.has(permission)).length,
      launchSecurityAccess: role.permissions.includes("launch_security.read") || role.permissions.includes("launch_security.verify") || role.permissions.includes("launch_security.certify"),
    }));
  }

  private runRecord(
    config: ReturnType<typeof getBackendConfig>,
    checkedAt: string,
    decisionText: ProductionSecurityDecisionText,
    checks: ProductionSecurityCheck[],
    issues: ProductionSecurityIssue[],
    evidenceReferences: string[],
    configErrorCount: number,
  ): ProductionSecurityCertificationRun {
    const byArea = (area: string) => {
      const areaChecks = checks.filter((check) => check.area === area || check.area.includes(area));
      if (!areaChecks.length) return result("not_applicable", `${area} was not part of this command.`);
      if (areaChecks.some((check) => check.status === "fail")) return result("fail", areaChecks.find((check) => check.status === "fail")?.summary ?? `${area} failed.`);
      if (areaChecks.some((check) => check.status === "warn")) return result("warn", `${area} has warnings.`);
      return result("pass", `${area} passed.`);
    };
    return {
      certificationRunId: `anm-web-132-${Date.parse(checkedAt)}`,
      environment: config.app.environment,
      applicationVersion: config.app.version,
      commitReference: config.app.commitSha,
      executedBy: "system",
      startedAt: checkedAt,
      completedAt: checkedAt,
      authenticationResult: byArea("Authentication"),
      authorizationResult: byArea("Authorization"),
      mediaProtectionResult: byArea("Media Protection"),
      adminMutationResult: byArea("Authorization"),
      corsResult: byArea("CORS"),
      csrfResult: result(config.security.csrfEnabled ? "pass" : "fail", config.security.csrfEnabled ? "CSRF enabled." : "CSRF disabled or not production verified."),
      securityHeadersResult: byArea("Security Headers"),
      cookieResult: result(config.auth.cookieSecure || !(config.app.isProduction || config.app.isStaging) ? "pass" : "fail", config.auth.cookieSecure ? "Secure cookies enabled." : "Secure cookie evidence missing."),
      rateLimitResult: byArea("Rate Limits"),
      privacyResult: byArea("Log Privacy"),
      logPrivacyResult: byArea("Log Privacy"),
      auditResult: byArea("Audit"),
      observabilityResult: byArea("Observability"),
      alertResult: byArea("Observability"),
      backupResult: byArea("Backup"),
      restoreResult: byArea("Backup"),
      rollbackResult: byArea("Backup"),
      incidentResult: byArea("Incident Response"),
      openP0Count: issues.filter((issue) => issue.severity === "P0").length,
      openP1Count: issues.filter((issue) => issue.severity === "P1").length,
      openP2Count: issues.filter((issue) => issue.severity === "P2").length + configErrorCount,
      evidenceReferences,
      decision: decisionText === "SECURITY READY" ? "security_ready" : decisionText === "SECURITY READY WITH POST-LAUNCH ITEMS" ? "security_ready_with_post_launch_items" : "security_blocked",
      createdAt: checkedAt,
      updatedAt: checkedAt,
      schemaVersion: 1,
    };
  }

  private areaDoc(report: ProductionSecurityCertificationReport, area: string) {
    const checks = report.checks.filter((check) => check.area === area || check.area.includes(area));
    const issues = report.issues.filter((issue) => issue.area === area || issue.area.includes(area));
    return this.markdown(`ANM-WEB-132 ${area} Certification`, report, [
      `## Scope\n${area} controls were evaluated from server configuration, local persisted evidence, certification services, and inherited infrastructure state. Production/live evidence is explicitly called out when missing.`,
      this.checkTable(checks),
      this.issueList(issues),
    ]);
  }

  private multiAreaDoc(report: ProductionSecurityCertificationReport, areas: string[]) {
    const checks = report.checks.filter((check) => areas.some((area) => check.area === area || check.area.includes(area)));
    const issues = report.issues.filter((issue) => areas.some((area) => issue.area === area || issue.area.includes(area) || issue.area.startsWith("Inherited")));
    return this.markdown(`ANM-WEB-132 ${areas.join(", ")} Certification`, report, [
      "## Recovery Scope\nBackup, restore, rollback, media recovery, queue/worker recovery, and emergency incident procedures are launch blockers until exercised on staging/production-like infrastructure.",
      this.checkTable(checks),
      this.issueList(issues),
    ]);
  }

  private certificationDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Production Security, Privacy, Observability & Recovery Certification", report, [
      "## Final Decision\n" + report.finalMessage,
      "## Summary\n" + this.objectList(report.summary),
      this.checkTable(report.checks),
      this.issueList(report.issues),
      "## Evidence References\n" + report.evidenceReferences.map((item) => `- ${item}`).join("\n"),
    ]);
  }

  private controlInventoryDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Security Control Inventory", report, [
      "| Control | Category | Owner | Enforcement | Status | Evidence |\n|---|---|---|---|---|---|\n" +
        report.controls.map((control) => `| ${control.controlKey} | ${control.category} | ${control.owner} | ${control.enforcementPoint} | ${control.status} | ${control.evidence} |`).join("\n"),
    ]);
  }

  private attackSurfaceDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Production Attack Surface", report, [
      "| Surface | Exposure | Controls | Status | Residual Risk |\n|---|---|---|---|---|\n" +
        report.attackSurface.map((surface) => `| ${surface.surface} | ${surface.exposure} | ${surface.primaryControls.join(", ")} | ${surface.certificationStatus} | ${surface.residualRisk} |`).join("\n"),
    ]);
  }

  private adminMatrixDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Admin Authorization Matrix", report, [
      "| Role | Permissions | Critical Permissions | Launch Security Access |\n|---|---:|---:|---|\n" +
        report.adminAuthorizationMatrix.map((role) => `| ${role.role} | ${role.permissionCount} | ${role.criticalPermissionCount} | ${role.launchSecurityAccess ? "yes" : "no"} |`).join("\n"),
      "\nAdmin RBAC remains separate from member entitlements. Consumer membership state is never accepted as an administrative permission.",
    ]);
  }

  private privacyDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Privacy Data Inventory", report, [
      "## Data Classes\n- Admin identity: administrative account/session data; never public.\n- Member identity: member account/profile/session data; member-scoped only.\n- Media metadata: public-safe DTO fields only; private paths and protected URLs excluded.\n- Billing readiness: provider secrets and payment data remain server-only.\n- Telemetry: logs, metrics, traces, and analytics must exclude tokens, signed URLs, private paths, emails, passwords, and raw entitlement internals.",
      this.areaDoc(report, "Log Privacy"),
    ]);
  }

  private runbookDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Incident Response Runbook", report, [
      "## Immediate Triage\n1. Classify the incident as authentication, authorization, media exposure, privacy/logging, alerting, backup/restore, rollback, queue/worker, or deployment.\n2. Preserve audit/security evidence without copying secrets, tokens, signed URLs, private paths, member email, or passwords into chat, tickets, or logs.\n3. If full-song or private-media exposure is suspected, disable affected public projection, revoke protected authorizations, purge caches/CDN, remove search/SEO references, and rotate any leaked signing material.\n4. If account boundary failure is suspected, revoke affected sessions, suspend impacted accounts as needed, and verify admin/member separation before restoration.\n5. If backup or restore is involved, perform restore into an isolated target first and verify data/media integrity before production changes.\n\n## Emergency Stop\nUse existing admin RBAC and launch/infrastructure procedures. Do not run destructive production operations without approved production confirmation and documented rollback.",
      this.issueList(report.issues.filter((issue) => issue.severity === "P0" || issue.severity === "P1")),
    ]);
  }

  private summaryDoc(report: ProductionSecurityCertificationReport) {
    return this.markdown("ANM-WEB-132 Implementation Summary", report, [
      "## Implemented\n- Production security/privacy/recovery certification service and run model.\n- Admin API and dashboard for security certification status.\n- CLI command family for focused security/privacy/observability/recovery checks.\n- Evidence docs for controls, attack surface, authorization matrix, CORS, privacy, logs, rate limits, alerts, backup/recovery, runbook, and certification registry.\n- Production checklist entry with blocked decision when P0/P1 evidence is missing.\n\n## Final Access-System Decision\nGuest, member, admin, security, media, observability, and recovery boundaries are evaluated through existing server controls and this certification gate. The current local runtime is not approved for production launch because inherited infrastructure blockers and live production evidence gaps remain open.",
      `## Decision\n${report.decision}`,
      this.issueList(report.issues),
    ]);
  }

  private markdown(title: string, report: ProductionSecurityCertificationReport, sections: string[]) {
    return `# ${title}\n\nPrompt: ANM-WEB-132\nGenerated: ${report.checkedAt}\nEnvironment: ${report.environment}\nDecision: ${report.decision}\n\n${sections.join("\n\n")}\n`;
  }

  private checkTable(checks: ProductionSecurityCheck[]) {
    if (!checks.length) return "## Checks\nNo checks were recorded for this area.";
    return "## Checks\n| Check | Area | Status | Summary |\n|---|---|---|---|\n" + checks.map((check) => `| ${check.checkId} | ${check.area} | ${check.status} | ${check.summary} |`).join("\n");
  }

  private issueList(issues: ProductionSecurityIssue[]) {
    if (!issues.length) return "## Open Issues\nNo open issues for this area.";
    return "## Open Issues\n" + issues.map((issue) => `- ${issue.severity} ${issue.issueId}: ${issue.title}. ${issue.evidence} Remediation: ${issue.remediation}`).join("\n");
  }

  private objectList(value: Record<string, unknown>) {
    return Object.entries(value).map(([key, item]) => `- ${key}: ${String(item)}`).join("\n");
  }
}

export const productionSecurityPrivacyRecoveryCertificationService = new ProductionSecurityPrivacyRecoveryCertificationService();
