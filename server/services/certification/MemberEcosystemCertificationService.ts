import fs from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../config/backendConfig";
import { memberIdentityService } from "../members/MemberIdentityService";
import { membershipAccessHealthService } from "../access/MembershipAccessHealthService";
import { protectedContentDeliveryHealthService } from "../protectedContent/ProtectedContentDeliveryHealthService";
import { memberPortalHealthService } from "../memberPortal/MemberPortalHealthService";
import { memberHealthService } from "../memberCrm/MemberCrmServices";
import { billingHealthService, revenueAnalyticsService } from "../billing/BillingServices";
import { productionHealthCheckRegistry } from "../observability/ProductionHealthCheckRegistry";
import { securityLaunchGateService } from "../security/SecurityLaunchGateService";
import { deploymentLaunchChecklistService } from "../deployment/DeploymentLaunchChecklistService";
import { reliabilityReleaseGateService } from "../reliability/ReliabilityReleaseGateService";

export type CertificationStatus = "certified" | "certified_with_warnings" | "blocked";

interface CertificationDomain {
  domain: string;
  status: CertificationStatus;
  summary: string;
  evidence: string[];
  warnings: string[];
  blockers: string[];
}

const docsDir = () => path.resolve(process.cwd(), "docs");
const exists = (relative: string) => fs.existsSync(path.join(docsDir(), relative));

const memberPromptIds = ["ANM-WEB-109", "ANM-WEB-110", "ANM-WEB-111", "ANM-WEB-112", "ANM-WEB-113", "ANM-WEB-114", "ANM-WEB-115", "ANM-WEB-116", "ANM-WEB-117"];

const commandsByDomain: Record<string, string[]> = {
  identity: ["npm run test:auth", "npm run member-auth:verify"],
  membership: ["npm run membership:health", "npm run access:policies-verify", "npm run access:full-song-scan", "npm run access:private-media-scan"],
  protectedMedia: ["npm run protected-content:verify", "npm run protected-content:authorization-test", "npm run protected-content:range-test", "npm run protected-content:download-test"],
  portal: ["npm run member-portal:verify", "npm run member-portal:protected-data-scan", "npm run member-portal:full-song-scan", "npm run member-portal:private-media-scan"],
  engagement: ["npm run member-engagement:verify", "npm run member-engagement:privacy-scan"],
  crm: ["npm run member-crm:verify"],
  billing: ["npm run billing:verify", "npm run billing:webhook-test", "npm run billing:revenue-report"],
  security: ["npm run security:launch-gate", "npm run security:authz-test"],
  observability: ["npm run observability:verify", "npm run launch:certification"],
  build: ["npm run typecheck", "npm run build"],
};

const makeDomain = (input: Omit<CertificationDomain, "status">): CertificationDomain => {
  const warnings = Array.isArray(input.warnings) ? input.warnings : [];
  const blockers = Array.isArray(input.blockers) ? input.blockers : [];
  const status: CertificationStatus = blockers.length ? "blocked" : warnings.length ? "certified_with_warnings" : "certified";
  return { ...input, warnings, blockers, status };
};

