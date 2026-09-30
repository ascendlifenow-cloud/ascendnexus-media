import { releaseVerificationRepository, releaseWorkflowRepository } from "../../repositories/operations/OperationsRepository";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";
import { publicSitemapService } from "../seo/PublicSitemapService";
import { productionHealthCheckRegistry } from "../observability/ProductionHealthCheckRegistry";
import { storageReconciliationService } from "../reliability/StorageReconciliationService";
import { productionConsistencyVerificationService } from "../reliability/ProductionConsistencyVerificationService";
import { asRecord, asString, id, nowIso } from "./operationsShared";

const check = (name: string, passed: boolean, message: string, warning = false) => ({
  checkId: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
  name,
  status: passed ? "passed" as const : warning ? "warning" as const : "failed" as const,
  message,
  checkedAt: nowIso(),
});

export class ReleaseVerificationService {
  async listVerifications() {
    return releaseVerificationRepository.list({ sort: "verifiedAt", direction: "desc", includeArchived: true, limit: 100 });
  }

  async verify(payload: unknown, actorId = "system") {
    const body = asRecord(payload);
    const workflowId = asString(body.workflowId) || undefined;
    const workflow = workflowId ? await releaseWorkflowRepository.get(workflowId) : null;
    const entityType = asString(body.entityType, workflow?.entityType ?? (workflow?.releaseId ? "release" : "site"));
    const entityId = asString(body.entityId, workflow?.entityId ?? workflow?.releaseId ?? "");
    const [artists, releases, gallery, sitemap, health, storage, consistency] = await Promise.all([
      publicContentDeliveryService.listPublicArtists(),
      publicContentDeliveryService.listPublicReleases(),
      publicContentDeliveryService.listPublicGalleryItems(),
      publicSitemapService.verifySitemaps(),
      productionHealthCheckRegistry.runAllChecks(),
      storageReconciliationService.reconcile(),
      productionConsistencyVerificationService.buildConsistencyReport(),
    ]);

    const targetRelease = entityType === "release" && entityId ? releases.find((release) => release.releaseId === entityId || release.slug === entityId) : undefined;
    const checks = [
      check("Artist page", entityType !== "release" || Boolean(targetRelease && artists.some((artist) => artist.artistId === targetRelease.artistId)), "Assigned public artist is available."),
      check("Song page", entityType !== "release" || Boolean(targetRelease), "Release detail is available through public delivery."),
      check("Gallery", entityType !== "gallery_item" || gallery.some((item) => item.galleryItemId === entityId || item.slug === entityId), "Gallery item is available through public delivery."),
      check("Audio Preview", entityType !== "release" || Boolean(targetRelease?.audioPreviewUrl), "Public release has a preview URL.", true),
      check("Metadata", consistency.status === "healthy", "Public projections and metadata consistency check is healthy."),
      check("SEO", sitemap.status === "passed", sitemap.blockingIssues[0] ?? "Sitemap verification passed."),
      check("Images", entityType !== "release" || Boolean(targetRelease?.coverArtUrl), "Public image exists.", true),
      check("CDN", storage.status !== "failed", "Storage/CDN reconciliation is not failing."),
      check("Search", consistency.status === "healthy", "Search/public consistency report has no blocking issues."),
      check("Homepage", health.overallStatus !== "unavailable", "Production health registry reports public services available."),
      check("Broken Links", sitemap.status === "passed", "Sitemap URLs are valid for current published content."),
      check("Analytics", true, "Analytics checkpoint recorded as operational readiness; business analytics remains consent controlled.", true),
      check("Monitoring", health.overallStatus !== "unavailable", "Monitoring-backed health checks are current."),
    ];
    const blockingIssues = checks.filter((item) => item.status === "failed").map((item) => `${item.name}: ${item.message}`);
    const warnings = checks.filter((item) => item.status === "warning").map((item) => `${item.name}: ${item.message}`);
    const verifiedAt = nowIso();
    const record = await releaseVerificationRepository.create({
      verificationId: id("release_verification"),
      workflowId,
      entityType,
      entityId,
      status: blockingIssues.length ? "failed" : warnings.length ? "warning" : "passed",
      checks,
      blockingIssues,
      warnings,
      verifiedAt,
      createdBy: actorId,
      createdAt: verifiedAt,
      metadata: { healthStatus: health.overallStatus },
      schemaVersion: 1,
    });
    if (workflowId) {
      await releaseWorkflowRepository.update(workflowId, {
        lastVerificationId: record.verificationId,
        status: blockingIssues.length ? "paused" : "verified",
        failureReason: blockingIssues[0],
      });
    }
    return record;
  }
}

export const releaseVerificationService = new ReleaseVerificationService();
