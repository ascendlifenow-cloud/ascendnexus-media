import { getBackendConfig } from "../../config/backendConfig";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import type { ArtistRecord } from "../../models/artists/ArtistModel";
import type { MediaAsset, MediaStorageObject } from "../../models/mediaModels";
import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import { deploymentHealthService } from "../deployment/DeploymentHealthService";
import { emailDeliveryService } from "../email/EmailDeliveryService";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaIntakeConfigService } from "../mediaIntake/MediaIntakeConfigService";
import { memberIdentityService } from "../members/MemberIdentityService";

export type LaunchBlockerSeverity = "P0" | "P1" | "P2" | "P3";
export type LaunchBlockerStatus = "open" | "mitigated" | "accepted" | "resolved";
export type LaunchReadinessDecision = "READY" | "READY_WITH_POST_LAUNCH_ITEMS" | "FUNCTIONALLY_BLOCKED";

export interface LaunchBlocker {
  blockerId: string;
  severity: LaunchBlockerSeverity;
  status: LaunchBlockerStatus;
  title: string;
  area: string;
  evidence: string;
  remediation: string;
}

export interface LaunchReadinessCheck {
  checkId: string;
  area: string;
  status: "pass" | "warn" | "fail";
  summary: string;
  evidence: Record<string, unknown>;
}

export interface LaunchReadinessReport {
  promptId: "ANM-WEB-126";
  generatedAt: string;
  environment: string;
  decision: LaunchReadinessDecision;
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
  checks: LaunchReadinessCheck[];
  blockers: LaunchBlocker[];
  summary: {
    publishedArtists: number;
    publishedReleases: number;
    mediaAssets: number;
    publicMediaAssets: number;
    privateMediaAssets: number;
    adminUsers: number;
    memberAccounts: number;
    storageProvider: string;
    cdnEnabled: boolean;
    mediaIntakeEnabled: boolean;
  };
}

const OPEN_STATUSES: LaunchBlockerStatus[] = ["open", "mitigated"];

const isOpen = (blocker: LaunchBlocker) => OPEN_STATUSES.includes(blocker.status);

const publicSafeUrl = (value?: string) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    !normalized.includes("/private/") &&
    !normalized.includes("private/") &&
    !normalized.includes("signed") &&
    (normalized.includes(`/${mediaBackendConfig.publicPrefix}/`) || normalized.startsWith(`${mediaBackendConfig.publicPrefix}/`) || normalized.startsWith("/media/public/"))
  );
};

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

