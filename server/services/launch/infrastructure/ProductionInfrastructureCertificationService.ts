import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../../config/backendConfig";
import { getConfigurationValidationResult } from "../../../config/configValidation";
import { allAdminPermissionNames } from "../../../constants/auth/permissions";
import type { ProductionInfrastructureCertificationResult, ProductionInfrastructureCertificationRun } from "../../../models/launch/ProductionInfrastructureCertificationRunModel";
import { deploymentHealthService } from "../../deployment/DeploymentHealthService";
import { emailDeliveryService } from "../../email/EmailDeliveryService";
import { exportImportHealthService } from "../../exportImport/ExportImportService";
import { jsonDatabase } from "../../media/JsonDatabase";
import { mediaIntakeConfigService } from "../../mediaIntake/MediaIntakeConfigService";
import { mediaWorkerHealthService } from "../../media/MediaWorkerHealthService";
import { productionEnvironmentConfigurationService, type ProductionEnvironmentConfigurationReport } from "../../config/ProductionEnvironmentConfigurationService";

export type ProductionInfrastructureStatus = "pass" | "warn" | "fail" | "not_applicable";
export type ProductionInfrastructureSeverity = "P0" | "P1" | "P2" | "P3";
export type ProductionInfrastructureDecisionText = "INFRASTRUCTURE READY" | "INFRASTRUCTURE READY WITH POST-LAUNCH ITEMS" | "INFRASTRUCTURE BLOCKED";

export interface ProductionInfrastructureCheck {
  checkId: string;
  area: string;
  status: ProductionInfrastructureStatus;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface ProductionInfrastructureIssue {
  issueId: string;
  severity: ProductionInfrastructureSeverity;
  area: string;
  title: string;
  evidence: string;
  remediation: string;
}

export interface ProductionInfrastructureComponent {
  component: string;
  provider: string;
  region: string;
  exposure: string;
  authentication: string;
  healthCheck: string;
  backupStrategy: string;
  scalingModel: string;
  failureImpact: string;
}

export interface ProductionInfrastructureCertificationReport {
  promptId: "ANM-WEB-131";
  checkedAt: string;
  environment: string;
  decision: ProductionInfrastructureDecisionText;
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
    configValid: boolean;
    databaseConfigured: boolean;
    redisConfigured: boolean;
    workersEnabled: boolean;
    storageProvider: string;
    cdnEnabled: boolean;
    emailEnabled: boolean;
    mediaIntakeEnabled: boolean;
    deploymentHealth: string;
  };
  architecture: ProductionInfrastructureComponent[];
  environmentMatrix: ProductionEnvironmentConfigurationReport;
  checks: ProductionInfrastructureCheck[];
  issues: ProductionInfrastructureIssue[];
  evidenceReferences: string[];
  run: ProductionInfrastructureCertificationRun;
}

const result = (status: ProductionInfrastructureStatus, summary: string, evidence?: Record<string, unknown>): ProductionInfrastructureCertificationResult => ({ status, summary, evidence });
const has = (value?: string) => Boolean(value?.trim());
const isHttps = (value?: string) => Boolean(value?.startsWith("https://"));

export class ProductionInfrastructureCertificationService {
  async startCertification(): Promise<ProductionInfrastructureCertificationReport> {
    return this.getReport();
  }

  async getReport(): Promise<ProductionInfrastructureCertificationReport> {
    const [data, deploymentHealth, emailHealth, exportImportHealth, mediaWorkerHealth] = await Promise.all([
      jsonDatabase.read(),
      deploymentHealthService.getHealth().catch((error) => ({ overallStatus: "failed", error: error instanceof Error ? error.message : String(error) })),
      emailDeliveryService.getHealth().catch((error) => ({ overallStatus: "failed", error: error instanceof Error ? error.message : String(error) })),
      exportImportHealthService.getHealthReport().catch((error) => ({ overallStatus: "failed", error: error instanceof Error ? error.message : String(error) })),
      mediaWorkerHealthService.getFullHealthReport().catch((error) => ({ overallStatus: "failed", error: error instanceof Error ? error.message : String(error) })),
    ]);
    return this.buildReport(data, deploymentHealth as Record<string, unknown>, emailHealth as Record<string, unknown>, exportImportHealth as Record<string, unknown>, mediaWorkerHealth as Record<string, unknown>);
  }

