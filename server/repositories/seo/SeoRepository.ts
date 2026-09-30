import type { PublicRedirectRecord } from "../../models/seo/PublicRedirectModel";
import type { PublishedSlugHistoryRecord } from "../../models/seo/PublishedSlugHistoryModel";
import type { SearchEngineNotificationRecord } from "../../models/seo/SearchEngineNotificationModel";
import type { SearchEngineVerificationRecord } from "../../models/seo/SearchEngineVerificationModel";
import type { SeoVerificationRunRecord } from "../../models/seo/SeoVerificationRunModel";
import { BaseRepository } from "../BaseRepository";

export class PublicRedirectRepository extends BaseRepository<PublicRedirectRecord & Record<string, unknown>> {
  constructor() { super("publicRedirects", "redirectId"); }

  async findActiveBySourcePath(sourcePath: string) {
    return (await this.list({ includeArchived: true })).find((redirect) => redirect.active && redirect.status === "active" && redirect.sourcePath === sourcePath) ?? null;
  }
}

export class PublishedSlugHistoryRepository extends BaseRepository<PublishedSlugHistoryRecord & Record<string, unknown>> {
  constructor() { super("publishedSlugHistory", "slugHistoryId"); }
}

export class SearchEngineVerificationRepository extends BaseRepository<SearchEngineVerificationRecord & Record<string, unknown>> {
  constructor() { super("searchEngineVerifications", "searchEngineVerificationId"); }
}

export class SearchEngineNotificationRepository extends BaseRepository<SearchEngineNotificationRecord & Record<string, unknown>> {
  constructor() { super("searchEngineNotifications", "searchEngineNotificationId"); }
}

export class SeoVerificationRunRepository extends BaseRepository<SeoVerificationRunRecord & Record<string, unknown>> {
  constructor() { super("seoVerificationRuns", "seoVerificationRunId"); }
}

export const publicRedirectRepository = new PublicRedirectRepository();
export const publishedSlugHistoryRepository = new PublishedSlugHistoryRepository();
export const searchEngineVerificationRepository = new SearchEngineVerificationRepository();
export const searchEngineNotificationRepository = new SearchEngineNotificationRepository();
export const seoVerificationRunRepository = new SeoVerificationRunRepository();