export class ProductionLaunchBlockerService {
  async getReport(): Promise<LaunchReadinessReport> {
    const [data, deploymentHealth, memberHealth, emailHealth] = await Promise.all([
      jsonDatabase.read(),
      deploymentHealthService.getHealth(),
      memberIdentityService.getHealth(),
      emailDeliveryService.getHealth(),
    ]);
    const config = getBackendConfig();
    const publishedArtists = data.artistRecords.filter((artist) => this.isPublishedArtist(artist));
    const publishedReleases = data.releaseRecords.filter((release) => this.isPublishedRelease(release));
    const activeAdminUsers = data.adminUsers.filter((user) => user.status === "active");
    const publicAssets = data.mediaAssets.filter((asset) => publicSafeUrl(asset.url) || publicSafeUrl(asset.thumbnailUrl) || publicSafeUrl(asset.largeUrl));
    const privateAssets = data.mediaStorageObjects.filter((object) => object.accessLevel === "private" || object.storagePath.startsWith(`${mediaBackendConfig.privatePrefix}/`));
    const blockers: LaunchBlocker[] = [];
    const checks: LaunchReadinessCheck[] = [];

    this.addCheck(checks, blockers, {
      checkId: "launch.admin_auth",
      area: "Authentication",
      pass: activeAdminUsers.length > 0,
      severity: "P0",
      title: "No active administrator exists",
      passSummary: `${activeAdminUsers.length} active admin account(s) available.`,
      failSummary: "No active admin account is available for launch operations.",
      remediation: "Seed or restore at least one active super administrator and rerun admin login smoke.",
      evidence: { activeAdminUsers: activeAdminUsers.length, totalAdminUsers: data.adminUsers.length },
    });

    this.addCheck(checks, blockers, {
      checkId: "launch.public_catalog",
      area: "Public Content",
      pass: publishedArtists.length > 0 && publishedReleases.length > 0,
      severity: "P0",
      title: "Public catalog is empty",
      passSummary: `${publishedArtists.length} published artist(s), ${publishedReleases.length} published release(s).`,
      failSummary: "Published artist or release count is zero.",
      remediation: "Publish at least one public artist and release through the publication workflow.",
      evidence: { publishedArtists: publishedArtists.length, publishedReleases: publishedReleases.length },
    });

    const releaseSlugs = data.releaseRecords.filter((release) => release.status !== "deleted").map((release) => release.slug);
    const artistSlugs = data.artistRecords.filter((artist) => artist.status !== "deleted").map((artist) => artist.slug);
    const duplicateReleaseSlugs = uniqueDuplicates(releaseSlugs);
    const duplicateArtistSlugs = uniqueDuplicates(artistSlugs);
    this.addCheck(checks, blockers, {
      checkId: "launch.slug_uniqueness",
      area: "Data Integrity",
      pass: duplicateReleaseSlugs.length === 0 && duplicateArtistSlugs.length === 0,
      severity: "P1",
      title: "Duplicate public slugs can block create/edit flows",
      passSummary: "Artist and release slugs are unique among non-deleted records.",
      failSummary: "Duplicate artist or release slugs exist.",
      remediation: "Resolve duplicate slugs or archive/delete stale drafts that reserve the same route.",
      evidence: { duplicateReleaseSlugs, duplicateArtistSlugs },
    });

    const artistIds = new Set(data.artistRecords.map((artist) => artist.artistId));
    const orphanedPublishedReleases = publishedReleases.filter((release) => !artistIds.has(release.artistId));
    this.addCheck(checks, blockers, {
      checkId: "launch.release_artist_links",
      area: "Release Publishing",
      pass: orphanedPublishedReleases.length === 0,
      severity: "P1",
      title: "Published releases reference missing artists",
      passSummary: "Published releases reference existing artists.",
      failSummary: `${orphanedPublishedReleases.length} published release(s) reference missing artists.`,
      remediation: "Attach the release to a published artist or archive the invalid release.",
      evidence: { orphanedReleaseIds: orphanedPublishedReleases.map((release) => release.releaseId).slice(0, 25) },
    });

    const publishedReleasesWithUnsafeArtwork = publishedReleases.filter((release) => release.coverArtUrl && !publicSafeUrl(release.coverArtUrl));
    this.addCheck(checks, blockers, {
      checkId: "launch.public_artwork_safety",
      area: "Media Safety",
      pass: publishedReleasesWithUnsafeArtwork.length === 0,
      severity: "P1",
      title: "Published release artwork is not public-safe",
      passSummary: "Published release artwork URLs are public-safe where present.",
      failSummary: `${publishedReleasesWithUnsafeArtwork.length} published release(s) have unsafe cover art URLs.`,
      remediation: "Promote assigned cover art to public media and update release projections.",
      evidence: { releaseIds: publishedReleasesWithUnsafeArtwork.map((release) => release.releaseId).slice(0, 25) },
    });

    const fullSongPublicExposure = data.mediaAssets.filter((asset) => this.isFullSongAsset(asset) && publicSafeUrl(asset.url));
    this.addCheck(checks, blockers, {
      checkId: "launch.full_song_public_exposure",
      area: "Protected Media",
      pass: fullSongPublicExposure.length === 0,
      severity: "P0",
      title: "Full song asset is public-exposed",
      passSummary: "No full-song media asset has a public-safe direct URL.",
      failSummary: `${fullSongPublicExposure.length} full-song asset(s) expose public URLs.`,
      remediation: "Demote full-song media to private storage and regenerate protected delivery records.",
      evidence: { assetIds: fullSongPublicExposure.map((asset) => asset.assetId).slice(0, 25) },
    });

    this.addCheck(checks, blockers, {
      checkId: "launch.member_identity",
      area: "Member Identity",
      pass: Boolean(memberHealth.registrationReady && memberHealth.loginReady && memberHealth.sessionStoreReady && memberHealth.auditEventsReady),
      severity: "P1",
      title: "Member identity health is degraded",
      passSummary: "Member registration, login, sessions, and audit readiness are healthy.",
      failSummary: "Member identity health is not fully healthy.",
      remediation: "Run npm run test:member-auth and fix registration, login, session, or audit failures.",
      evidence: memberHealth as Record<string, unknown>,
    });

    this.addCheck(checks, blockers, {
      checkId: "launch.email_delivery",
      area: "Email",
      pass: Boolean(emailHealth.emailProviderAvailable && emailHealth.emailQueueAvailable),
      severity: "P1",
      title: "Production email delivery is not verified",
      passSummary: "Email provider and queue are available.",
      failSummary: "Email provider is disabled or unavailable; verification emails cannot be proven deliverable.",
      remediation: "Configure production email provider/from address, start the delivery worker, and run email:test-delivery.",
      evidence: emailHealth as Record<string, unknown>,
    });

    const intakeConfig = mediaIntakeConfigService.getConfig();
    this.addCheck(checks, blockers, {
      checkId: "launch.media_intake_enabled",
      area: "Media Intake",
      pass: intakeConfig.enabled,
      severity: "P2",
      title: "Media intake watcher disabled for this process",
      passSummary: "Media intake watcher is enabled in current configuration.",
      failSummary: "Media intake watcher is disabled for this process.",
      remediation: "Start dev/staging with MEDIA_INTAKE_ENABLED=true when testing watched-folder ingestion.",
      evidence: { enabled: intakeConfig.enabled, watchRoot: intakeConfig.watchRoot, environment: config.app.environment },
    });

    const missingStorageObjects = data.mediaAssets.filter((asset) => !this.hasStorageObject(data.mediaStorageObjects, asset.assetId) && asset.status !== "deleted");
    this.addCheck(checks, blockers, {
      checkId: "launch.media_storage_links",
      area: "Media Library",
      pass: missingStorageObjects.length === 0,
      severity: "P2",
      title: "Media asset records are missing storage objects",
      passSummary: "Media asset records have matching storage objects.",
      failSummary: `${missingStorageObjects.length} media asset record(s) are missing storage objects.`,
      remediation: "Run storage reconciliation and hard-delete or repair orphaned asset records.",
      evidence: { assetIds: missingStorageObjects.map((asset) => asset.assetId).slice(0, 25) },
    });

    this.addCheck(checks, blockers, {
      checkId: "launch.deployment_health",
      area: "Deployment",
      pass: Boolean(deploymentHealth.ready),
      severity: config.app.isProduction || config.app.isStaging ? "P1" : "P2",
      title: "Deployment readiness health is blocked",
      passSummary: "Deployment health reports ready.",
      failSummary: "Deployment health reports not ready.",
      remediation: "Resolve deployment configuration, database, worker, or security launch-gate failures.",
      evidence: deploymentHealth as Record<string, unknown>,
    });

    const counts = this.count(blockers, checks);
    const decision = counts.p0Open > 0 || counts.p1Open > 0
      ? "FUNCTIONALLY_BLOCKED"
      : counts.p2Open > 0 || counts.p3Open > 0
        ? "READY_WITH_POST_LAUNCH_ITEMS"
        : "READY";

    return {
      promptId: "ANM-WEB-126",
      generatedAt: new Date().toISOString(),
      environment: config.app.environment,
      decision,
      finalMessage: this.finalMessage(decision, counts),
      counts,
      checks,
      blockers,
      summary: {
        publishedArtists: publishedArtists.length,
        publishedReleases: publishedReleases.length,
        mediaAssets: data.mediaAssets.length,
        publicMediaAssets: publicAssets.length,
        privateMediaAssets: privateAssets.length,
        adminUsers: activeAdminUsers.length,
        memberAccounts: data.memberAccounts.length,
        storageProvider: config.storage.provider,
        cdnEnabled: config.cdn.enabled,
        mediaIntakeEnabled: intakeConfig.enabled,
      },
    };
  }

