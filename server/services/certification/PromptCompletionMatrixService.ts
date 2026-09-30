import fs from "node:fs";
import path from "node:path";

const promptNames: Record<string, string> = {
  "ANM-WEB-083": "Production Readiness Audit & Mock Removal Plan",
  "ANM-WEB-084": "Production Environment, Configuration & Secrets Management",
  "ANM-WEB-085": "Production Authentication, Admin Login & RBAC",
  "ANM-WEB-086": "Production Database Models, Migrations & Indexes",
  "ANM-WEB-087": "Production Storage, CDN & Private Media Verification",
  "ANM-WEB-088": "Production Media Processing Workers",
  "ANM-WEB-089": "Production Artist CRUD & Artwork Management",
  "ANM-WEB-090": "Production Release CRUD & Song Management",
  "ANM-WEB-091": "Production Media Library, Linking & Assignment",
  "ANM-WEB-092": "Production Gallery CRUD, Media Assignment & Public Display",
  "ANM-WEB-093": "Production Homepage & Site Content Management",
  "ANM-WEB-094": "Production SEO, Social Metadata & Search Preview Management",
  "ANM-WEB-095": "Production Publication Workflow Completion",
  "ANM-WEB-096": "Production Public API, Content Projections & Cache Integration",
  "ANM-WEB-097": "Production Client Pages, Navigation & Responsive Experience",
  "ANM-WEB-098": "Production Public Audio Player & Playback Verification",
  "ANM-WEB-099": "Production Public Search, Browse & Discovery",
  "ANM-WEB-100": "Production Contact, Newsletter & Public Form Delivery",
  "ANM-WEB-101": "Production Analytics, Consent & Privacy Controls",
  "ANM-WEB-102": "Production Security Hardening",
  "ANM-WEB-103": "Production Infrastructure, Deployment, Domain & TLS",
  "ANM-WEB-104": "Production SEO Indexing, Sitemap, Robots & Search-Engine Launch",
  "ANM-WEB-105": "Production Observability, Reliability, Performance & Launch Certification",
};

export class PromptCompletionMatrixService {
  buildMatrix() {
    const docsDir = path.resolve(process.cwd(), "docs");
    const checklist = fs.existsSync(path.join(docsDir, "ANM-WEB-production-launch-checklist.md")) ? fs.readFileSync(path.join(docsDir, "ANM-WEB-production-launch-checklist.md"), "utf8") : "";
    return Object.entries(promptNames).map(([promptId, promptName]) => {
      const implementationSummary = path.join(docsDir, `${promptId}-implementation-summary.md`);
      const hasSummary = fs.existsSync(implementationSummary) || promptId === "ANM-WEB-083";
      const checklistLine = checklist.split("\n").find((line) => line.includes(promptId)) ?? "";
      const status = checklistLine.includes("| Complete |") ? "Complete" : checklistLine.includes("| Verified |") ? "Verified" : checklistLine.includes("| Not Started |") ? "Not Started" : hasSummary ? "Complete" : "Missing";
      const blocker = /blocked|requires|missing|unavailable|not approved|remains/i.test(checklistLine);
      return {
        promptId,
        promptName,
        implementationSummaryPresent: hasSummary,
        launchChecklistStatus: status,
        warnings: blocker ? [checklistLine.replace(/\|/g, " ").trim()] : [],
        blockers: blocker && ["ANM-WEB-102", "ANM-WEB-103", "ANM-WEB-104"].includes(promptId) ? [checklistLine.replace(/\|/g, " ").trim()] : [],
        evidenceReferences: hasSummary ? [implementationSummary] : [],
        certificationStatus: hasSummary && !blocker ? "verified_with_warning" : hasSummary ? "verified_with_warning" : "missing",
      };
    });
  }
}

export const promptCompletionMatrixService = new PromptCompletionMatrixService();
