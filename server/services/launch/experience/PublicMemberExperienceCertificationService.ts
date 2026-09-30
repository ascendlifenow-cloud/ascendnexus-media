import fs from "node:fs/promises";
import path from "node:path";
import type { PublicMemberExperienceCertificationResult, PublicMemberExperienceCertificationRun } from "../../../models/launch/PublicMemberExperienceCertificationRunModel";
import { publicMemberExperienceHealthService, type PublicMemberExperienceHealthReport } from "./PublicMemberExperienceHealthService";

export interface PublicMemberExperienceCertificationReport {
  run: PublicMemberExperienceCertificationRun;
  health: PublicMemberExperienceHealthReport;
}

const toRunDecision = (decision: PublicMemberExperienceHealthReport["decision"]): PublicMemberExperienceCertificationRun["decision"] => {
  if (decision === "EXPERIENCE READY") return "experience_ready";
  if (decision === "EXPERIENCE READY WITH POST-LAUNCH ITEMS") return "experience_ready_with_post_launch_items";
  return "experience_blocked";
};

const result = (status: PublicMemberExperienceCertificationResult["status"], summary: string, evidence?: Record<string, unknown>): PublicMemberExperienceCertificationResult => ({
  status,
  summary,
  evidence,
});

const mapStatus = (status: PublicMemberExperienceHealthReport["overallStatus"]): PublicMemberExperienceCertificationResult["status"] =>
  status === "fail" ? "fail" : status === "warn" ? "warn" : status === "not_applicable" ? "not_applicable" : "pass";

export class PublicMemberExperienceCertificationService {
  async certify(): Promise<PublicMemberExperienceCertificationReport> {
    const health = await publicMemberExperienceHealthService.getHealthReport();
    const now = new Date().toISOString();
    const run: PublicMemberExperienceCertificationRun = {
      certificationRunId: `public-member-experience-${Date.now()}`,
      environment: health.environment,
      applicationVersion: process.env.npm_package_version ?? "0.1.0",
      commitReference: process.env.GIT_COMMIT,
      executedBy: process.env.USER ?? "system",
      startedAt: health.checkedAt,
      completedAt: now,
      publicResult: result(mapStatus(health.publicStatus), `${health.summary.publishedArtists} artist(s), ${health.summary.publishedReleases} release(s).`, health.summary),
      guestResult: result(mapStatus(health.guestStatus), "Guest experience route and protected-content boundaries are represented in the access matrix.", { publicRoutes: health.publicRoutes }),
      memberResult: result(mapStatus(health.memberStatus), "Member portal foundation and route map were evaluated.", { memberRoutes: health.memberRoutes }),
      navigationResult: result(mapStatus(health.routingStatus), "Public/member navigation and route registration were evaluated.", { publicRoutes: health.publicRoutes, memberRoutes: health.memberRoutes }),
      routingResult: result(mapStatus(health.routingStatus), "Required public and member routes were evaluated.", { publicRoutes: health.publicRoutes, memberRoutes: health.memberRoutes }),
      previewResult: result(mapStatus(health.mediaStatus), "Public artwork and audio preview safety were evaluated.", health.summary),
      protectedContentResult: result(mapStatus(health.accessStatus), "Full-song public exposure and protected-content access boundaries were evaluated.", { accessMatrix: health.accessMatrix }),
      responsiveResult: result(mapStatus(health.responsiveStatus), "Responsive browser evidence is tracked as a launch verification requirement."),
      accessibilityResult: result(mapStatus(health.accessibilityStatus), "Accessibility browser evidence is tracked as a launch verification requirement."),
      seoResult: result(mapStatus(health.seoStatus), "SEO, crawler, sitemap, and metadata readiness were evaluated."),
      performanceResult: result(mapStatus(health.performanceStatus), "Performance browser evidence is tracked as a launch verification requirement."),
      browserResult: result(mapStatus(health.browserStatus), "Browser workflow evidence is tracked as a launch verification requirement."),
      consoleResult: result(mapStatus(health.consoleStatus), "Console error evidence is tracked as a launch verification requirement."),
      networkResult: result(mapStatus(health.networkStatus), "Network failure evidence is tracked as a launch verification requirement."),
      openP0Count: health.counts.p0Open,
      openP1Count: health.counts.p1Open,
      openP2Count: health.counts.p2Open,
      evidenceReferences: health.evidenceReferences,
      decision: toRunDecision(health.decision),
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    return { run, health };
  }

  async getReport(): Promise<PublicMemberExperienceCertificationReport> {
    return this.certify();
  }

  async writeDocumentation(report?: PublicMemberExperienceCertificationReport): Promise<string[]> {
    const certificationReport = report ?? await this.certify();
    const docsDir = path.resolve(process.cwd(), "docs");
    await fs.mkdir(docsDir, { recursive: true });
    const files: Array<[string, string]> = [
      ["ANM-WEB-129-public-member-experience-launch-certification.md", this.certificationDoc(certificationReport)],
      ["ANM-WEB-129-browser-workflow-report.md", this.browserWorkflowDoc(certificationReport)],
      ["ANM-WEB-129-public-route-verification.md", this.routeDoc(certificationReport, "public")],
      ["ANM-WEB-129-member-route-verification.md", this.routeDoc(certificationReport, "member")],
      ["ANM-WEB-129-member-access-matrix.md", this.accessMatrixDoc(certificationReport)],
      ["ANM-WEB-129-visual-accessibility-report.md", this.visualAccessibilityDoc(certificationReport)],
      ["ANM-WEB-129-performance-report.md", this.performanceDoc(certificationReport)],
      ["ANM-WEB-129-launch-blockers.md", this.blockersDoc(certificationReport)],
      ["ANM-WEB-129-final-experience-certification.md", this.finalCertificationDoc(certificationReport)],
      ["ANM-WEB-129-launch-experience-runbook.md", this.runbookDoc(certificationReport)],
      ["ANM-WEB-129-implementation-summary.md", this.implementationSummaryDoc(certificationReport)],
    ];
    await Promise.all(files.map(([fileName, content]) => fs.writeFile(path.join(docsDir, fileName), content)));
    return files.map(([fileName]) => `/docs/${fileName}`);
  }

  private frontmatter(title: string, report: PublicMemberExperienceCertificationReport) {
    return `# ${title}\n\nPrompt: ANM-WEB-129\nGenerated: ${report.health.checkedAt}\nDecision: ${report.health.decision}\n\n`;
  }

  private certificationDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Public Member Experience Launch Certification", report)}${report.health.finalMessage}\n\n## Status\n\n- P0 open: ${report.health.counts.p0Open}\n- P1 open: ${report.health.counts.p1Open}\n- P2 open: ${report.health.counts.p2Open}\n- Checks passed: ${report.health.counts.checksPassed}\n- Checks warning: ${report.health.counts.checksWarning}\n- Checks failed: ${report.health.counts.checksFailed}\n\n## Summary\n\n${JSON.stringify(report.health.summary, null, 2)}\n\n## Required Remaining Evidence\n\nFinal production verification still requires staging and production browser captures for route rendering, console/network cleanliness, accessibility, responsive behavior, and performance.\n`;
  }