  async runEnvironmentChecks() { return (await this.getReport()).run.environmentResult; }
  async runSecretsChecks() { return (await this.getReport()).run.secretsResult; }
  async runDatabaseChecks() { return (await this.getReport()).run.databaseResult; }
  async runMigrationChecks() { return (await this.getReport()).run.migrationResult; }
  async runRedisChecks() { return (await this.getReport()).run.redisResult; }
  async runQueueChecks() { return (await this.getReport()).run.queuesResult; }
  async runWorkerChecks() { return (await this.getReport()).run.workersResult; }
  async runStorageChecks() { return (await this.getReport()).run.storageResult; }
  async runCdnChecks() { return (await this.getReport()).run.cdnResult; }
  async runEmailChecks() { return (await this.getReport()).run.emailResult; }
  async runDnsChecks() { return (await this.getReport()).run.dnsResult; }
  async runTlsChecks() { return (await this.getReport()).run.tlsResult; }
  async runWebSecurityConfigurationChecks() { return (await this.getReport()).run.securityHeadersResult; }
  async runDeploymentChecks() { return (await this.getReport()).run.deploymentResult; }
  async runBackupChecks() { return (await this.getReport()).run.backupResult; }
  async runRestoreChecks() { return (await this.getReport()).run.restoreResult; }
  async runRollbackChecks() { return (await this.getReport()).run.rollbackResult; }
  async runSmokeChecks() { return (await this.getReport()).run.smokeResult; }
  async collectEvidence() { return (await this.getReport()).evidenceReferences; }
  async makeDecision() { return (await this.getReport()).decision; }

  async writeDocumentation(report?: ProductionInfrastructureCertificationReport): Promise<string[]> {
    const certificationReport = report ?? await this.getReport();
    const docsDir = path.resolve(process.cwd(), "docs");
    await fs.mkdir(docsDir, { recursive: true });
    const files: Array<[string, string]> = [
      ["ANM-WEB-131-production-infrastructure-registry.md", this.registryDoc(certificationReport)],
      ["ANM-WEB-131-production-architecture.md", this.architectureDoc(certificationReport)],
      ["ANM-WEB-131-production-environment-matrix.md", this.environmentDoc(certificationReport)],
      ["ANM-WEB-131-secret-management-report.md", this.areaDoc(certificationReport, "Secrets")],
      ["ANM-WEB-131-migration-plan.md", this.migrationDoc(certificationReport)],
      ["ANM-WEB-131-storage-cdn-certification.md", this.multiAreaDoc(certificationReport, ["Storage", "CDN"])],
      ["ANM-WEB-131-email-certification.md", this.areaDoc(certificationReport, "Email")],
      ["ANM-WEB-131-dns-inventory.md", this.dnsInventoryDoc(certificationReport)],
      ["ANM-WEB-131-dns-tls-certification.md", this.multiAreaDoc(certificationReport, ["DNS", "TLS"])],
      ["ANM-WEB-131-deployment-plan.md", this.areaDoc(certificationReport, "Deployment")],
      ["ANM-WEB-131-backup-recovery-plan.md", this.multiAreaDoc(certificationReport, ["Backup", "Restore", "Rollback"])],
      ["ANM-WEB-131-production-rollback-plan.md", this.rollbackDoc(certificationReport)],
      ["ANM-WEB-131-staging-deployment-rehearsal.md", this.areaDoc(certificationReport, "Staging")],
      ["ANM-WEB-131-production-cutover-report.md", this.areaDoc(certificationReport, "Cutover")],
      ["ANM-WEB-131-production-infrastructure-certification.md", this.certificationDoc(certificationReport)],
      ["ANM-WEB-131-post-launch-infrastructure-backlog.md", this.backlogDoc(certificationReport)],
      ["ANM-WEB-131-production-cutover-operations-runbook.md", this.runbookDoc(certificationReport)],
      ["ANM-WEB-131-implementation-summary.md", this.summaryDoc(certificationReport)],
    ];
    await Promise.all(files.map(([fileName, content]) => fs.writeFile(path.join(docsDir, fileName), content)));
    return files.map(([fileName]) => `/docs/${fileName}`);
  }

