import type { SiteConfigurationRecord } from "../models/site/SiteConfigurationModel";
import { BaseRepository } from "./BaseRepository";
export class SiteConfigRepository extends BaseRepository<SiteConfigurationRecord & Record<string, unknown>> {
  constructor() { super("siteConfigurations", "siteConfigId"); }

  findById(siteConfigId: string) { return this.get(siteConfigId); }

  async getPublished() {
    return (await this.list({ includeArchived: true }))
      .filter((config) => config.status === "published" && config.publicationState === "published")
      .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))[0] ?? null;
  }

  async getActiveDraft() {
    return (await this.list({ includeArchived: true }))
      .filter((config) => config.status === "draft")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
  }

  async listVersions() {
    return (await this.list({ includeArchived: true, includeDeleted: true }))
      .sort((a, b) => b.version - a.version || b.updatedAt.localeCompare(a.updatedAt));
  }

  async nextVersion() {
    return Math.max(0, ...(await this.listVersions()).map((config) => Number(config.version) || 0)) + 1;
  }

  async setSinglePublishedVersion(siteConfigId: string, actorId?: string) {
    const versions = await this.listVersions();
    for (const version of versions) {
      if (version.siteConfigId !== siteConfigId && version.status === "published") {
        await this.update(version.siteConfigId, { status: "archived", publicationState: "archived", updatedBy: actorId } as Partial<SiteConfigurationRecord & Record<string, unknown>>);
      }
    }
    return this.update(siteConfigId, {
      status: "published",
      publicationState: "published",
      publicVisibility: "public",
      publishedAt: new Date().toISOString(),
      updatedBy: actorId,
    } as Partial<SiteConfigurationRecord & Record<string, unknown>>);
  }
}
export const siteConfigRepository = new SiteConfigRepository();