  private browserWorkflowDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Browser Workflow Report", report)}## Browser Workflow Scope\n\nGuest routes, member routes, public menu, member menu, release details, artwork collage, auth flows, noindex/private member routes, protected-media prompts, and browser console/network behavior are tracked by the certification service.\n\n## Current Result\n\n${report.health.browserStatus.toUpperCase()}: browser workflow evidence is pending until a real staging/production browser run is attached.\n`;
  }

  private routeDoc(report: PublicMemberExperienceCertificationReport, audience: "public" | "member") {
    const routes = audience === "public" ? report.health.publicRoutes : report.health.memberRoutes;
    return `${this.frontmatter(`${audience === "public" ? "Public" : "Member"} Route Verification`, report)}| Route | Status | Summary |\n| --- | --- | --- |\n${routes.map((route) => `| ${route.path} | ${route.status} | ${route.summary} |`).join("\n")}\n`;
  }

  private accessMatrixDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Member Access Matrix", report)}| Subject | Public Content | Public Preview | Protected Stream | Protected Download | Admin Experience |\n| --- | --- | --- | --- | --- | --- |\n${report.health.accessMatrix.map((row) => `| ${row.subject} | ${row.publicContent} | ${row.publicPreview} | ${row.protectedStream} | ${row.protectedDownload} | ${row.adminExperience} |`).join("\n")}\n`;
  }

  private visualAccessibilityDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Visual Accessibility Report", report)}Accessibility status: ${report.health.accessibilityStatus}\n\nRequired manual/browser evidence remains keyboard navigation, visible focus, labels, mobile menu focus behavior, contrast, reduced motion, and screen-reader route structure.\n`;
  }

  private performanceDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Performance Report", report)}Performance status: ${report.health.performanceStatus}\n\nThe certification scripts track performance as pending browser evidence. Final launch verification must capture homepage, artist, release, artwork, login/register, and member dashboard route timing.\n`;
  }

  private blockersDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Launch Blockers", report)}${report.health.issues.length ? report.health.issues.map((issue) => `## ${issue.severity} - ${issue.title}\n\nArea: ${issue.area}\n\nEvidence: ${issue.evidence}\n\nRemediation: ${issue.remediation}\n`).join("\n") : "No open issues.\n"}`;
  }

  private finalCertificationDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Final Experience Certification", report)}Final decision: ${report.health.decision}\n\n${report.health.finalMessage}\n\nThis document must not be interpreted as production-verified until staging and production browser evidence has been captured and P0/P1 counts are zero.\n`;
  }

  private runbookDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Launch Experience Runbook", report)}## Verify\n\nRun:\n\n\`\`\`bash\nnpm run launch:public-smoke\nnpm run launch:member-smoke\nnpm run launch:experience-routes\nnpm run launch:member-access-matrix\nnpm run launch:experience-a11y\nnpm run launch:experience-performance\nnpm run launch:browser-health\n\`\`\`\n\n## Response Playbooks\n\n- Public route not found: verify AppRouter route registration and public API slug data.\n- Member route blank: check MemberRouteGuard, member session, and browser console.\n- Public media broken: verify public-safe URL promotion and storage object access level.\n- Protected URL exposed: block launch, demote media, purge caches, rerun full-song and private-media scans.\n- Console/network errors: capture the route, request URL, status code, and stack; fix before verification.\n- Accessibility failure: fix focus, label, contrast, and keyboard issues before final verification.\n\nCurrent decision: ${report.health.decision}\n`;
  }

  private implementationSummaryDoc(report: PublicMemberExperienceCertificationReport) {
    return `${this.frontmatter("Implementation Summary", report)}Implemented:\n\n- Canonical public artwork route /artwork with /artwork-collage compatibility.\n- Public/member experience health service.\n- Public/member experience certification run model and certification service.\n- Required ANM-WEB-129 CLI command surface.\n- Admin launch-readiness experience API and dashboard.\n- Durable docs, runbook, browser workflow report, access matrix, route reports, blockers report, and final certification artifact.\n\nKnown limitation:\n\n- Local scripts can certify route/data/media-safety state, but final staging and production browser evidence remains required before marking verified.\n\nFinal decision: ${report.health.decision}\n`;
  }
}

export const publicMemberExperienceCertificationService = new PublicMemberExperienceCertificationService();