  private buildReport(
    data: Awaited<ReturnType<typeof jsonDatabase.read>>,
    deploymentHealth: Record<string, unknown>,
    emailHealth: Record<string, unknown>,
    exportImportHealth: Record<string, unknown>,
    mediaWorkerHealth: Record<string, unknown>,
  ): ProductionInfrastructureCertificationReport {
    const checkedAt = new Date().toISOString();
    const config = getBackendConfig();
    const validation = getConfigurationValidationResult(config);
    const environmentMatrix = productionEnvironmentConfigurationService.getReport();
    const productionLike = config.app.isProduction || config.app.isStaging || config.app.strictMode;
    const checks: ProductionInfrastructureCheck[] = [];
    const issues: ProductionInfrastructureIssue[] = [];
    const architecture = this.architecture();

    this.addCheck(checks, issues, {
      checkId: "infra.environment.production_schema",
      area: "Environment",
      pass: validation.valid && productionLike,
      severity: productionLike ? "P0" : "P1",
      title: "Production environment schema is not cutover-ready",
      passSummary: "Production-like environment validation passes.",
      failSummary: productionLike ? "Production-like environment validation has errors." : "Current process is not running with production/staging strict configuration.",
      remediation: "Set APP_ENV=production or staging with strict production variables and rerun production:env-verify.",
      evidence: { environment: validation.environment, strictMode: config.app.strictMode, errorCount: validation.errors.length, warningCount: validation.warnings.length },
    });

    const secretLeakCandidates = this.scanForSecretLeakCandidates();
    this.addCheck(checks, issues, {
      checkId: "infra.secrets.source_scan",
      area: "Secrets",
      pass: secretLeakCandidates.length === 0,
      severity: "P0",
      title: "Potential committed secret material found",
      passSummary: "Repository source scan did not find obvious committed production secret files or private keys.",
      failSummary: `${secretLeakCandidates.length} potential secret artifact(s) require review.`,
      remediation: "Remove committed secret material, rotate affected credentials, and rerun production:secrets-scan.",
      evidence: { candidates: secretLeakCandidates.slice(0, 25) },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.database.production_connection",
      area: "Database",
      pass: productionLike && has(config.database.uri) && !config.database.uri?.includes("localhost") && validation.errors.every((issue) => !issue.field.startsWith("MONGODB")),
      severity: "P0",
      title: "Production database is not verified",
      passSummary: "Production database configuration is present and passes schema validation.",
      failSummary: "Production database connectivity/TLS/authentication is not verified in this environment.",
      remediation: "Configure production MongoDB, run db health/index/integrity checks, and attach backup/restore evidence.",
      evidence: { configured: has(config.database.uri), databaseNameConfigured: has(config.database.databaseName), healthCheckEnabled: config.database.healthCheckEnabled },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.migrations.controlled",
      area: "Migrations",
      pass: false,
      severity: "P1",
      title: "Production migration rehearsal evidence is missing",
      passSummary: "Production migration command and rehearsal evidence are present.",
      failSummary: "Migration inventory exists, but no production/staging migration execution evidence is recorded.",
      remediation: "Run controlled staging migration and production migration with backup evidence before cutover.",
      evidence: { command: "npm run production:migrate", autoMigrate: config.database.autoMigrate },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.redis.production_connection",
      area: "Redis",
      pass: productionLike && has(config.redis.url) && validation.errors.every((issue) => issue.field !== "REDIS_URL"),
      severity: "P1",
      title: "Production Redis is not verified",
      passSummary: "Production Redis configuration is present and passes schema validation.",
      failSummary: "Production Redis connectivity/TLS/namespace is not verified.",
      remediation: "Configure production Redis, verify TLS/authentication, and run queue/session/cache smoke checks.",
      evidence: { configured: has(config.redis.url), tlsRequired: config.redis.tlsRequired, prefix: config.redis.prefix },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.queues.health",
      area: "Queues",
      pass: productionLike && config.processing.workersEnabled && has(config.redis.url),
      severity: "P1",
      title: "Production queue infrastructure is not verified",
      passSummary: "Queue producers/consumers have required production Redis configuration.",
      failSummary: "Production queue creation, consumers, retries, and dead-letter behavior are not verified.",
      remediation: "Run queue health and worker heartbeat checks against production-equivalent Redis.",
      evidence: { workersEnabled: config.processing.workersEnabled, redisConfigured: has(config.redis.url), mediaIntakeEnabled: mediaIntakeConfigService.getConfig().enabled },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.workers.health",
      area: "Workers",
      pass: productionLike && config.processing.workersEnabled,
      severity: "P1",
      title: "Production workers are not verified",
      passSummary: "Worker configuration is enabled for production-like runtime.",
      failSummary: "Background/media worker deployment evidence is missing.",
      remediation: "Deploy worker processes, verify heartbeat/restart policy, and run production:worker-health.",
      evidence: { processing: config.processing, mediaWorkerHealth: this.safeEvidence(mediaWorkerHealth) },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.storage.production_provider",
      area: "Storage",
      pass: productionLike && !["local", "mock"].includes(config.storage.provider) && has(config.storage.bucket) && validation.errors.every((issue) => !issue.field.startsWith("MEDIA_STORAGE")),
      severity: "P0",
      title: "Production object storage is not verified",
      passSummary: "Production object storage provider configuration passes validation.",
      failSummary: "Object storage upload/download/private-master policy is not verified for production.",
      remediation: "Configure S3/R2/Supabase/Firebase storage, verify private/public policies, and run storage/CDN smoke checks.",
      evidence: { provider: config.storage.provider, bucketConfigured: has(config.storage.bucket), publicPrefix: config.storage.publicPrefix, privatePrefix: config.storage.privatePrefix },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.cdn.production",
      area: "CDN",
      pass: productionLike && config.cdn.enabled && isHttps(config.cdn.baseUrl),
      severity: "P1",
      title: "Production CDN is not verified",
      passSummary: "Production CDN base URL is enabled and HTTPS-configured.",
      failSummary: "CDN origin, TLS, cache policy, range requests, and invalidation are not verified.",
      remediation: "Configure CDN hostname/origin/cache policy and run production:cdn-health.",
      evidence: { enabled: config.cdn.enabled, provider: config.cdn.provider, baseUrlConfigured: has(config.cdn.baseUrl), invalidationEnabled: config.cdn.invalidationEnabled },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.email.production_delivery",
      area: "Email",
      pass: productionLike && config.email.enabled && config.email.provider !== "disabled" && Boolean(emailHealth.emailProviderAvailable),
      severity: "P1",
      title: "Production email delivery is not verified",
      passSummary: "Email provider and health checks are configured.",
      failSummary: "Verification/password-reset email delivery has not been proven through a production provider.",
      remediation: "Configure sender domain/provider, verify inbox delivery for verification and reset emails, and attach evidence.",
      evidence: { enabled: config.email.enabled, provider: config.email.provider, fromConfigured: has(config.email.fromAddress), health: this.safeEvidence(emailHealth) },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.dns.production",
      area: "DNS",
      pass: productionLike && isHttps(config.server.publicAppBaseUrl) && isHttps(config.server.publicApiBaseUrl),
      severity: "P0",
      title: "Production DNS/canonical domains are not verified",
      passSummary: "Canonical production URLs are configured with HTTPS.",
      failSummary: "External DNS propagation and canonical host verification are not recorded.",
      remediation: "Verify web/API/CDN/email DNS from external resolvers and update DNS inventory.",
      evidence: { publicAppBaseUrlConfigured: has(config.server.publicAppBaseUrl), apiBaseUrlConfigured: has(config.server.publicApiBaseUrl), adminAppBaseUrlConfigured: has(config.server.adminAppBaseUrl) },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.tls.production",
      area: "TLS",
      pass: false,
      severity: "P0",
      title: "Production TLS is not externally verified",
      passSummary: "Production TLS certificates are valid.",
      failSummary: "TLS certificate chain, hostname, expiry, redirects, and mixed-content checks are not recorded.",
      remediation: "Run production:tls-verify against canonical domains after deployment.",
      evidence: { required: ["public web", "api", "admin", "cdn/media"] },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.web_security",
      area: "Security Headers",
      pass: productionLike && config.security.helmetEnabled && config.security.contentSecurityPolicyEnabled,
      severity: "P1",
      title: "Production security headers are not verified",
      passSummary: "Security headers and CSP are enabled in configuration.",
      failSummary: "Production HTTP security headers/CSP have not been exercised on real hosts.",
      remediation: "Run security header and CSP browser checks on public/admin/member critical paths.",
      evidence: { helmetEnabled: config.security.helmetEnabled, cspEnabled: config.security.contentSecurityPolicyEnabled, rateLimitEnabled: config.security.rateLimitEnabled },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.cors_cookie_csrf",
      area: "CORS/Cookies/CSRF",
      pass: productionLike && config.auth.cookieSecure && config.security.csrfEnabled && !config.server.corsAllowedOrigins.includes("*") && config.server.corsAllowedOrigins.length > 0,
      severity: "P1",
      title: "Production CORS/cookie/CSRF configuration is not verified",
      passSummary: "CORS, secure cookies, and CSRF are configured for production-like runtime.",
      failSummary: "Production CORS/cookie/CSRF behavior is not fully verified.",
      remediation: "Verify exact origins with credentials, secure cookies, logout invalidation, and CSRF mutation denial.",
      evidence: { corsAllowedOrigins: config.server.corsAllowedOrigins, cookieSecure: config.auth.cookieSecure, cookieSameSite: config.auth.cookieSameSite, csrfEnabled: config.security.csrfEnabled },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.deployment.pipeline",
      area: "Deployment",
      pass: false,
      severity: "P0",
      title: "Production deployment/cutover evidence is missing",
      passSummary: "Production deployment pipeline and cutover evidence are complete.",
      failSummary: "No immutable production deployment, health check, smoke, or cutover evidence is recorded.",
      remediation: "Run controlled production deployment workflow only after environment, backup, migration, storage, email, DNS, and rollback gates pass.",
      evidence: { deploymentHealth: this.safeEvidence(deploymentHealth), packageVersion: config.app.version, commitConfigured: has(config.app.commitSha) },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.backup.restore",
      area: "Backup",
      pass: false,
      severity: "P0",
      title: "Production backup evidence is missing",
      passSummary: "Production backup and restore evidence are recorded.",
      failSummary: "Database backup, object-storage recovery, and restore-test evidence are missing.",
      remediation: "Create pre-cutover backup, verify readability/encryption/retention, and run isolated restore test.",
      evidence: { required: ["database backup", "restore test", "media recovery", "configuration backup"] },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.rollback.rehearsal",
      area: "Rollback",
      pass: false,
      severity: "P1",
      title: "Rollback rehearsal evidence is missing",
      passSummary: "Rollback operation and staging rehearsal are verified.",
      failSummary: "Rollback command exists as a guarded workflow, but staging rehearsal evidence is missing.",
      remediation: "Run release A/B rollback rehearsal, verify DB compatibility, workers, login, and public routes.",
      evidence: { command: "npm run production:rollback -- --release=<safe-release-id>" },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.staging.rehearsal",
      area: "Staging",
      pass: false,
      severity: "P1",
      title: "Production-equivalent staging deployment rehearsal is missing",
      passSummary: "Complete staging deployment rehearsal passed.",
      failSummary: "Build/test/backup/migration/deploy/smoke/email/media/rollback staging evidence is missing.",
      remediation: "Execute ANM-WEB-131 phase 82 staging rehearsal and attach evidence.",
      evidence: { requiredSequence: "build, env, backup, migrate, deploy, workers, storage, CDN, email, public/member/admin smoke, rollback" },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.cutover.production",
      area: "Cutover",
      pass: false,
      severity: "P0",
      title: "Production cutover verification is missing",
      passSummary: "Production cutover and post-cutover smoke passed.",
      failSummary: "Production cutover has not been performed or evidenced.",
      remediation: "Do not cut traffic until all P0/P1 gates pass; after cutover run production infrastructure smoke and monitoring window checks.",
      evidence: { required: ["deployment id", "backup reference", "DNS/TLS", "post-cutover smoke", "monitoring window"] },
    });

    this.addCheck(checks, issues, {
      checkId: "infra.export_import.health",
      area: "Export/Import",
      pass: String(exportImportHealth.overallStatus ?? exportImportHealth.status ?? "healthy") !== "failed",
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Export/import infrastructure health is degraded",
      passSummary: "Export/import package health is reachable.",
      failSummary: "Export/import package health is degraded.",
      remediation: "Verify package storage, signing/encryption references, and controlled import staging.",
      evidence: this.safeEvidence(exportImportHealth),
    });

    const p0Open = issues.filter((issue) => issue.severity === "P0").length;
    const p1Open = issues.filter((issue) => issue.severity === "P1").length;
    const p2Open = issues.filter((issue) => issue.severity === "P2").length;
    const p3Open = issues.filter((issue) => issue.severity === "P3").length;
    const decision: ProductionInfrastructureDecisionText = p0Open || p1Open ? "INFRASTRUCTURE BLOCKED" : p2Open || p3Open ? "INFRASTRUCTURE READY WITH POST-LAUNCH ITEMS" : "INFRASTRUCTURE READY";
    const completedAt = new Date().toISOString();
    const evidenceReferences = [
      "/docs/ANM-WEB-131-production-infrastructure-registry.md",
      "/docs/ANM-WEB-131-production-environment-matrix.md",
      "/docs/ANM-WEB-131-production-infrastructure-certification.md",
      "/docs/ANM-WEB-131-implementation-summary.md",
    ];
    const run: ProductionInfrastructureCertificationRun = {
      certificationRunId: `production-infrastructure-${Date.now()}`,
      environment: config.app.environment,
      applicationVersion: config.app.version,
      commitReference: config.app.commitSha,
      executedBy: process.env.USER ?? "system",
      startedAt: checkedAt,
      completedAt,
      environmentResult: this.resultFor(checks, "Environment"),
      secretsResult: this.resultFor(checks, "Secrets"),
      databaseResult: this.resultFor(checks, "Database"),
      migrationResult: this.resultFor(checks, "Migrations"),
      redisResult: this.resultFor(checks, "Redis"),
      queuesResult: this.resultFor(checks, "Queues"),
      workersResult: this.resultFor(checks, "Workers"),
      mediaWorkersResult: this.resultFor(checks, "Workers"),
      storageResult: this.resultFor(checks, "Storage"),
      cdnResult: this.resultFor(checks, "CDN"),
      emailResult: this.resultFor(checks, "Email"),
      dnsResult: this.resultFor(checks, "DNS"),
      tlsResult: this.resultFor(checks, "TLS"),
      securityHeadersResult: this.resultFor(checks, "Security Headers"),
      cookieResult: this.resultFor(checks, "CORS/Cookies/CSRF"),
      corsResult: this.resultFor(checks, "CORS/Cookies/CSRF"),
      csrfResult: this.resultFor(checks, "CORS/Cookies/CSRF"),
      deploymentResult: this.resultFor(checks, "Deployment"),
      backupResult: this.resultFor(checks, "Backup"),
      restoreResult: this.resultFor(checks, "Backup"),
      rollbackResult: this.resultFor(checks, "Rollback"),
      smokeResult: this.resultFor(checks, "Cutover"),
      openP0Count: p0Open,
      openP1Count: p1Open,
      openP2Count: p2Open,
      evidenceReferences,
      decision: decision === "INFRASTRUCTURE READY" ? "infrastructure_ready" : decision === "INFRASTRUCTURE READY WITH POST-LAUNCH ITEMS" ? "infrastructure_ready_with_post_launch_items" : "infrastructure_blocked",
      createdAt: completedAt,
      updatedAt: completedAt,
      schemaVersion: 1,
    };
    return {
      promptId: "ANM-WEB-131",
      checkedAt,
      environment: config.app.environment,
      decision,
      finalMessage: this.finalMessage(decision),
      counts: {
        p0Open,
        p1Open,
        p2Open,
        p3Open,
        checksPassed: checks.filter((check) => check.status === "pass").length,
        checksWarning: checks.filter((check) => check.status === "warn").length,
        checksFailed: checks.filter((check) => check.status === "fail").length,
      },
      summary: {
        productionLike,
        configValid: validation.valid,
        databaseConfigured: has(config.database.uri),
        redisConfigured: has(config.redis.url),
        workersEnabled: config.processing.workersEnabled,
        storageProvider: config.storage.provider,
        cdnEnabled: config.cdn.enabled,
        emailEnabled: config.email.enabled,
        mediaIntakeEnabled: mediaIntakeConfigService.getConfig().enabled,
        deploymentHealth: String(deploymentHealth.overallStatus ?? deploymentHealth.status ?? "unknown"),
      },
      architecture,
      environmentMatrix,
      checks,
      issues,
      evidenceReferences,
      run,
    };
  }

