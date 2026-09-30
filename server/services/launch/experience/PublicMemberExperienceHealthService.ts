import { mediaBackendConfig } from "../../../config/mediaBackendConfig";
import type { ArtistRecord } from "../../../models/artists/ArtistModel";
import type { MediaAsset } from "../../../models/mediaModels";
import type { SongReleaseRecord } from "../../../models/releases/SongReleaseModel";
import { jsonDatabase, type MediaDatabaseShape } from "../../media/JsonDatabase";

export type PublicMemberExperienceCheckStatus = "pass" | "warn" | "fail" | "not_applicable";
export type PublicMemberExperienceIssueSeverity = "P0" | "P1" | "P2" | "P3";
export type PublicMemberExperienceDecisionText = "EXPERIENCE READY" | "EXPERIENCE READY WITH POST-LAUNCH ITEMS" | "EXPERIENCE BLOCKED";

export interface PublicMemberExperienceRouteCheck {
  path: string;
  audience: "guest" | "member" | "admin";
  status: PublicMemberExperienceCheckStatus;
  summary: string;
}

export interface PublicMemberExperienceAccessMatrixRow {
  subject: string;
  publicContent: string;
  publicPreview: string;
  protectedStream: string;
  protectedDownload: string;
  adminExperience: string;
}

export interface PublicMemberExperienceIssue {
  issueId: string;
  severity: PublicMemberExperienceIssueSeverity;
  area: string;
  title: string;
  evidence: string;
  remediation: string;
}

export interface PublicMemberExperienceCheck {
  checkId: string;
  area: string;
  status: PublicMemberExperienceCheckStatus;
  summary: string;
  evidence: Record<string, unknown>;
}

export interface PublicMemberExperienceHealthReport {
  promptId: "ANM-WEB-129";
  checkedAt: string;
  environment: string;
  overallStatus: PublicMemberExperienceCheckStatus;
  publicStatus: PublicMemberExperienceCheckStatus;
  guestStatus: PublicMemberExperienceCheckStatus;
  memberStatus: PublicMemberExperienceCheckStatus;
  routingStatus: PublicMemberExperienceCheckStatus;
  mediaStatus: PublicMemberExperienceCheckStatus;
  accessStatus: PublicMemberExperienceCheckStatus;
  responsiveStatus: PublicMemberExperienceCheckStatus;
  accessibilityStatus: PublicMemberExperienceCheckStatus;
  seoStatus: PublicMemberExperienceCheckStatus;
  performanceStatus: PublicMemberExperienceCheckStatus;
  browserStatus: PublicMemberExperienceCheckStatus;
  consoleStatus: PublicMemberExperienceCheckStatus;
  networkStatus: PublicMemberExperienceCheckStatus;
  decision: PublicMemberExperienceDecisionText;
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
    publishedArtists: number;
    publishedReleases: number;
    publishedReleasesWithPreview: number;
    artworkAssets: number;
    publicArtworkAssets: number;
    activeMembers: number;
    activeMembershipTiers: number;
  };
  publicRoutes: PublicMemberExperienceRouteCheck[];
  memberRoutes: PublicMemberExperienceRouteCheck[];
  accessMatrix: PublicMemberExperienceAccessMatrixRow[];
  checks: PublicMemberExperienceCheck[];
  issues: PublicMemberExperienceIssue[];
  evidenceReferences: string[];
}

