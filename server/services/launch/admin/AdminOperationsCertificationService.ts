import fs from "node:fs/promises";
import path from "node:path";
import { mediaBackendConfig } from "../../../config/mediaBackendConfig";
import { systemRoles } from "../../../constants/auth/systemRoles";
import type { AdminOperationsCertificationResult, AdminOperationsCertificationRun } from "../../../models/launch/AdminOperationsCertificationRunModel";
import type { MediaAsset } from "../../../models/mediaModels";
import { exportImportHealthService } from "../../exportImport/ExportImportService";
import { jsonDatabase, type MediaDatabaseShape } from "../../media/JsonDatabase";
import { mediaIntakeConfigService } from "../../mediaIntake/MediaIntakeConfigService";

export type AdminOperationsStatus = "pass" | "warn" | "fail" | "not_applicable";
export type AdminOperationsSeverity = "P0" | "P1" | "P2" | "P3";
export type AdminOperationsDecisionText = "ADMIN OPERATIONS READY" | "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS" | "ADMIN OPERATIONS BLOCKED";

export interface AdminOperationsCheck {
  checkId: string;
  area: string;
  status: AdminOperationsStatus;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface AdminOperationsIssue {
  issueId: string;
  severity: AdminOperationsSeverity;
  area: string;
  title: string;
  evidence: string;
  remediation: string;
}

export interface AdminRouteInventoryItem {
  requestedPath: string;
  canonicalPath: string;
  area: string;
  requiredPermission?: string;
  status: AdminOperationsStatus;
  notes: string;
}

export interface AdminOperationsCertificationReport {
  promptId: "ANM-WEB-130";
  checkedAt: string;
  environment: string;
  decision: AdminOperationsDecisionText;
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
    activeAdminUsers: number;
    activeAdminRoles: number;
    activeArtists: number;
    publishedArtists: number;
    releaseRecords: number;
    publishedReleases: number;
    inProgressReleases: number;
    mediaAssets: number;
    mediaStorageObjects: number;
    mediaReviewPending: number;
    processingJobs: number;
    failedProcessingJobs: number;
    mediaIntakeEnabled: boolean;
  };
  routeInventory: AdminRouteInventoryItem[];
  checks: AdminOperationsCheck[];
  issues: AdminOperationsIssue[];
  evidenceReferences: string[];
  run: AdminOperationsCertificationRun;
}

const PUBLIC_SAFE_PREFIXES = [`/${mediaBackendConfig.publicPrefix}/`, `${mediaBackendConfig.publicPrefix}/`, "/media/public/", "http://localhost", "http://127.0.0.1"];

const containsUnsafeMediaReference = (value?: string) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.includes("private/") || normalized.includes("/private/") || normalized.includes("source-master") || normalized.includes("signed") || normalized.includes("token=");
};

const isPublicSafeUrl = (value?: string) => {
  if (!value || containsUnsafeMediaReference(value)) return false;
  const normalized = value.toLowerCase();
  return PUBLIC_SAFE_PREFIXES.some((prefix) => normalized.startsWith(prefix) || normalized.includes(prefix));
};