  private scanForSecretLeakCandidates(): string[] {
    const root = process.cwd();
    const candidates: string[] = [];
    for (const file of [".env.production", ".env.local", ".env"]) {
      if (fsSync.existsSync(path.join(root, file))) candidates.push(file);
    }
    const scanRoots = ["src", "server", "scripts", "docs", "dist"];
    const secretPattern = /(-----BEGIN (RSA |EC |OPENSSH |PRIVATE )?PRIVATE KEY-----|mongodb(\+srv)?:\/\/[^/\s:]+:[^@\s]+@|redis:\/\/[^/\s:]+:[^@\s]+@|rediss:\/\/[^/\s:]+:[^@\s]+@|sk_live_[A-Za-z0-9]|SG\.[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9-]+)/;
    const walk = (directory: string) => {
      if (!fsSync.existsSync(directory)) return;
      for (const entry of fsSync.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        if (!/\.(ts|tsx|js|mjs|cjs|json|md|html|css|map)$/.test(entry.name)) continue;
        try {
          const content = fsSync.readFileSync(fullPath, "utf8");
          if (secretPattern.test(content)) candidates.push(path.relative(root, fullPath));
        } catch {
          candidates.push(`${path.relative(root, fullPath)} (scan unreadable)`);
        }
      }
    };
    scanRoots.forEach((scanRoot) => walk(path.join(root, scanRoot)));
    return [...new Set(candidates)].sort();
  }

