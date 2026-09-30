import type { PublicSiteConfig, PublicSiteConfigSection } from "../../../src/models/admin";
import type { HomepageConfigurationRecord } from "../../models/site/HomepageConfigurationModel";
import type { SiteConfigurationRecord } from "../../models/site/SiteConfigurationModel";
import { homepageRepository } from "../../repositories/HomepageRepository";
import { siteConfigRepository } from "../../repositories/SiteConfigRepository";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { defaultHomepageSections, defaultPublicSiteConfig } from "./siteConfigDefaults";
import { mapPublicSiteConfigToRecords, recordsToPublicSiteConfig } from "./siteConfigMapping";
import { siteConfigurationValidationService } from "./SiteConfigurationValidationService";

const sortSections = (sections: PublicSiteConfigSection[]) =>
  [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.sectionId.localeCompare(b.sectionId));

export class AdminSiteConfigurationService {
  async getDraft(actorId?: string): Promise<PublicSiteConfig> {
    const [site, homepage] = await Promise.all([this.ensureSiteDraft(actorId), this.ensureHomepageDraft(actorId)]);
    return recordsToPublicSiteConfig(site, homepage);
  }

  async getPublished(actorId?: string): Promise<PublicSiteConfig> {
    const site = await siteConfigRepository.getPublished() ?? await this.ensureSiteDraft(actorId);
    const homepage = await homepageRepository.getPublished() ?? await this.ensureHomepageDraft(actorId);
    return recordsToPublicSiteConfig(site, homepage);
  }

  async updateDraft(updates: Partial<PublicSiteConfig>, actorId?: string): Promise<PublicSiteConfig> {
    const [site, homepage] = await Promise.all([this.ensureSiteDraft(actorId), this.ensureHomepageDraft(actorId)]);
    const current = recordsToPublicSiteConfig(site, homepage);
    const next: PublicSiteConfig = {
      ...current,
      ...updates,
      homepageSections: sortSections(updates.homepageSections ?? current.homepageSections),
      navigationLinks: updates.navigationLinks ?? current.navigationLinks,
      footerLinks: updates.footerLinks ?? current.footerLinks,
      socialLinks: updates.socialLinks ?? current.socialLinks,
      themeConfig: updates.themeConfig ?? current.themeConfig,
      updatedAt: new Date().toISOString(),
    };
    const validation = siteConfigurationValidationService.buildValidationResult(next);
    if (Object.keys(validation.fieldErrors).length || Object.keys(validation.sectionErrors).length) {
      throw new MediaApiError("SITE_CONFIG_VALIDATION_FAILED", [...Object.values(validation.fieldErrors), ...Object.values(validation.sectionErrors).flat()].join(" "), 400, "validation");
    }
    await Promise.all([
      siteConfigRepository.update(site.siteConfigId, this.sitePatch(next, actorId)),
      homepageRepository.update(homepage.homepageConfigId, this.homepagePatch(next.homepageSections, actorId)),
    ]);
    await mediaAuditPersistenceService.record("site_config_updated", `Updated site configuration "${next.siteName}"`, { actorId, entityType: "site_config", entityId: site.siteConfigId });
    await mediaAuditPersistenceService.record("homepage_updated", "Updated homepage draft configuration", { actorId, entityType: "homepage", entityId: homepage.homepageConfigId });
    return this.getDraft(actorId);
  }

  async getReadiness() {
    const draft = await this.getDraft();
    const validation = siteConfigurationValidationService.buildValidationResult(draft);
    return {
      ready: validation.valid,
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
      sectionStates: validation.sectionErrors,
      missingFields: validation.missingFields,
      currentPublicationState: "draft",
      checkedAt: validation.checkedAt,
    };
  }

  async publishDraft(actorId?: string): Promise<PublicSiteConfig> {
    const [site, homepage] = await Promise.all([this.ensureSiteDraft(actorId), this.ensureHomepageDraft(actorId)]);
    const draft = recordsToPublicSiteConfig(site, homepage);
    const readiness = await this.getReadiness();
    if (!readiness.ready) throw new MediaApiError("SITE_PUBLICATION_BLOCKED", readiness.blockingIssues.join(" ") || "Site configuration is not ready.", 400, "validation");
    const [publishedSite, publishedHomepage] = await Promise.all([
      siteConfigRepository.setSinglePublishedVersion(site.siteConfigId, actorId),
      homepageRepository.setSinglePublishedVersion(homepage.homepageConfigId, actorId),
    ]);
    await mediaAuditPersistenceService.record("site_config_published", `Published site configuration "${draft.siteName}"`, { actorId, entityType: "site_config", entityId: site.siteConfigId });
    await mediaAuditPersistenceService.record("homepage_published", "Published homepage configuration", { actorId, entityType: "homepage", entityId: homepage.homepageConfigId });
    this.invalidateCaches();
    return recordsToPublicSiteConfig(publishedSite ?? site, publishedHomepage ?? homepage);
  }