export class MemberCertificationService {
  async certify(): Promise<CertificationDomain[]> {
    const [identity, access, protectedMedia, portal, crm, billing] = await Promise.all([
      memberIdentityService.getHealth(),
      membershipAccessHealthService.getHealthReport(),
      protectedContentDeliveryHealthService.getHealthReport(),
      memberPortalHealthService.getHealthReport(),
      memberHealthService.getOverallHealth(),
      billingHealthService.getHealthReport(),
    ]);
    return [
      makeDomain({ domain: "identity", summary: "Registration, verification, login, password recovery, and sessions are implemented.", evidence: commandsByDomain.identity, warnings: [], blockers: identity.overallStatus === "available" ? [] : ["Member identity health is unavailable."] }),
      makeDomain({ domain: "membership", summary: "Membership tiers, entitlements, access policies, projection safety, cache/search partitioning, and assignment sync are implemented.", evidence: commandsByDomain.membership, warnings: access.warnings ?? [], blockers: Array.isArray(access.errors) && access.errors.length ? access.errors : [] }),
      makeDomain({ domain: "protectedMedia", summary: "Protected delivery, stream/download authorization, range support, previews, and private-media safety are implemented.", evidence: commandsByDomain.protectedMedia, warnings: protectedMedia.warnings ?? [], blockers: Array.isArray(protectedMedia.errors) && protectedMedia.errors.length ? protectedMedia.errors : [] }),
      makeDomain({ domain: "portal", summary: "Authenticated member portal, dashboard, profile, preferences, security, sessions, early/exclusive content, and cache safety are implemented.", evidence: commandsByDomain.portal, warnings: portal.warnings ?? [], blockers: portal.overallStatus === "healthy" || portal.overallStatus === "available" ? [] : ["Member portal health is not healthy."] }),
      makeDomain({ domain: "engagement", summary: "Favorites, following, playlists, history, notifications, saved searches, collections, recommendation feedback, and feed are implemented.", evidence: commandsByDomain.engagement, warnings: ["Live email/push notification delivery remains provider-dependent."], blockers: [] }),
      makeDomain({ domain: "crm", summary: "Member search, detail, timeline, support, moderation, risk, session revocation, and reporting are implemented.", evidence: commandsByDomain.crm, warnings: [], blockers: crm.checkedAt ? [] : ["CRM health report did not run."] }),
      makeDomain({ domain: "billing", summary: "Billing plans, checkout, provider abstraction, invoices, payments, refunds, coupons, gifts, webhooks, revenue, and entitlement sync are implemented.", evidence: commandsByDomain.billing, warnings: billing.providerHealth?.stripe?.configured ? [] : ["Stripe production credentials and provider price IDs are not configured in this environment."], blockers: billing.rawCardStorage === "disabled" ? [] : ["Billing raw card storage is not disabled."] }),
    ];
  }
}

export class SecurityCertificationService {
  async certify(): Promise<CertificationDomain> {
    const gate = await securityLaunchGateService.evaluate();
    return makeDomain({
      domain: "security",
      summary: "Authentication, authorization, private media safety, headers, audit/security event readiness, and launch gate are evaluated.",
      evidence: commandsByDomain.security,
      warnings: Array.isArray(gate.warnings) ? gate.warnings : [],
      blockers: gate.decision === "blocked" && Array.isArray(gate.blockers) ? gate.blockers : [],
    });
  }
}

export class PerformanceCertificationService {
  async certify(): Promise<CertificationDomain> {
    return makeDomain({
      domain: "performance",
      summary: "Performance checks are wired through existing public, member, protected-content, billing, and observability verification commands.",
      evidence: ["npm run member-portal:performance", "npm run performance:baseline", "npm run performance:compare", "npm run build"],
      warnings: ["Large-scale 1,000/10,000 user load tests require staging or production load-test infrastructure."],
      blockers: [],
    });
  }
}

export class AccessibilityCertificationService {
  async certify(): Promise<CertificationDomain> {
    return makeDomain({
      domain: "accessibility",
      summary: "Accessibility verification commands are present for public and member experiences.",
      evidence: ["npm run member-portal:accessibility", "npm run public-experience:accessibility", "npm run test:a11y where available"],
      warnings: ["Manual screen-reader, keyboard, contrast, mobile, CRM, and billing accessibility audits remain required before public launch approval."],
      blockers: [],
    });
  }
}

export class DeploymentCertificationService {
  async certify(environment = "production"): Promise<CertificationDomain> {
    const [deployment, reliability, health] = await Promise.all([
      deploymentLaunchChecklistService.buildLaunchReport(environment),
      reliabilityReleaseGateService.evaluate(environment),
      productionHealthCheckRegistry.runAllChecks(),
    ]);
    return makeDomain({
      domain: "deployment",
      summary: "Deployment, health, reliability, observability, backups, rollback, infrastructure, and production readiness are evaluated through existing launch gates.",
      evidence: ["npm run deployment:launch-check -- --environment=production", "npm run reliability:health -- --environment=production", "npm run observability:verify -- --environment=production"],
      warnings: reliability.warnings ?? [],
      blockers: [
        ...(!deployment.ready ? ["Deployment launch gate is not approved."] : []),
        ...(reliability.decision === "blocked" ? reliability.blockers : []),
        ...health.criticalFailures.map((service) => `Critical production health check failed: ${service}`),
      ],
    });
  }
}