  private addCheck(
    checks: ProductionInfrastructureCheck[],
    issues: ProductionInfrastructureIssue[],
    input: {
      checkId: string;
      area: string;
      pass: boolean;
      statusWhenFailed?: ProductionInfrastructureStatus;
      severity: ProductionInfrastructureSeverity;
      title: string;
      passSummary: string;
      failSummary: string;
      remediation: string;
      evidence: Record<string, unknown>;
    },
  ) {
    const status = input.pass ? "pass" : input.statusWhenFailed ?? "fail";
    checks.push({ checkId: input.checkId, area: input.area, status, summary: input.pass ? input.passSummary : input.failSummary, evidence: input.evidence });
    if (!input.pass) issues.push({ issueId: input.checkId, severity: input.severity, area: input.area, title: input.title, evidence: input.failSummary, remediation: input.remediation });
  }

  private resultFor(checks: ProductionInfrastructureCheck[], area: string): ProductionInfrastructureCertificationResult {
    const areaChecks = checks.filter((check) => check.area === area);
    if (!areaChecks.length) return result("not_applicable", `${area} is not applicable to this certification run.`);
    const status = areaChecks.some((check) => check.status === "fail") ? "fail" : areaChecks.some((check) => check.status === "warn") ? "warn" : "pass";
    return result(status, areaChecks.map((check) => check.summary).join(" "), { checkIds: areaChecks.map((check) => check.checkId) });
  }