  async archiveDraft(actorId?: string): Promise<PublicSiteConfig> {
    const [site, homepage] = await Promise.all([this.ensureSiteDraft(actorId), this.ensureHomepageDraft(actorId)]);
    await Promise.all([
      siteConfigRepository.update(site.siteConfigId, { status: "archived", publicationState: "archived", archivedAt: new Date().toISOString(), updatedBy: actorId } as Partial<SiteConfigurationRecord & Record<string, unknown>>),
      homepageRepository.update(homepage.homepageConfigId, { status: "archived", publicationState: "archived", archivedAt: new Date().toISOString(), updatedBy: actorId } as Partial<HomepageConfigurationRecord & Record<string, unknown>>),
    ]);
    await mediaAuditPersistenceService.record("site_config_version_archived", "Archived site configuration draft", { actorId, entityType: "site_config", entityId: site.siteConfigId });
    return this.createDraftFromPublished(actorId);
  }

  async createDraftFromPublished(actorId?: string): Promise<PublicSiteConfig> {
    const published = await this.getPublished(actorId);
    const version = Math.max(await siteConfigRepository.nextVersion(), await homepageRepository.nextVersion());
    const { site, homepage } = mapPublicSiteConfigToRecords(published, version, actorId);
    await Promise.all([siteConfigRepository.create(site as SiteConfigurationRecord & Record<string, unknown>), homepageRepository.create(homepage as HomepageConfigurationRecord & Record<string, unknown>)]);
    await mediaAuditPersistenceService.record("site_config_draft_created", "Created site configuration draft from published version", { actorId, entityType: "site_config", entityId: site.siteConfigId });
    return recordsToPublicSiteConfig(site, homepage);
  }

  async rollbackToVersion(version: number, actorId?: string): Promise<PublicSiteConfig> {
    const [site, homepage] = await Promise.all([
      siteConfigRepository.listVersions().then((items) => items.find((item) => item.version === version) ?? null),
      homepageRepository.listVersions().then((items) => items.find((item) => item.version === version) ?? null),
    ]);
    if (!site || !homepage) throw new MediaApiError("SITE_ROLLBACK_FAILED", "Rollback version was not found.", 404, "database");
    await Promise.all([siteConfigRepository.setSinglePublishedVersion(site.siteConfigId, actorId), homepageRepository.setSinglePublishedVersion(homepage.homepageConfigId, actorId)]);
    await mediaAuditPersistenceService.record("site_config_rollback_completed", `Rolled site configuration back to version ${version}`, { actorId, entityType: "site_config", entityId: site.siteConfigId });
    this.invalidateCaches();
    return recordsToPublicSiteConfig(site, homepage);
  }

  async getVersions() {
    const [siteVersions, homepageVersions] = await Promise.all([siteConfigRepository.listVersions(), homepageRepository.listVersions()]);
    return siteVersions.map((site) => ({
      version: site.version,
      siteConfigId: site.siteConfigId,
      homepageConfigId: homepageVersions.find((homepage) => homepage.version === site.version)?.homepageConfigId,
      status: site.status,
      publicationState: site.publicationState,
      publishedAt: site.publishedAt,
      updatedAt: site.updatedAt,
    }));
  }

  async getHomepageDraft(actorId?: string) {
    const homepage = await this.ensureHomepageDraft(actorId);
    return {
      homepageConfigId: homepage.homepageConfigId,
      version: homepage.version,
      status: homepage.status,
      publicationState: homepage.publicationState,
      publicVisibility: homepage.publicVisibility,
      sections: sortSections(homepage.sections as unknown as PublicSiteConfigSection[]),
      updatedAt: homepage.updatedAt,
    };
  }

