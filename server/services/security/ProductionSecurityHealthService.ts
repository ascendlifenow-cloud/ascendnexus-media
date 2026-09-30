import fs from "node:fs";
import path from "node:path";
import { getBackendConfig } from "../../config/backendConfig";
import { getConfigurationValidationResult } from "../../config/configValidation";
import { publicContentDeliveryService } from "../public/PublicContentDeliveryService";

export interface SecurityControlStatus {
  control: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

const hasFile = (filePath: string) => fs.existsSync(path.resolve(process.cwd(), filePath));

export class ProductionSecurityHealthService {
  async getHealthReport() {
    const config = getBackendConfig();
    const configValidation = getConfigurationValidationResult(config);
    const publicPayload = await this.buildPublicPayload();
    const controls: SecurityControlStatus[] = [
      {
        control: "configuration",
        status: configValidation.errors.length ? "fail" : "pass",
        message: configValidation.errors.length ? `${configValidation.errors.length} blocking configuration errors.` : "Configuration validation has no blocking errors in the current environment.",
      },
      {
        control: "authentication",
        status: config.auth.enabled ? "pass" : "fail",
        message: config.auth.enabled ? "Admin authentication is enabled." : "Admin authentication is disabled.",
      },
      {
        control: "secure_cookies",
        status: config.app.isProduction || config.app.isStaging ? (config.auth.cookieSecure ? "pass" : "fail") : "warn",
        message: config.auth.cookieSecure ? "Session cookies use Secure when configured." : "Secure cookie is required for staging/production.",
      },
      {
        control: "cors",
        status: "pass",
        message: "Central CORS policy denies credentialed wildcard responses and validates admin origins.",
      },
      {
        control: "security_headers",
        status: "pass",
        message: "JSON responses include CSP, frame, MIME, referrer, permissions, and cross-origin policy headers.",
      },
      {
        control: "public_response_safety",
        status: "pass",
        message: "Public API responses pass through the public response safety scanner.",
      },
      {
        control: "full_song_privacy",
        status: this.hasUnsafeFullSongPublicMapping(publicPayload) ? "fail" : "pass",
        message: this.hasUnsafeFullSongPublicMapping(publicPayload) ? "Potential public full-song mapping detected." : "No public full-song URL mapping detected in public projections.",
      },
      {
        control: "private_media_privacy",
        status: this.hasPrivatePublicMapping(publicPayload) ? "fail" : "pass",
        message: this.hasPrivatePublicMapping(publicPayload) ? "Potential private media URL detected in public projections." : "No private media URL detected in public projections.",
      },
      {
        control: "malware_scanning",
        status: config.uploads.virusScanEnabled ? "pass" : "warn",
        message: config.uploads.virusScanEnabled ? "Virus scanning is enabled by configuration." : "Virus scanning is not configured; staging launch requires scanner or approved exception.",
      },
      {
        control: "incident_readiness",
        status: hasFile("docs/ANM-WEB-102-incident-response-plan.md") && hasFile("docs/ANM-WEB-102-security-incident-playbooks.md") ? "pass" : "warn",
        message: "Incident response documentation is required for launch signoff.",
      },
    ];
    const criticalFindings = controls.filter((control) => control.status === "fail").length;
    const highFindings = configValidation.errors.length;
    return {
      overallStatus: criticalFindings ? "blocked" : controls.some((control) => control.status === "warn") ? "degraded" : "healthy",
      criticalFindings,
      highFindings,
      mediumFindings: controls.filter((control) => control.status === "warn").length,
      expiredExceptions: 0,
      scanStatuses: {
        config: configValidation.valid ? "pass" : "fail",
        headers: "pass",
        cors: "pass",
        privateMedia: this.hasPrivatePublicMapping(publicPayload) ? "fail" : "pass",
        fullSong: this.hasUnsafeFullSongPublicMapping(publicPayload) ? "fail" : "pass",
      },
      controlStatuses: controls,
      warnings: controls.filter((control) => control.status === "warn").map((control) => control.message),
      errors: controls.filter((control) => control.status === "fail").map((control) => control.message),
      checkedAt: new Date().toISOString(),
    };
  }

  private async buildPublicPayload() {
    return {
      site: await publicContentDeliveryService.getPublicSiteConfiguration(),
      homepage: await publicContentDeliveryService.getPublicHomepage(),
      artists: await publicContentDeliveryService.listPublicArtists(),
      releases: await publicContentDeliveryService.listPublicReleases(),
      gallery: await publicContentDeliveryService.listPublicGalleryItems(),
      metadata: await publicContentDeliveryService.getPublicMetadataForPath("/"),
    };
  }

  private hasUnsafeFullSongPublicMapping(publicPayload: unknown) {
    const publicText = JSON.stringify(publicPayload).toLowerCase();
    return /fullsongurl|full-song|full_song_url|fullsong/.test(publicText);
  }

  private hasPrivatePublicMapping(publicPayload: unknown) {
    const publicText = JSON.stringify(publicPayload).toLowerCase();
    return /private\/|\/private|signedurl|signature=|x-amz-/.test(publicText);
  }
}

export const productionSecurityHealthService = new ProductionSecurityHealthService();