  private architecture(): ProductionInfrastructureComponent[] {
    const config = getBackendConfig();
    return [
      this.component("Public Frontend", "Production web host or static artifact host", config.server.publicAppBaseUrl ?? "pending", "Public HTTPS", "None for public routes; member session for protected routes", "Public smoke + /health/ready via API", "Immutable build artifact retained", "Horizontal web/static scaling", "Public/member experience outage"),
      this.component("Admin Frontend", "Same React app under /admin", config.server.adminAppBaseUrl ?? "pending", "Authenticated HTTPS path", "Admin session + RBAC", "Admin smoke and route refresh", "Immutable build artifact retained", "Same as frontend", "Admin operations blocked"),
      this.component("Backend/API", "Node.js API runtime", config.server.publicApiBaseUrl ?? "pending", "HTTPS API", "Cookie sessions, CSRF, RBAC/entitlements", "/health, /health/ready, /health/live", "Previous release artifact retained", "Horizontal API replicas readiness", "Site/member/admin API outage"),
      this.component("Database", "MongoDB", config.database.databaseName ?? "pending", "Private network", "Connection string secret", "db health/index/integrity", "Snapshot/backup plus restore test", "Managed capacity/pool sizing", "Canonical data unavailable"),
      this.component("Redis/Queues", "Redis/BullMQ", config.redis.prefix, "Private network", "Redis URL secret", "queue and Redis health", "Redis recovery policy; canonical data outside Redis", "Managed memory/concurrency", "Queues, cache, sessions degraded"),
      this.component("Workers", "Node worker processes", config.app.environment, "Private runtime", "Environment secrets", "worker heartbeat", "Redeploy previous worker artifact", "Queue concurrency controls", "Media/email/publication jobs stall"),
      this.component("Object Storage", config.storage.provider, config.storage.region, "Private masters + public derivatives", "Storage credentials secret", "storage health + private/public checks", "Provider durability/versioning/backup policy", "Provider managed", "Media upload/delivery failure"),
      this.component("CDN", config.cdn.provider, config.cdn.baseUrl ?? "pending", "Public HTTPS CDN", "Origin policy/signing where required", "CDN smoke/TLS/range/purge", "Origin fallback/rollback policy", "CDN edge scaling", "Public media unavailable or stale"),
      this.component("Email Provider", config.email.provider, config.email.fromAddress ?? "pending", "Provider API/SMTP", "Email provider secret", "verification/reset delivery test", "Provider logs and retry queue", "Provider rate limits", "Registration/reset blocked"),
      this.component("Observability", config.monitoring.provider, config.monitoring.environment, "Operator-only", "Monitoring DSN/key secret", "observability health", "Log/metric retention policy", "Provider managed", "Reduced incident detection"),
    ];
  }