  async getHomepagePublished(actorId?: string) {
    const homepage = await homepageRepository.getPublished() ?? await this.ensureHomepageDraft(actorId);
    return {
      homepageConfigId: homepage.homepageConfigId,
      version: homepage.version,
      status: homepage.status,
      publicationState: homepage.publicationState,
      publicVisibility: homepage.publicVisibility,
      sections: sortSections(homepage.sections as unknown as PublicSiteConfigSection[]).filter((section) => section.enabled),
      updatedAt: homepage.updatedAt,
    };
  }

  private async ensureSiteDraft(actorId?: string): Promise<SiteConfigurationRecord> {
    const existing = await siteConfigRepository.getActiveDraft();
    if (existing) return existing;
    const published = await siteConfigRepository.getPublished();
    if (published) {
      const publicConfig = recordsToPublicSiteConfig(published, await homepageRepository.getPublished());
      const { site } = mapPublicSiteConfigToRecords(publicConfig, await siteConfigRepository.nextVersion(), actorId);
      await siteConfigRepository.create(site as SiteConfigurationRecord & Record<string, unknown>);
      return site;
    }
    const { site } = mapPublicSiteConfigToRecords(defaultPublicSiteConfig(), 1, actorId);
    await siteConfigRepository.create(site as SiteConfigurationRecord & Record<string, unknown>);
    return site;
  }

  private async ensureHomepageDraft(actorId?: string): Promise<HomepageConfigurationRecord> {
    const existing = await homepageRepository.getActiveDraft();
    if (existing) return existing;
    const published = await homepageRepository.getPublished();
    if (published) {
      const clone: HomepageConfigurationRecord = {
        ...published,
        homepageConfigId: `homepage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        version: await homepageRepository.nextVersion(),
        status: "draft",
        publicationState: "draft",
        publicVisibility: "not_public",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: actorId,
        updatedBy: actorId,
        publishedAt: undefined,
      };
      await homepageRepository.create(clone as HomepageConfigurationRecord & Record<string, unknown>);
      return clone;
    }
    const { homepage } = mapPublicSiteConfigToRecords({ ...defaultPublicSiteConfig(), homepageSections: defaultHomepageSections() }, 1, actorId);
    await homepageRepository.create(homepage as HomepageConfigurationRecord & Record<string, unknown>);
    return homepage;
  }

  private sitePatch(config: PublicSiteConfig, actorId?: string): Partial<SiteConfigurationRecord & Record<string, unknown>> {
    return {
      siteName: config.siteName,
      siteDescription: config.siteDescription,
      brandLogoUrl: config.brandLogoUrl,
      defaultCoverArtUrl: config.defaultCoverArtUrl,
      defaultArtistImageUrl: config.defaultArtistImageUrl,
      defaultSocialImageUrl: config.defaultSocialImageUrl,
      navigation: config.navigationLinks as unknown as Array<Record<string, unknown>>,
      footer: { links: config.footerLinks },
      socialLinks: config.socialLinks as Record<string, string>,
      contactSettings: {
        publicEmail: config.contactEmail,
        contactCtaText: config.contactCtaText,
        newsletterEnabled: config.newsletterEnabled,
        contactPageEnabled: config.contactPageEnabled,
      },
      theme: config.themeConfig ?? {},
      metadata: { ...(config.metadata ?? {}), seoDefaults: config.seoDefaults },
      updatedBy: actorId,
    };
  }

  private homepagePatch(sections: PublicSiteConfigSection[], actorId?: string): Partial<HomepageConfigurationRecord & Record<string, unknown>> {
    return {
      sections: sortSections(sections) as unknown as Array<Record<string, unknown>>,
      hero: sections.find((section) => section.sectionType === "hero") as unknown as Record<string, unknown> | undefined,
      about: sections.find((section) => section.sectionType === "about") as unknown as Record<string, unknown> | undefined,
      cta: sections.find((section) => section.sectionType === "explore_artists_cta") as unknown as Record<string, unknown> | undefined,
      updatedBy: actorId,
    };
  }

  private invalidateCaches() {
    publicContentCacheService.deleteByPattern("public:site");
    publicContentCacheService.deleteByPattern("public:homepage");
    publicContentCacheService.deleteByPattern("public:metadata");
    publicContentCacheService.deleteByPattern("public:search");
    publicContentCacheService.deleteByPattern("public:browse");
  }
}

export const adminSiteConfigurationService = new AdminSiteConfigurationService();