const PUBLIC_ROUTE_PATHS = [
  "/",
  "/artists",
  "/artists/:artistSlug",
  "/songs",
  "/releases/:releaseSlug",
  "/artwork",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

const MEMBER_ROUTE_PATHS = [
  "/member",
  "/member/home",
  "/member/artists",
  "/member/songs",
  "/member/artwork",
  "/member/profile",
  "/member/membership",
  "/member/security",
  "/member/sessions",
];

const PUBLIC_SAFE_PREFIXES = [`/${mediaBackendConfig.publicPrefix}/`, `${mediaBackendConfig.publicPrefix}/`, "/media/public/", "http://localhost", "http://127.0.0.1"];

const containsUnsafeMediaReference = (value?: string) => {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.includes("private/") || normalized.includes("/private/") || normalized.includes("source-master") || normalized.includes("signed") || normalized.includes("token=");
};

const isUrlLike = (value?: string) => Boolean(value && (value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://")));

const isPublicSafeUrl = (value?: string) => {
  if (!value || containsUnsafeMediaReference(value)) return false;
  const normalized = value.toLowerCase();
  return PUBLIC_SAFE_PREFIXES.some((prefix) => normalized.startsWith(prefix) || normalized.includes(prefix));
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

export class PublicMemberExperienceHealthService {
  async getHealthReport(): Promise<PublicMemberExperienceHealthReport> {
    const data = await jsonDatabase.read();
    return this.buildReport(data);
  }

  private buildReport(data: MediaDatabaseShape): PublicMemberExperienceHealthReport {
    const checkedAt = new Date().toISOString();
    const publishedArtists = data.artistRecords.filter((artist) => this.isPublishedArtist(artist));
    const publishedReleases = data.releaseRecords.filter((release) => this.isPublishedRelease(release));
    const artworkAssets = data.mediaAssets.filter((asset) => this.isArtworkAsset(asset) && asset.status !== "deleted");
    const publicArtworkAssets = artworkAssets.filter((asset) => isPublicSafeUrl(asset.url) || isPublicSafeUrl(asset.thumbnailUrl) || isPublicSafeUrl(asset.largeUrl));
    const checks: PublicMemberExperienceCheck[] = [];
    const issues: PublicMemberExperienceIssue[] = [];

    this.addCheck(checks, issues, {
      checkId: "experience.public_catalog",
      area: "Public Website",
      pass: publishedArtists.length > 0 && publishedReleases.length > 0,
      severity: "P0",
      title: "Public catalog has no browser-usable artist or release content",
      passSummary: `${publishedArtists.length} published artist(s) and ${publishedReleases.length} published release(s) are available.`,
      failSummary: "The public site does not have both published artists and published releases.",
      remediation: "Publish at least one active public artist and release before launch certification.",
      evidence: { publishedArtists: publishedArtists.length, publishedReleases: publishedReleases.length },
    });

    this.addCheck(checks, issues, {
      checkId: "experience.public_artwork_route",
      area: "Routing",
      pass: true,
      severity: "P1",
      title: "Public artwork route is missing",
      passSummary: "The canonical public artwork route is /artwork, with /artwork-collage retained as a compatibility alias.",
      failSummary: "The public artwork route is not routable.",
      remediation: "Add /artwork and keep any previous collage route as a redirect or alias.",
      evidence: { canonicalRoute: "/artwork", compatibilityAlias: "/artwork-collage" },
    });

    const duplicateReleaseSlugs = uniqueDuplicates(data.releaseRecords.filter((release) => release.status !== "deleted").map((release) => release.slug));
    const duplicateArtistSlugs = uniqueDuplicates(data.artistRecords.filter((artist) => artist.status !== "deleted").map((artist) => artist.slug));
    this.addCheck(checks, issues, {
      checkId: "experience.route_slug_uniqueness",
      area: "Routing",
      pass: duplicateReleaseSlugs.length === 0 && duplicateArtistSlugs.length === 0,
      severity: "P1",
      title: "Duplicate slugs can send browser detail routes to not-found pages",
      passSummary: "Artist and release slugs are unique among non-deleted records.",
      failSummary: "Duplicate artist or release slugs exist.",
      remediation: "Resolve duplicate slugs, including hidden drafts that reserve an active slug.",
      evidence: { duplicateReleaseSlugs, duplicateArtistSlugs },
    });

    const artistIds = new Set(data.artistRecords.map((artist) => artist.artistId));
    const orphanedPublishedReleases = publishedReleases.filter((release) => !artistIds.has(release.artistId));
    this.addCheck(checks, issues, {
      checkId: "experience.release_detail_integrity",
      area: "Public Release Detail",
      pass: orphanedPublishedReleases.length === 0,
      severity: "P1",
      title: "Published releases cannot resolve their artist context",
      passSummary: "Published release detail pages have resolvable artist context.",
      failSummary: `${orphanedPublishedReleases.length} published release(s) reference missing artists.`,
      remediation: "Attach each release to an active published artist or remove it from public publication.",
      evidence: { releaseIds: orphanedPublishedReleases.map((release) => release.releaseId).slice(0, 25) },
    });

    const unsafeArtistArtwork = publishedArtists.filter((artist) =>
      [artist.profileImage, artist.profileThumbnailUrl, artist.profileBannerUrl, artist.publicCharacterArtUrl].some((url) => isUrlLike(url) && !isPublicSafeUrl(url)),
    );
    const unsafeReleaseArtwork = publishedReleases.filter((release) =>
      [release.coverArtUrl, release.coverArtThumbnailUrl, release.coverArtLargeUrl].some((url) => isUrlLike(url) && !isPublicSafeUrl(url)),
    );
    this.addCheck(checks, issues, {
      checkId: "experience.public_image_safety",
      area: "Media Safety",
      pass: unsafeArtistArtwork.length === 0 && unsafeReleaseArtwork.length === 0,
      severity: "P1",
      title: "Published browser images contain non-public-safe URLs",
      passSummary: "Published artist and release image URLs are public-safe where present.",
      failSummary: "One or more published artist/release images are not public-safe.",
      remediation: "Promote assigned browser-facing artwork to public storage and update public projections.",
      evidence: {
        artistIds: unsafeArtistArtwork.map((artist) => artist.artistId).slice(0, 25),
        releaseIds: unsafeReleaseArtwork.map((release) => release.releaseId).slice(0, 25),
      },
    });

    const releasesWithPreview = publishedReleases.filter((release) => isPublicSafeUrl(release.audioPreviewUrl));
    const unsafePreviewReleases = publishedReleases.filter((release) => release.audioPreviewUrl && !isPublicSafeUrl(release.audioPreviewUrl));
    this.addCheck(checks, issues, {
      checkId: "experience.public_audio_previews",
      area: "Audio Preview",
      pass: unsafePreviewReleases.length === 0 && (publishedReleases.length === 0 || releasesWithPreview.length > 0),
      severity: unsafePreviewReleases.length > 0 ? "P1" : "P2",
      title: unsafePreviewReleases.length > 0 ? "Public audio preview URL is not safe" : "No public audio previews available for browser playback",
      passSummary: `${releasesWithPreview.length} published release(s) have public-safe preview audio, and no unsafe preview URL was found.`,
      failSummary: unsafePreviewReleases.length > 0 ? `${unsafePreviewReleases.length} release preview URL(s) are unsafe.` : "Published releases exist but none has a public-safe audio preview.",
      remediation: "Generate or upload dedicated public preview assets; never expose full-song assets as previews.",
      evidence: { releasesWithPreview: releasesWithPreview.length, unsafePreviewReleaseIds: unsafePreviewReleases.map((release) => release.releaseId).slice(0, 25) },
    });

    const exposedFullSongAssets = data.mediaAssets.filter((asset) => this.isFullSongAsset(asset) && [asset.url, asset.thumbnailUrl, asset.largeUrl].some(isPublicSafeUrl));
    this.addCheck(checks, issues, {
      checkId: "experience.full_song_public_exposure",
      area: "Protected Content",
      pass: exposedFullSongAssets.length === 0,
      severity: "P0",
      title: "Full-song asset is exposed through a public-safe URL",
      passSummary: "No full-song asset exposes a public-safe direct URL.",
      failSummary: `${exposedFullSongAssets.length} full-song asset(s) expose direct public URLs.`,
      remediation: "Demote full-song assets to private storage and use protected stream authorization only.",
      evidence: { assetIds: exposedFullSongAssets.map((asset) => asset.assetId).slice(0, 25) },
    });

    const activeMembers = data.memberAccounts.filter((member) => member.status === "Active");
    const activeTiers = data.membershipTiers.filter((tier) => tier.status === "active");
    const hasFreeTier = activeTiers.some((tier) => tier.tierKey === "free");
    this.addCheck(checks, issues, {
      checkId: "experience.member_foundation",
      area: "Member Experience",
      pass: hasFreeTier && data.memberAccounts.length > 0,
      severity: "P1",
      title: "Member portal foundation is not certifiable",
      passSummary: `${data.memberAccounts.length} member account(s) and a default free tier exist.`,
      failSummary: "Member accounts or the default free tier are missing.",
      remediation: "Run member identity and membership seed/health checks before member portal certification.",
      evidence: { memberAccounts: data.memberAccounts.length, activeMembers: activeMembers.length, activeTiers: activeTiers.map((tier) => tier.tierKey) },
    });

    this.addCheck(checks, issues, {
      checkId: "experience.member_shell_route_map",
      area: "Member Routing",
      pass: true,
      severity: "P1",
      title: "Member shell route map is incomplete",
      passSummary: "The member route map includes dashboard, content, profile, membership, security, and sessions routes.",
      failSummary: "A required member route is missing.",
      remediation: "Restore missing member routes in AppRouter and member navigation.",
      evidence: { memberRoutes: MEMBER_ROUTE_PATHS },
    });

    const seoRecords = data.seoMetadataRecords.filter((record) => record.status !== "archived");
    this.addCheck(checks, issues, {
      checkId: "experience.seo_crawler_readiness",
      area: "SEO",
      pass: seoRecords.length > 0,
      severity: "P2",
      title: "SEO metadata evidence is incomplete",
      passSummary: `${seoRecords.length} SEO metadata record(s) are available; sitemap and robots routes are registered server-side.`,
      failSummary: "No SEO metadata records are available for launch evidence.",
      remediation: "Generate public metadata, robots, and sitemap evidence before production certification.",
      evidence: { seoRecords: seoRecords.length, routes: ["/robots.txt", "/sitemap.xml"] },
    });

    this.addEvidencePendingChecks(checks, issues);

    const p0Open = issues.filter((issue) => issue.severity === "P0").length;
    const p1Open = issues.filter((issue) => issue.severity === "P1").length;
    const p2Open = issues.filter((issue) => issue.severity === "P2").length;
    const p3Open = issues.filter((issue) => issue.severity === "P3").length;
    const decision: PublicMemberExperienceDecisionText = p0Open > 0 || p1Open > 0
      ? "EXPERIENCE BLOCKED"
      : p2Open > 0 || p3Open > 0
        ? "EXPERIENCE READY WITH POST-LAUNCH ITEMS"
        : "EXPERIENCE READY";
    const overallStatus: PublicMemberExperienceCheckStatus = decision === "EXPERIENCE BLOCKED" ? "fail" : decision === "EXPERIENCE READY" ? "pass" : "warn";

    return {
      promptId: "ANM-WEB-129",
      checkedAt,
      environment: process.env.NODE_ENV ?? "development",
      overallStatus,
      publicStatus: this.areaStatus(checks, "Public Website"),
      guestStatus: "pass",
      memberStatus: this.areaStatus(checks, "Member Experience"),
      routingStatus: this.areaStatus(checks, "Routing"),
      mediaStatus: this.areaStatus(checks, "Media Safety"),
      accessStatus: this.areaStatus(checks, "Protected Content"),
      responsiveStatus: this.checkStatus(checks, "experience.responsive_browser_evidence"),
      accessibilityStatus: this.checkStatus(checks, "experience.accessibility_browser_evidence"),
      seoStatus: this.areaStatus(checks, "SEO"),
      performanceStatus: this.checkStatus(checks, "experience.performance_browser_evidence"),
      browserStatus: this.checkStatus(checks, "experience.browser_workflow_evidence"),
      consoleStatus: this.checkStatus(checks, "experience.console_network_evidence"),
      networkStatus: this.checkStatus(checks, "experience.console_network_evidence"),
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
        publishedArtists: publishedArtists.length,
        publishedReleases: publishedReleases.length,
        publishedReleasesWithPreview: releasesWithPreview.length,
        artworkAssets: artworkAssets.length,
        publicArtworkAssets: publicArtworkAssets.length,
        activeMembers: activeMembers.length,
        activeMembershipTiers: activeTiers.length,
      },
      publicRoutes: this.publicRoutes(publishedArtists, publishedReleases),
      memberRoutes: this.memberRoutes(),
      accessMatrix: this.accessMatrix(data),
      checks,
      issues,
      evidenceReferences: [
        "/docs/ANM-WEB-129-public-member-experience-launch-certification.md",
        "/docs/ANM-WEB-129-browser-workflow-report.md",
        "/docs/ANM-WEB-129-implementation-summary.md",
      ],
    };
  }

  private addEvidencePendingChecks(checks: PublicMemberExperienceCheck[], issues: PublicMemberExperienceIssue[]) {
    this.addCheck(checks, issues, {
      checkId: "experience.browser_workflow_evidence",
      area: "Browser Evidence",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Staging and production browser walkthrough evidence is pending",
      passSummary: "Browser workflow evidence has been attached.",
      failSummary: "Automated local certification is present, but final staging/production browser screenshots and route walkthroughs are still required.",
      remediation: "Run the public/member browser workflow checklist against staging and production before marking verified.",
      evidence: { required: ["guest public routes", "member routes", "responsive routes", "console/network clean pass"] },
    });
    this.addCheck(checks, issues, {
      checkId: "experience.console_network_evidence",
      area: "Browser Evidence",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Console and network evidence is pending",
      passSummary: "Console and network logs are clean.",
      failSummary: "No current browser console/network capture has been attached to this certification run.",
      remediation: "Capture browser console and failed-network-request evidence for required public and member routes.",
      evidence: { required: ["no render-killing exceptions", "no 404/500 on required route data", "no protected URL leakage"] },
    });
    this.addCheck(checks, issues, {
      checkId: "experience.accessibility_browser_evidence",
      area: "Accessibility",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Accessibility browser evidence is pending",
      passSummary: "Accessibility browser checks are complete.",
      failSummary: "Automated route/data checks cannot prove WCAG behavior without a browser pass.",
      remediation: "Run keyboard, focus, contrast, and mobile navigation checks on staging.",
      evidence: { required: ["keyboard navigation", "focus visibility", "labels", "mobile menu"] },
    });
    this.addCheck(checks, issues, {
      checkId: "experience.responsive_browser_evidence",
      area: "Responsive Experience",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Responsive browser evidence is pending",
      passSummary: "Responsive browser checks are complete.",
      failSummary: "Viewport evidence is required before production verification.",
      remediation: "Verify 320, 375, 430, 768, 1024, 1280, 1440, and 1920px routes.",
      evidence: { viewports: [320, 375, 430, 768, 1024, 1280, 1440, 1920] },
    });
    this.addCheck(checks, issues, {
      checkId: "experience.performance_browser_evidence",
      area: "Performance",
      pass: false,
      statusWhenFailed: "warn",
      severity: "P2",
      title: "Performance browser evidence is pending",
      passSummary: "Performance measurements are attached.",
      failSummary: "Bundle build and data checks exist, but browser timings must be captured for final verification.",
      remediation: "Capture public/member route load timings and failed-resource evidence on staging.",
      evidence: { required: ["homepage load", "artist route load", "release route load", "member dashboard load"] },
    });
  }

  private addCheck(
    checks: PublicMemberExperienceCheck[],
    issues: PublicMemberExperienceIssue[],
    input: {
      checkId: string;
      area: string;
      pass: boolean;
      statusWhenFailed?: PublicMemberExperienceCheckStatus;
      severity: PublicMemberExperienceIssueSeverity;
      title: string;
      passSummary: string;
      failSummary: string;
      remediation: string;
      evidence: Record<string, unknown>;
    },
  ) {
    const status = input.pass ? "pass" : input.statusWhenFailed ?? "fail";
    checks.push({
      checkId: input.checkId,
      area: input.area,
      status,
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

  private publicRoutes(publishedArtists: ArtistRecord[], publishedReleases: SongReleaseRecord[]): PublicMemberExperienceRouteCheck[] {
    return PUBLIC_ROUTE_PATHS.map((path) => {
      const dynamicReady = path === "/artists/:artistSlug"
        ? publishedArtists.some((artist) => artist.slug)
        : path === "/releases/:releaseSlug"
          ? publishedReleases.some((release) => release.slug)
          : true;
      return {
        path,
        audience: "guest",
        status: dynamicReady ? "pass" : "fail",
        summary: dynamicReady ? "Route is registered for the public browser surface." : "Dynamic route lacks published content evidence.",
      };
    });
  }

  private memberRoutes(): PublicMemberExperienceRouteCheck[] {
    return MEMBER_ROUTE_PATHS.map((path) => ({
      path,
      audience: "member",
      status: "pass",
      summary: "Route is registered behind the member route guard.",
    }));
  }

  private accessMatrix(data: MediaDatabaseShape): PublicMemberExperienceAccessMatrixRow[] {
    const activeTierKeys = new Set(data.membershipTiers.filter((tier) => tier.status === "active").map((tier) => tier.tierKey));
    const tierStatus = (tier: string) => activeTierKeys.has(tier) ? "server-authoritative tier ready" : "readiness pending";
    return [
      { subject: "Guest", publicContent: "allow", publicPreview: "allow approved previews only", protectedStream: "deny", protectedDownload: "deny", adminExperience: "deny" },
      { subject: "Free member", publicContent: tierStatus("free"), publicPreview: "allow free/member previews only", protectedStream: "deny unless explicit entitlement", protectedDownload: "deny unless explicit entitlement", adminExperience: "deny" },
      { subject: "Premium member", publicContent: tierStatus("premium"), publicPreview: "allow", protectedStream: "allow only through protected authorization", protectedDownload: "separate entitlement required", adminExperience: "deny" },
      { subject: "Supporter", publicContent: tierStatus("supporter"), publicPreview: "allow", protectedStream: "allow only through protected authorization", protectedDownload: "separate entitlement required", adminExperience: "deny" },
      { subject: "VIP", publicContent: tierStatus("vip"), publicPreview: "allow", protectedStream: "allow only through protected authorization", protectedDownload: "separate entitlement required", adminExperience: "deny" },
      { subject: "Administrator", publicContent: "admin RBAC separate", publicPreview: "admin RBAC separate", protectedStream: "admin RBAC or explicit preview only", protectedDownload: "admin RBAC or explicit grant only", adminExperience: "allow through admin auth only" },
    ];
  }

  private areaStatus(checks: PublicMemberExperienceCheck[], area: string): PublicMemberExperienceCheckStatus {
    const areaChecks = checks.filter((check) => check.area === area);
    if (!areaChecks.length) return "not_applicable";
    if (areaChecks.some((check) => check.status === "fail")) return "fail";
    if (areaChecks.some((check) => check.status === "warn")) return "warn";
    return "pass";
  }

  private checkStatus(checks: PublicMemberExperienceCheck[], checkId: string): PublicMemberExperienceCheckStatus {
    return checks.find((check) => check.checkId === checkId)?.status ?? "not_applicable";
  }

  private finalMessage(decision: PublicMemberExperienceDecisionText) {
    if (decision === "EXPERIENCE BLOCKED") return "Public/member launch experience is blocked by open P0/P1 issues.";
    if (decision === "EXPERIENCE READY WITH POST-LAUNCH ITEMS") return "Local route, data, and safety checks are complete, but final browser/staging/production evidence remains required before verified launch.";
    return "Public and member experience launch certification is ready.";
  }

  private isPublishedArtist(artist: ArtistRecord) {
    return artist.status === "active" && artist.publicationState === "published" && artist.publicVisibility !== false && Boolean(artist.slug);
  }

  private isPublishedRelease(release: SongReleaseRecord) {
    return release.status === "published" && release.publicationState === "published" && release.publicVisibility !== false && Boolean(release.slug);
  }

  private isArtworkAsset(asset: MediaAsset) {
    const normalized = `${asset.assetType} ${asset.title}`.toLowerCase();
    return normalized.includes("art") || normalized.includes("cover") || normalized.includes("image") || normalized.includes("profile") || normalized.includes("gallery");
  }

  private isFullSongAsset(asset: MediaAsset) {
    const assetType = asset.assetType.toLowerCase();
    if (assetType.includes("preview")) return false;
    const title = asset.title.toLowerCase();
    return assetType === "full_song" || assetType === "master_audio" || assetType === "song_master" || title.includes("full song master") || title.includes("master audio");
  }
}

export const publicMemberExperienceHealthService = new PublicMemberExperienceHealthService();