  private component(component: string, provider: string, region: string, exposure: string, authentication: string, healthCheck: string, backupStrategy: string, scalingModel: string, failureImpact: string): ProductionInfrastructureComponent {
    return { component, provider, region, exposure, authentication, healthCheck, backupStrategy, scalingModel, failureImpact };
  }

  private safeEvidence(value: Record<string, unknown>): Record<string, unknown> {
    return JSON.parse(JSON.stringify(value, (key, raw) => /secret|token|password|apikey|apiKey|dsn|uri|url/i.test(key) && typeof raw === "string" ? "[redacted]" : raw)) as Record<string, unknown>;
  }

  private finalMessage(decision: ProductionInfrastructureDecisionText) {
    if (decision === "INFRASTRUCTURE BLOCKED") return "Production infrastructure cutover is blocked by open P0/P1 infrastructure issues or missing live evidence.";
    if (decision === "INFRASTRUCTURE READY WITH POST-LAUNCH ITEMS") return "Production infrastructure has no P0/P1 blockers; only post-launch infrastructure items remain.";
    return "Production infrastructure is ready for cutover.";
  }

  private frontmatter(title: string, report: ProductionInfrastructureCertificationReport) {
    return `# ${title}\n\nPrompt: ANM-WEB-131\nGenerated: ${report.checkedAt}\nDecision: ${report.decision}\n\n`;
  }