  private isPublishedArtist(artist: ArtistRecord) {
    return artist.status === "active" && artist.publicationState === "published" && artist.publicVisibility;
  }

  private isPublishedRelease(release: SongReleaseRecord) {
    return release.status === "published" && release.publicationState === "published" && release.publicVisibility;
  }

  private isFullSongAsset(asset: MediaAsset) {
    const type = `${asset.assetType} ${asset.metadata?.intendedUse ?? ""} ${asset.metadata?.mediaRole ?? ""}`.toLowerCase();
    return type.includes("full_song") || type.includes("full song");
  }

  private hasStorageObject(objects: MediaStorageObject[], assetId: string) {
    return objects.some((object) => object.assetId === assetId && object.status !== "deleted");
  }

  private addCheck(checks: LaunchReadinessCheck[], blockers: LaunchBlocker[], input: {
    checkId: string;
    area: string;
    pass: boolean;
    severity: LaunchBlockerSeverity;
    title: string;
    passSummary: string;
    failSummary: string;
    remediation: string;
    evidence: Record<string, unknown>;
  }) {
    checks.push({
      checkId: input.checkId,
      area: input.area,
      status: input.pass ? "pass" : input.severity === "P2" || input.severity === "P3" ? "warn" : "fail",
      summary: input.pass ? input.passSummary : input.failSummary,
      evidence: input.evidence,
    });
    if (!input.pass) {
      blockers.push({
        blockerId: input.checkId,
        severity: input.severity,
        status: "open",
        title: input.title,
        area: input.area,
        evidence: input.failSummary,
        remediation: input.remediation,
      });
    }
  }

  private count(blockers: LaunchBlocker[], checks: LaunchReadinessCheck[]): LaunchReadinessReport["counts"] {
    return {
      p0Open: blockers.filter((blocker) => blocker.severity === "P0" && isOpen(blocker)).length,
      p1Open: blockers.filter((blocker) => blocker.severity === "P1" && isOpen(blocker)).length,
      p2Open: blockers.filter((blocker) => blocker.severity === "P2" && isOpen(blocker)).length,
      p3Open: blockers.filter((blocker) => blocker.severity === "P3" && isOpen(blocker)).length,
      checksPassed: checks.filter((check) => check.status === "pass").length,
      checksWarning: checks.filter((check) => check.status === "warn").length,
      checksFailed: checks.filter((check) => check.status === "fail").length,
    };
  }

  private finalMessage(decision: LaunchReadinessDecision, counts: LaunchReadinessReport["counts"]) {
    if (decision === "READY") return "No open P0, P1, P2, or P3 launch issues were detected by the local production blocker audit.";
    if (decision === "READY_WITH_POST_LAUNCH_ITEMS") return `No open P0/P1 blockers remain. ${counts.p2Open + counts.p3Open} lower-priority launch item(s) remain for post-launch follow-up.`;
    return `Functional launch is blocked by ${counts.p0Open} P0 and ${counts.p1Open} P1 open issue(s).`;
  }
}

export const productionLaunchBlockerService = new ProductionLaunchBlockerService();