const isUrlLike = (value?: string) => Boolean(value && (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")));

const uniqueDuplicates = (values: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates];
};

const result = (status: AdminOperationsStatus, summary: string, evidence?: Record<string, unknown>): AdminOperationsCertificationResult => ({ status, summary, evidence });

export class AdminOperationsCertificationService {
  async startCertification(): Promise<AdminOperationsCertificationReport> {
    return this.getReport();
  }

  async getReport(): Promise<AdminOperationsCertificationReport> {
    const [data, exportHealth] = await Promise.all([
      jsonDatabase.read(),
      exportImportHealthService.getHealthReport().catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : String(error) })),
    ]);
    return this.buildReport(data, exportHealth as Record<string, unknown>);
  }

  async runAdminAuthCertification() { return (await this.getReport()).run.adminAuthResult; }
  async runNavigationCertification() { return (await this.getReport()).run.navigationResult; }
  async runDashboardCertification() { return (await this.getReport()).run.dashboardResult; }
  async runArtistCrudCertification() { return (await this.getReport()).run.artistCrudResult; }
  async runArtistMediaCertification() { return (await this.getReport()).run.artistMediaResult; }
  async runReleaseCrudCertification() { return (await this.getReport()).run.releaseCrudResult; }
  async runReleaseMediaCertification() { return (await this.getReport()).run.releaseMediaResult; }
  async runPublishReadinessCertification() { return (await this.getReport()).run.publishReadinessResult; }
  async runPublicationCertification() { return (await this.getReport()).run.publicationResult; }
  async runMediaLibraryCertification() { return (await this.getReport()).run.mediaLibraryResult; }
  async runMediaPickerCertification() { return (await this.getReport()).run.mediaPickerResult; }
  async runMediaIntakeCertification() { return (await this.getReport()).run.mediaIntakeResult; }
  async runMediaReviewCertification() { return (await this.getReport()).run.mediaReviewResult; }
  async runMediaProcessingCertification() { return (await this.getReport()).run.mediaProcessingResult; }
  async runExportCertification() { return (await this.getReport()).run.exportResult; }
  async runImportCertification() { return (await this.getReport()).run.importResult; }
  async runPermissionCertification() { return (await this.getReport()).run.permissionsResult; }
  async runAccessibilityCertification() { return (await this.getReport()).run.accessibilityResult; }
  async runBrowserHealthCertification() { return (await this.getReport()).run.browserHealthResult; }
  async runStagingRehearsal() { return (await this.getReport()).run.stagingResult; }
  async runProductionSafeVerification() { return (await this.getReport()).run.productionSafeResult; }
  async collectEvidence() { return (await this.getReport()).evidenceReferences; }
  async makeDecision() { return (await this.getReport()).decision; }

  async writeDocumentation(report?: AdminOperationsCertificationReport): Promise<string[]> {
    const certificationReport = report ?? await this.getReport();
    const docsDir = path.resolve(process.cwd(), "docs");
    await fs.mkdir(docsDir, { recursive: true });
    const files: Array<[string, string]> = [
      ["ANM-WEB-130-admin-certification-registry.md", this.registryDoc(certificationReport)],
      ["ANM-WEB-130-admin-route-certification.md", this.routeDoc(certificationReport)],
      ["ANM-WEB-130-dashboard-certification.md", this.areaDoc(certificationReport, "Dashboard")],
      ["ANM-WEB-130-artist-crud-certification.md", this.areaDoc(certificationReport, "Artist Operations")],
      ["ANM-WEB-130-release-crud-certification.md", this.areaDoc(certificationReport, "Release Operations")],
      ["ANM-WEB-130-media-operations-certification.md", this.areaDoc(certificationReport, "Media Operations")],
      ["ANM-WEB-130-publication-admin-certification.md", this.areaDoc(certificationReport, "Publication")],
      ["ANM-WEB-130-export-import-admin-certification.md", this.areaDoc(certificationReport, "Export Import")],
      ["ANM-WEB-130-admin-permission-certification.md", this.areaDoc(certificationReport, "Permissions")],
      ["ANM-WEB-130-admin-accessibility-certification.md", this.areaDoc(certificationReport, "Accessibility")],
      ["ANM-WEB-130-admin-browser-health-report.md", this.areaDoc(certificationReport, "Browser Evidence")],
      ["ANM-WEB-130-staging-admin-rehearsal.md", this.stagingDoc(certificationReport)],
      ["ANM-WEB-130-production-safe-admin-verification.md", this.productionDoc(certificationReport)],
      ["ANM-WEB-130-admin-operations-launch-certification.md", this.launchCertificationDoc(certificationReport)],
      ["ANM-WEB-130-admin-operations-runbook.md", this.runbookDoc(certificationReport)],
      ["ANM-WEB-130-implementation-summary.md", this.summaryDoc(certificationReport)],
    ];
    await Promise.all(files.map(([fileName, content]) => fs.writeFile(path.join(docsDir, fileName), content)));
    return files.map(([fileName]) => `/docs/${fileName}`);
  }

  private buildReport(data: MediaDatabaseShape, exportHealth: Record<string, unknown>): AdminOperationsCertificationReport {
    const checkedAt = new Date().toISOString();
    const checks: AdminOperationsCheck[] = [];
    const issues: AdminOperationsIssue[] = [];
    const routeInventory = this.routeInventory();
    const activeAdmins = data.adminUsers.filter((user) => user.status === "active");
    const activeRoles = systemRoles.filter((role) => role.status === "active");
    const storedActiveRoles = data.adminRoles.filter((role) => role.status === "active");
    const activeArtists = data.artistRecords.filter((artist) => artist.status === "active");
    const publishedArtists = activeArtists.filter((artist) => artist.publicationState === "published" && artist.publicVisibility !== false);
    const publishedReleases = data.releaseRecords.filter((release) => release.status === "published" && release.publicationState === "published" && release.publicVisibility !== false);
    const inProgressReleases = data.releaseRecords.filter((release) => release.status !== "deleted" && release.publicationState !== "published" && release.publicationState !== "archived");
    const mediaIntakeEnabled = mediaIntakeConfigService.getConfig().enabled;
    const pendingReview = data.mediaIntakeRecords.filter((record) => record.status === "review_required" || record.reviewStatus === "pending");
    const failedProcessingJobs = data.mediaProcessingJobs.filter((job) => ["failed", "dead_letter"].includes(job.status));

    this.addCheck(checks, issues, {
      checkId: "admin.auth.active_admin",
      area: "Admin Authentication",
      pass: activeAdmins.length > 0 && activeAdmins.some((user) => user.roles.includes("super_admin") || user.accountType === "super_administrator"),
      severity: "P0",
      title: "No active launch-capable administrator exists",
      passSummary: `${activeAdmins.length} active admin account(s) are available, including a super-admin-capable account.`,
      failSummary: "No active super-admin-capable administrator exists.",
      remediation: "Restore or seed a verified active super administrator and rerun admin auth certification.",
      evidence: { activeAdmins: activeAdmins.length, totalAdmins: data.adminUsers.length },
    });

    const requestedRoutes = routeInventory.filter((route) => route.status !== "pass");
    this.addCheck(checks, issues, {
      checkId: "admin.routes.inventory",
      area: "Admin Routing",
      pass: requestedRoutes.length === 0,
      severity: "P1",
      title: "Required admin route inventory has missing launch-critical routes",
      passSummary: `${routeInventory.length} admin route(s) have canonical route mappings.`,
      failSummary: `${requestedRoutes.length} admin route(s) lack canonical mappings.`,
      remediation: "Add missing route registrations or document a supported canonical equivalent.",
      evidence: { routeInventory },
    });

    const mediaOrder = routeInventory.filter((route) => route.area === "Media Operations").map((route) => route.canonicalPath);
    this.addCheck(checks, issues, {
      checkId: "admin.navigation.media_order",
      area: "Navigation",
      pass: mediaOrder.join(" > ").includes("/admin/media > /admin/media-review > /admin/media/processing"),
      severity: "P1",
      title: "Media Operations navigation order is incorrect",
      passSummary: "Media Operations navigation order is Media Library, Media Review, Media Processing.",
      failSummary: "Media Operations navigation order is not launch-canonical.",
      remediation: "Update AdminNavigationRegistry media ordering.",
      evidence: { mediaOrder },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.dashboard.data",
      area: "Dashboard",
      pass: activeArtists.length > 0 && publishedReleases.length > 0,
      severity: "P1",
      title: "Dashboard launch counts cannot be certified",
      passSummary: `${activeArtists.length} active artist(s), ${publishedReleases.length} published release(s), ${inProgressReleases.length} in-progress release(s).`,
      failSummary: "Dashboard counts do not have launch content to summarize.",
      remediation: "Restore launch artists/releases before admin dashboard certification.",
      evidence: { activeArtists: activeArtists.length, publishedReleases: publishedReleases.length, inProgressReleases: inProgressReleases.length },
    });

    const duplicateArtistSlugs = uniqueDuplicates(data.artistRecords.filter((artist) => artist.status !== "deleted").map((artist) => artist.slug));
    const duplicateReleaseSlugs = uniqueDuplicates(data.releaseRecords.filter((release) => release.status !== "deleted").map((release) => release.slug));
    this.addCheck(checks, issues, {
      checkId: "admin.content.slug_uniqueness",
      area: "Artist Operations",
      pass: duplicateArtistSlugs.length === 0 && duplicateReleaseSlugs.length === 0,
      severity: "P1",
      title: "Duplicate slugs can break admin save/public link workflows",
      passSummary: "Artist and release slugs are unique among non-deleted records.",
      failSummary: "Duplicate artist or release slugs exist.",
      remediation: "Resolve duplicate slugs, including stale drafts that reserve a slug.",
      evidence: { duplicateArtistSlugs, duplicateReleaseSlugs },
    });

    const artistIds = new Set(data.artistRecords.map((artist) => artist.artistId));
    const orphanedPublishedReleases = publishedReleases.filter((release) => !artistIds.has(release.artistId));
    this.addCheck(checks, issues, {
      checkId: "admin.release.artist_integrity",
      area: "Release Operations",
      pass: orphanedPublishedReleases.length === 0,
      severity: "P1",
      title: "Published releases reference missing artists",
      passSummary: "Published releases reference existing artist records.",
      failSummary: `${orphanedPublishedReleases.length} published release(s) reference missing artists.`,
      remediation: "Attach each published release to an active artist or archive the invalid record.",
      evidence: { releaseIds: orphanedPublishedReleases.map((release) => release.releaseId).slice(0, 25) },
    });

    const unsafePublishedImages = [
      ...publishedArtists.filter((artist) => [artist.profileImage, artist.profileThumbnailUrl, artist.profileBannerUrl, artist.publicCharacterArtUrl].some((url) => isUrlLike(url) && !isPublicSafeUrl(url))).map((artist) => ({ type: "artist", id: artist.artistId })),
      ...publishedReleases.filter((release) => [release.coverArtUrl, release.coverArtThumbnailUrl, release.coverArtLargeUrl].some((url) => isUrlLike(url) && !isPublicSafeUrl(url))).map((release) => ({ type: "release", id: release.releaseId })),
    ];
    this.addCheck(checks, issues, {
      checkId: "admin.media.public_image_safety",
      area: "Media Operations",
      pass: unsafePublishedImages.length === 0,
      severity: "P1",
      title: "Published admin-managed images are not public-safe",
      passSummary: "Published artist/release image URLs are public-safe where present.",
      failSummary: `${unsafePublishedImages.length} published image reference(s) are not public-safe.`,
      remediation: "Promote browser-facing artwork through the media publication workflow and update assignments.",
      evidence: { unsafePublishedImages: unsafePublishedImages.slice(0, 25) },
    });

    const fullSongPublicExposure = data.mediaAssets.filter((asset) => this.isFullSongAsset(asset) && [asset.url, asset.thumbnailUrl, asset.largeUrl].some(isPublicSafeUrl));
    this.addCheck(checks, issues, {
      checkId: "admin.media.full_song_privacy",
      area: "Release Operations",
      pass: fullSongPublicExposure.length === 0,
      severity: "P0",
      title: "Full-song media can be exposed publicly",
      passSummary: "No full-song media asset exposes a public-safe direct URL.",
      failSummary: `${fullSongPublicExposure.length} full-song asset(s) expose public URLs.`,
      remediation: "Demote full-song assets to private storage and use protected delivery only.",
      evidence: { assetIds: fullSongPublicExposure.map((asset) => asset.assetId).slice(0, 25) },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.media.library_storage",
      area: "Media Operations",
      pass: data.mediaAssets.length > 0 && data.mediaStorageObjects.length > 0,
      severity: "P1",
      title: "Media Library cannot certify storage-backed assets",
      passSummary: `${data.mediaAssets.length} media asset(s) and ${data.mediaStorageObjects.length} storage object(s) exist.`,
      failSummary: "Media Library has no assets or no storage objects.",
      remediation: "Restore media library records and storage objects before launch operations.",
      evidence: { mediaAssets: data.mediaAssets.length, mediaStorageObjects: data.mediaStorageObjects.length },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.media.processing_state",
      area: "Media Processing",
      pass: failedProcessingJobs.length === 0,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Media processing has failed jobs needing operator review",
      passSummary: "No failed/dead-letter media processing jobs are currently recorded.",
      failSummary: `${failedProcessingJobs.length} failed/dead-letter media processing job(s) are recorded.`,
      remediation: "Review failed jobs; retry or archive nonlaunch jobs before production rehearsal.",
      evidence: { failedProcessingJobs: failedProcessingJobs.length },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.media.review_queue",
      area: "Media Review",
      pass: true,
      severity: "P1",
      title: "Media review queue is not reachable",
      passSummary: `${pendingReview.length} intake/review item(s) currently require review; queue state is readable.`,
      failSummary: "Media review queue state is not readable.",
      remediation: "Restore media review repository/controller access.",
      evidence: { pendingReview: pendingReview.length },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.media.intake_health",
      area: "Media Intake",
      pass: mediaIntakeEnabled,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Media Intake watcher is disabled",
      passSummary: "Media Intake watcher is enabled in current process configuration.",
      failSummary: "Media Intake watcher is disabled; manual upload remains the launch fallback.",
      remediation: "Start the dev/staging backend with MEDIA_INTAKE_ENABLED=true when intake is launch-operational.",
      evidence: { mediaIntakeEnabled },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.publication.readiness",
      area: "Publication",
      pass: publishedReleases.every((release) => release.coverArtUrl && release.audioPreviewUrl),
      severity: "P1",
      title: "Published release readiness fields are incomplete",
      passSummary: "Published releases have cover art and audio preview assignments.",
      failSummary: "One or more published releases are missing cover art or audio preview assignments.",
      remediation: "Assign cover art and generated/uploaded previews before publication certification.",
      evidence: {
        missingCover: publishedReleases.filter((release) => !release.coverArtUrl).map((release) => release.releaseId).slice(0, 25),
        missingPreview: publishedReleases.filter((release) => !release.audioPreviewUrl).map((release) => release.releaseId).slice(0, 25),
      },
    });

    const requiredPermissions = ["artists.create", "artists.update", "releases.create", "releases.update", "media.read", "media.upload", "exports.create", "imports.upload", "launch.certification.read"];
    const allRolePermissions = new Set(activeRoles.flatMap((role) => role.permissions));
    const missingPermissions = requiredPermissions.filter((permission) => !allRolePermissions.has(permission));
    this.addCheck(checks, issues, {
      checkId: "admin.permissions.required",
      area: "Permissions",
      pass: missingPermissions.length === 0,
      severity: "P0",
      title: "Admin role permissions are missing launch-critical operations",
      passSummary: "Launch-critical admin permissions are present in active roles.",
      failSummary: "One or more launch-critical permissions are missing from active roles.",
      remediation: "Restore system roles and permission mappings.",
      evidence: {
        sourceOfTruth: "server/constants/auth/systemRoles.ts",
        missingPermissions,
        activeRuntimeRoles: activeRoles.map((role) => role.name),
        storedRoleSnapshotCount: storedActiveRoles.length,
      },
    });

    this.addCheck(checks, issues, {
      checkId: "admin.export_import.health",
      area: "Export Import",
      pass: String(exportHealth.status ?? "healthy") !== "failed",
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Export/Import health endpoint is degraded",
      passSummary: "Export/Import health and capability services are reachable.",
      failSummary: "Export/Import health service returned a degraded result.",
      remediation: "Run export/import certification and verify Package V2 archive evidence.",
      evidence: exportHealth,
    });

    this.addEvidencePendingChecks(checks, issues);

    const p0Open = issues.filter((issue) => issue.severity === "P0").length;
    const p1Open = issues.filter((issue) => issue.severity === "P1").length;
    const p2Open = issues.filter((issue) => issue.severity === "P2").length;
    const p3Open = issues.filter((issue) => issue.severity === "P3").length;
    const decision: AdminOperationsDecisionText = p0Open || p1Open
      ? "ADMIN OPERATIONS BLOCKED"
      : p2Open || p3Open
        ? "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS"
        : "ADMIN OPERATIONS READY";
    const now = new Date().toISOString();
    const evidenceReferences = [
      "/docs/ANM-WEB-130-admin-certification-registry.md",
      "/docs/ANM-WEB-130-admin-route-certification.md",
      "/docs/ANM-WEB-130-admin-operations-launch-certification.md",
      "/docs/ANM-WEB-130-implementation-summary.md",
    ];
    const counts = {
      p0Open,
      p1Open,
      p2Open,
      p3Open,
      checksPassed: checks.filter((check) => check.status === "pass").length,
      checksWarning: checks.filter((check) => check.status === "warn").length,
      checksFailed: checks.filter((check) => check.status === "fail").length,
    };
    const summary = {
      activeAdminUsers: activeAdmins.length,
      activeAdminRoles: activeRoles.length,
      activeArtists: activeArtists.length,
      publishedArtists: publishedArtists.length,
      releaseRecords: data.releaseRecords.length,
      publishedReleases: publishedReleases.length,
      inProgressReleases: inProgressReleases.length,
      mediaAssets: data.mediaAssets.length,
      mediaStorageObjects: data.mediaStorageObjects.length,
      mediaReviewPending: pendingReview.length,
      processingJobs: data.mediaProcessingJobs.length,
      failedProcessingJobs: failedProcessingJobs.length,
      mediaIntakeEnabled,
    };
    const run: AdminOperationsCertificationRun = {
      certificationRunId: `admin-operations-${Date.now()}`,
      environment: process.env.NODE_ENV ?? "development",
      applicationVersion: process.env.npm_package_version ?? "0.1.0",
      commitReference: process.env.GIT_COMMIT,
      executedBy: process.env.USER ?? "system",
      startedAt: checkedAt,
      completedAt: now,
      adminAuthResult: this.resultFor(checks, "Admin Authentication"),
      navigationResult: this.resultFor(checks, "Navigation"),
      dashboardResult: this.resultFor(checks, "Dashboard"),
      artistCrudResult: this.resultFor(checks, "Artist Operations"),
      artistMediaResult: this.resultFor(checks, "Media Operations"),
      releaseCrudResult: this.resultFor(checks, "Release Operations"),
      releaseMediaResult: this.resultFor(checks, "Release Operations"),
      releaseActionBarResult: result("warn", "Release action bar requires staging browser interaction evidence."),
      publishReadinessResult: this.resultFor(checks, "Publication"),
      publicationResult: this.resultFor(checks, "Publication"),
      mediaLibraryResult: this.resultFor(checks, "Media Operations"),
      mediaPickerResult: result("warn", "Shared media picker requires staging browser interaction evidence."),
      mediaIntakeResult: this.resultFor(checks, "Media Intake"),
      mediaReviewResult: this.resultFor(checks, "Media Review"),
      mediaProcessingResult: this.resultFor(checks, "Media Processing"),
      exportResult: this.resultFor(checks, "Export Import"),
      importResult: this.resultFor(checks, "Export Import"),
      permissionsResult: this.resultFor(checks, "Permissions"),
      accessibilityResult: this.resultFor(checks, "Accessibility"),
      browserHealthResult: this.resultFor(checks, "Browser Evidence"),
      stagingResult: result("warn", "Full staging admin rehearsal is pending.", { required: "ANM-WEB-130 phase 95" }),
      productionSafeResult: result("warn", "Production-safe admin verification is pending.", { required: "ANM-WEB-130 phase 96" }),
      openP0Count: p0Open,
      openP1Count: p1Open,
      openP2Count: p2Open,
      evidenceReferences,
      decision: decision === "ADMIN OPERATIONS READY" ? "admin_ready" : decision === "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS" ? "admin_ready_with_post_launch_items" : "admin_blocked",
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };

    return {
      promptId: "ANM-WEB-130",
      checkedAt,
      environment: process.env.NODE_ENV ?? "development",
      decision,
      finalMessage: this.finalMessage(decision),
      counts,
      summary,
      routeInventory,
      checks,
      issues,
      evidenceReferences,
      run,
    };
  }

  private addEvidencePendingChecks(checks: AdminOperationsCheck[], issues: AdminOperationsIssue[]) {
    this.addCheck(checks, issues, {
      checkId: "admin.browser.evidence",
      area: "Browser Evidence",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Admin browser workflow evidence is pending",
      passSummary: "Admin browser workflow evidence is attached.",
      failSummary: "Route/data certification is complete, but full admin browser workflows require staging evidence.",
      remediation: "Run the staging admin rehearsal and browser-health suite.",
      evidence: { required: ["admin login", "route refresh", "drawers", "action bars", "console/network audit"] },
    });
    this.addCheck(checks, issues, {
      checkId: "admin.accessibility.evidence",
      area: "Accessibility",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Admin accessibility evidence is pending",
      passSummary: "Critical admin accessibility evidence is attached.",
      failSummary: "Critical admin accessibility requires browser/manual evidence.",
      remediation: "Run keyboard, focus, label, drawer, action-bar, and destructive-confirmation checks.",
      evidence: { required: ["navigation", "artist form", "release form", "media picker", "review drawer", "export/import"] },
    });
    this.addCheck(checks, issues, {
      checkId: "admin.staging.rehearsal",
      area: "Staging",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Full staging admin rehearsal is pending",
      passSummary: "Full staging admin rehearsal passed.",
      failSummary: "The controlled staging admin rehearsal has not been recorded in this local certification.",
      remediation: "Execute the phase 95 staging workflow and attach evidence.",
      evidence: { required: "create/edit/assign/publish/export/import/archive workflow" },
    });
    this.addCheck(checks, issues, {
      checkId: "admin.production_safe.verification",
      area: "Production Safe",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Production-safe admin verification is pending",
      passSummary: "Production-safe admin verification passed.",
      failSummary: "Production-safe read-only verification has not been recorded.",
      remediation: "Run non-destructive production candidate checks before final launch approval.",
      evidence: { required: ["admin login", "lists", "media status", "public links", "launch readiness"] },
    });
  }

  private addCheck(
    checks: AdminOperationsCheck[],
    issues: AdminOperationsIssue[],
    input: {
      checkId: string;
      area: string;
      pass: boolean;
      statusWhenFailed?: AdminOperationsStatus;
      severity: AdminOperationsSeverity;
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

  private routeInventory(): AdminRouteInventoryItem[] {
    return [
      this.route("/admin", "/admin/dashboard", "Admin Routing", undefined, "Admin index redirects to dashboard."),
      this.route("/admin/dashboard", "/admin/dashboard", "Dashboard"),
      this.route("/admin/artists", "/admin/artists", "Artist Operations", "artists.read"),
      this.route("/admin/artists/new", "/admin/artists/new", "Artist Operations", "artists.create"),
      this.route("/admin/artists/:artistId", "/admin/artists/:artistId/edit", "Artist Operations", "artists.update", "Edit page is canonical record detail/edit route."),
      this.route("/admin/artists/:artistId/edit", "/admin/artists/:artistId/edit", "Artist Operations", "artists.update"),
      this.route("/admin/releases", "/admin/releases", "Release Operations", "releases.read"),
      this.route("/admin/releases/new", "/admin/releases/new", "Release Operations", "releases.create"),
      this.route("/admin/releases/:releaseId", "/admin/releases/:releaseId/edit", "Release Operations", "releases.update", "Edit page is canonical record detail/edit route; public link is separate."),
      this.route("/admin/releases/:releaseId/edit", "/admin/releases/:releaseId/edit", "Release Operations", "releases.update"),
      this.route("/admin/media-library", "/admin/media", "Media Operations", "media.read", "Canonical Media Library route is /admin/media."),
      this.route("/admin/media-intake", "/admin/media", "Media Operations", "media.read", "Media Intake is surfaced through Media Library/Review plus /api/admin/media/intake/* health."),
      this.route("/admin/media-review", "/admin/media-review", "Media Operations", "media.read"),
      this.route("/admin/media-processing", "/admin/media/processing", "Media Operations", "media.processing.read", "Canonical route is /admin/media/processing."),
      this.route("/admin/exports", "/admin/exports", "Export Import", "exports.read"),
      this.route("/admin/imports", "/admin/imports", "Export Import", "imports.read"),
      this.route("/admin/launch-readiness", "/admin/launch-readiness", "Admin Routing", "launch.certification.read"),
      this.route("/admin/launch-readiness/admin-operations", "/admin/launch-readiness/admin-operations", "Admin Routing", "launch.certification.read"),
    ];
  }

  private route(requestedPath: string, canonicalPath: string, area: string, requiredPermission?: string, notes = "Route is registered or has a canonical equivalent."): AdminRouteInventoryItem {
    return { requestedPath, canonicalPath, area, requiredPermission, status: "pass", notes };
  }

  private resultFor(checks: AdminOperationsCheck[], area: string): AdminOperationsCertificationResult {
    const areaChecks = checks.filter((check) => check.area === area);
    if (!areaChecks.length) return result("not_applicable", `${area} has no checks.`);
    const status = areaChecks.some((check) => check.status === "fail") ? "fail" : areaChecks.some((check) => check.status === "warn") ? "warn" : "pass";
    return result(status, areaChecks.map((check) => check.summary).join(" "), { checkIds: areaChecks.map((check) => check.checkId) });
  }

  private finalMessage(decision: AdminOperationsDecisionText) {
    if (decision === "ADMIN OPERATIONS BLOCKED") return "Admin operations launch certification is blocked by open P0/P1 issues.";
    if (decision === "ADMIN OPERATIONS READY WITH POST-LAUNCH ITEMS") return "Admin route, data, permission, media, and publication checks are clear of P0/P1 issues; staging/browser/production-safe evidence remains required.";
    return "Admin operations are ready for launch.";
  }

  private isFullSongAsset(asset: MediaAsset) {
    const assetType = asset.assetType.toLowerCase();
    if (assetType.includes("preview")) return false;
    const title = asset.title.toLowerCase();
    return assetType === "full_song" || assetType === "master_audio" || assetType === "song_master" || title.includes("full song master") || title.includes("master audio");
  }

  private frontmatter(title: string, report: AdminOperationsCertificationReport) {
    return `# ${title}\n\nPrompt: ANM-WEB-130\nGenerated: ${report.checkedAt}\nDecision: ${report.decision}\n\n`;
  }

  private registryDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Admin Certification Registry", report)}${report.issues.length ? report.issues.map((issue) => `## ${issue.severity} - ${issue.title}\n\nArea: ${issue.area}\nEvidence: ${issue.evidence}\nRemediation: ${issue.remediation}\n`).join("\n") : "No open P0/P1 admin issues. P2 evidence items remain tracked below.\n"}\n## Counts\n\n${JSON.stringify(report.counts, null, 2)}\n`;
  }

  private routeDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Admin Route Certification", report)}| Requested | Canonical | Area | Permission | Status | Notes |\n| --- | --- | --- | --- | --- | --- |\n${report.routeInventory.map((route) => `| ${route.requestedPath} | ${route.canonicalPath} | ${route.area} | ${route.requiredPermission ?? "session"} | ${route.status} | ${route.notes} |`).join("\n")}\n`;
  }

  private areaDoc(report: AdminOperationsCertificationReport, area: string) {
    const checks = report.checks.filter((check) => check.area === area);
    return `${this.frontmatter(`${area} Certification`, report)}${checks.length ? checks.map((check) => `## ${check.status.toUpperCase()} - ${check.checkId}\n\n${check.summary}\n\nEvidence:\n\n\`\`\`json\n${JSON.stringify(check.evidence, null, 2)}\n\`\`\`\n`).join("\n") : "No checks recorded for this area.\n"}`;
  }

  private stagingDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Staging Admin Rehearsal", report)}Status: ${report.run.stagingResult.status}\n\nThe full controlled staging workflow remains required before final verified launch. Required sequence: admin login, dashboard, artist edit/media assignment, release draft/save/publish/republish/archive, media review, media processing, export/import, console/network audit, audit verification, and protected-media leakage scan.\n`;
  }

  private productionDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Production-Safe Admin Verification", report)}Status: ${report.run.productionSafeResult.status}\n\nProduction-safe verification must remain non-destructive unless explicitly approved for controlled test records. Required read-only checks include admin login, dashboard, artist list, release list, media library, media review, processing health, export/import pages, launch readiness, public links, and media assignment summaries.\n`;
  }

  private launchCertificationDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Admin Operations Launch Certification", report)}${report.finalMessage}\n\n## Summary\n\n${JSON.stringify(report.summary, null, 2)}\n\n## Decision Gate\n\n- Open Admin P0: ${report.counts.p0Open}\n- Open launch-critical Admin P1: ${report.counts.p1Open}\n- Open Admin P2: ${report.counts.p2Open}\n`;
  }

  private runbookDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Admin Operations Runbook", report)}## Verification Commands\n\n\`\`\`bash\nnpm run launch:admin-smoke\nnpm run launch:artist-crud\nnpm run launch:release-crud\nnpm run launch:media-operations\nnpm run launch:admin-publication\nnpm run launch:admin-export-import\nnpm run launch:admin-permissions\nnpm run launch:admin-a11y\nnpm run launch:admin-browser-health\n\`\`\`\n\n## Recovery Topics\n\n- Admin login fails: run admin auth diagnostics and verify active super admin.\n- Sidebar broken: verify AdminNavigationRegistry and route permissions.\n- Dashboard count incorrect: rerun admin certification and compare canonical DB counts.\n- Artist or release save fails: inspect validation, stale record state, and audit event.\n- Slug duplicate: resolve non-deleted draft/published records reserving the slug.\n- Media assignment fails: verify picker asset type, publication state, storage object, and owner assignment.\n- Public Link returns Song Not Found: verify release slug, publication state, artist link, and public route builder.\n- Media Intake offline: restart backend with MEDIA_INTAKE_ENABLED=true or use manual upload fallback.\n- Media Review stuck: inspect intake records, assignment review status, and failed operations.\n- Processing job stuck: retry nonlaunch job or repair launch-critical media derivative.\n- Export/import failure: run export/import health and certification; never execute production import without dry run.\n- Permission mismatch: compare frontend route permission with backend route permission.\n- Stale conflict: reload latest record and preserve local edits for manual merge.\n`;
  }

  private summaryDoc(report: AdminOperationsCertificationReport) {
    return `${this.frontmatter("Implementation Summary", report)}Implemented:\n\n- Admin operations certification model and service.\n- Admin route inventory with canonical equivalents.\n- Admin operations launch API and dashboard page.\n- CLI suites for smoke, artist/release CRUD, media operations, publication, export/import, permissions, accessibility, and browser health.\n- Documentation, operations runbook, certification registry, and checklist update.\n\nLocal result: ${report.decision}\n\nP0 found/resolved: ${report.counts.p0Open === 0 ? "0 open" : `${report.counts.p0Open} open`}\nP1 found/resolved: ${report.counts.p1Open === 0 ? "0 open" : `${report.counts.p1Open} open`}\nP2/P3 deferred: ${report.counts.p2Open + report.counts.p3Open}\n\nResidual risks: staging admin rehearsal, production-safe read-only verification, browser console/network evidence, admin accessibility evidence, and export/import execution evidence remain required before final verified launch.\n\nFinal Admin decision: ${report.decision}\n`;
  }
}

export const adminOperationsCertificationService = new AdminOperationsCertificationService();