  private registryDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Production Infrastructure Registry", report)}${report.issues.map((issue) => `## ${issue.severity} - ${issue.title}\n\nArea: ${issue.area}\nEvidence: ${issue.evidence}\nRemediation: ${issue.remediation}\n`).join("\n") || "No open infrastructure issues.\n"}\n## Counts\n\n\`\`\`json\n${JSON.stringify(report.counts, null, 2)}\n\`\`\`\n`;
  }

  private architectureDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Production Architecture", report)}| Component | Provider | Region/Endpoint | Exposure | Authentication | Health Check | Backup | Scaling | Failure Impact |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${report.architecture.map((item) => `| ${item.component} | ${item.provider} | ${item.region} | ${item.exposure} | ${item.authentication} | ${item.healthCheck} | ${item.backupStrategy} | ${item.scalingModel} | ${item.failureImpact} |`).join("\n")}\n`;
  }

  private environmentDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Production Environment Matrix", report)}No secret values are included.\n\n| Category | Variable | State | Required | Sensitive | Summary |\n| --- | --- | --- | --- | --- | --- |\n${report.environmentMatrix.variables.map((item) => `| ${item.category} | ${item.name} | ${item.state} | ${item.required ? "yes" : "no"} | ${item.sensitive ? "yes" : "no"} | ${item.summary} |`).join("\n")}\n`;
  }

  private areaDoc(report: ProductionInfrastructureCertificationReport, area: string) {
    return `${this.frontmatter(`${area} Certification`, report)}${report.checks.filter((check) => check.area === area).map((check) => `## ${check.status.toUpperCase()} - ${check.checkId}\n\n${check.summary}\n\nEvidence:\n\n\`\`\`json\n${JSON.stringify(check.evidence, null, 2)}\n\`\`\`\n`).join("\n") || "No checks recorded for this area.\n"}`;
  }

  private multiAreaDoc(report: ProductionInfrastructureCertificationReport, areas: string[]) {
    return `${this.frontmatter(`${areas.join(" / ")} Certification`, report)}${report.checks.filter((check) => areas.includes(check.area)).map((check) => `## ${check.area} - ${check.status.toUpperCase()} - ${check.checkId}\n\n${check.summary}\n\nEvidence:\n\n\`\`\`json\n${JSON.stringify(check.evidence, null, 2)}\n\`\`\`\n`).join("\n") || "No checks recorded.\n"}`;
  }

  private migrationDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Migration Plan", report)}Production migration execution is blocked until pre-migration backup and staging rehearsal evidence exist.\n\n| Migration ID | Description | Backward Compatible | Data Mutation | Expected Duration | Lock Impact | Rollback Method | Verification Query |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| current-release | Use repository migration commands and schema/index checks | pending evidence | pending evidence | pending evidence | pending evidence | restore-from-backup if irreversible | npm run db:migrate:status && npm run db:indexes:check && npm run db:integrity:check |\n`;
  }

  private rollbackDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Production Rollback Plan", report)}Rollback triggers include health failure, authentication failure, public/admin outage, database error spike, media delivery failure, email verification failure, protected-media exposure, migration failure, and critical security issue.\n\nRollback command: \`npm run production:rollback -- --release=<safe-release-id>\`.\n\nIrreversible migrations require restore-from-backup and explicit compatibility review before application rollback.\n`;
  }

  private dnsInventoryDoc(report: ProductionInfrastructureCertificationReport) {
    const config = getBackendConfig();
    const rows = [
      ["Public web", config.server.publicAppBaseUrl ?? "pending", "A/AAAA/CNAME", "deployment platform target", "pending external verification", "provider configured", "production DNS provider"],
      ["Admin path", config.server.adminAppBaseUrl ?? config.server.publicAppBaseUrl ?? "pending", "same as web or separate host", "admin route host", "pending external verification", "provider configured", "production DNS provider"],
      ["API", config.server.publicApiBaseUrl ?? "pending", "A/AAAA/CNAME", "API deployment target", "pending external verification", "provider configured", "production DNS provider"],
      ["CDN/media", config.cdn.baseUrl ?? config.storage.publicBaseUrl ?? "pending", "CNAME", "CDN/provider target", "pending external verification", "provider configured", "CDN provider"],
      ["Email SPF/DKIM/DMARC", config.email.fromAddress ?? "pending", "TXT/CNAME", "email provider records", "pending provider verification", "provider configured", "DNS/email provider"],
    ];
    return `${this.frontmatter("DNS Inventory", report)}No provider secrets or token values are included.\n\n| Purpose | Host | Record Type | Target | Status | TTL | Provider |\n| --- | --- | --- | --- | --- | --- | --- |\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n`;
  }

  private certificationDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Production Infrastructure Certification", report)}${report.finalMessage}\n\n## Summary\n\n\`\`\`json\n${JSON.stringify(report.summary, null, 2)}\n\`\`\`\n\n## Open Issues\n\n- P0: ${report.counts.p0Open}\n- P1: ${report.counts.p1Open}\n- P2: ${report.counts.p2Open}\n- P3: ${report.counts.p3Open}\n`;
  }

  private backlogDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Post-Launch Infrastructure Backlog", report)}P2/P3 candidates: autoscaling optimization, multi-region redundancy, cold-storage automation, blue/green refinement, cost optimization, and advanced DR drills. These do not unblock the current P0/P1 production cutover gates.\n`;
  }

  private runbookDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Production Cutover Operations Runbook", report)}## Verification Commands\n\n\`\`\`bash\nnpm run production:env-verify\nnpm run production:secrets-scan\nnpm run production:db-health\nnpm run production:redis-health\nnpm run production:queue-health\nnpm run production:worker-health\nnpm run production:storage-health\nnpm run production:cdn-health\nnpm run production:email-health\nnpm run production:dns-verify\nnpm run production:tls-verify\nnpm run production:infra-smoke\nnpm run production:certify-infrastructure\n\`\`\`\n\n## Emergency Actions\n\n- Production environment invalid: stop deployment and repair secret/config references.\n- Database unavailable: keep traffic on previous release; do not run migrations.\n- Migration fails: stop promotion, preserve backup, inspect migration lock/state.\n- Storage upload failure: disable media intake/uploads if needed and verify private buckets remain private.\n- Email failure: disable public registration if verification email is launch-required.\n- DNS/TLS invalid: do not cut traffic to canonical host.\n- CORS/cookie failure: roll back config or release; do not use wildcard CORS with credentials.\n- Smoke test failure: keep previous release active and run rollback workflow.\n- Protected media exposure: trigger emergency deny/takedown and rotate affected delivery credentials.\n`;
  }

  private summaryDoc(report: ProductionInfrastructureCertificationReport) {
    return `${this.frontmatter("Implementation Summary", report)}Implemented:\n\n- Production environment configuration matrix service.\n- Production infrastructure certification model and service.\n- Infrastructure readiness API and admin page.\n- Production infrastructure CLI command family.\n- Production architecture, environment, secrets, migration, storage/CDN, email, DNS/TLS, deployment, backup/recovery, rollback, staging rehearsal, cutover, backlog, runbook, and implementation docs.\n- Production launch checklist update.\n\nFinal infrastructure decision: ${report.decision}\n\nP0 found/resolved: ${report.counts.p0Open} open\nP1 found/resolved: ${report.counts.p1Open} open\nP2/P3 deferred: ${report.counts.p2Open + report.counts.p3Open}\n\nResidual risks carried into ANM-WEB-132: production provider connectivity, DNS/TLS evidence, email inbox delivery, backup/restore proof, staging rollback rehearsal, production cutover evidence, and post-cutover monitoring evidence.\n`;
  }
}

export const productionInfrastructureCertificationService = new ProductionInfrastructureCertificationService();