export class LaunchReadinessService {
  async evaluate(domains: CertificationDomain[], environment = "production") {
    const missingSummaries = memberPromptIds.filter((promptId) => !exists(`${promptId}-implementation-summary.md`));
    const checklist = exists("ANM-WEB-production-launch-checklist.md") ? fs.readFileSync(path.join(docsDir(), "ANM-WEB-production-launch-checklist.md"), "utf8") : "";
    const missingChecklist = memberPromptIds.filter((promptId) => !checklist.includes(promptId));
    const domainBlockers = domains.flatMap((domain) => domain.blockers.map((blocker) => `${domain.domain}: ${blocker}`));
    const productionEvidenceBlockers = [
      "Live production browser E2E for registration/login/member portal/protected content/billing is not recorded in this repository.",
      "Live Stripe checkout/webhook signature verification with production provider configuration is not recorded.",
      "Manual accessibility certification for member, billing, CRM, and protected media flows is not recorded.",
      "Large-scale production/staging load-test evidence for member APIs, billing, search, and protected streaming is not recorded.",
    ];
    const blockers = [...missingSummaries.map((promptId) => `${promptId} implementation summary missing.`), ...missingChecklist.map((promptId) => `${promptId} checklist entry missing.`), ...domainBlockers, ...productionEvidenceBlockers];
    return {
      environment,
      decision: blockers.length ? "not_approved" : "approved",
      blockers,
      warnings: domains.flatMap((domain) => domain.warnings.map((warning) => `${domain.domain}: ${warning}`)),
      checkedAt: new Date().toISOString(),
    };
  }
}

export class ProductionCertificationService {
  private readonly memberCertification = new MemberCertificationService();
  private readonly securityCertification = new SecurityCertificationService();
  private readonly performanceCertification = new PerformanceCertificationService();
  private readonly accessibilityCertification = new AccessibilityCertificationService();
  private readonly deploymentCertification = new DeploymentCertificationService();
  private readonly launchReadiness = new LaunchReadinessService();

  async certify(environment = getBackendConfig().app.environment) {
    const memberDomains = await this.memberCertification.certify();
    const domains = [
      ...memberDomains,
      await this.securityCertification.certify(),
      await this.performanceCertification.certify(),
      await this.accessibilityCertification.certify(),
      await this.deploymentCertification.certify(environment),
    ];
    const readiness = await this.launchReadiness.evaluate(domains, environment);
    const certifiedCount = domains.filter((domain) => domain.status === "certified" || domain.status === "certified_with_warnings").length;
    return {
      promptId: "ANM-WEB-118",
      environment,
      releaseVersion: getBackendConfig().app.version,
      decision: readiness.decision,
      certifiedCount,
      domainCount: domains.length,
      domains,
      readiness,
      commandEvidence: commandsByDomain,
      finalMessage: readiness.decision === "approved" ? "Member ecosystem public launch is approved." : "Member ecosystem public launch is not approved until blockers are resolved.",
      certifiedAt: new Date().toISOString(),
      certifiedBy: "ANM-WEB-118 member ecosystem certification service",
    };
  }
}

export const memberCertificationService = new MemberCertificationService();
export const securityCertificationService = new SecurityCertificationService();
export const performanceCertificationService = new PerformanceCertificationService();
export const accessibilityCertificationService = new AccessibilityCertificationService();
export const deploymentCertificationService = new DeploymentCertificationService();
export const launchReadinessService = new LaunchReadinessService();
export const productionCertificationService = new ProductionCertificationService();
