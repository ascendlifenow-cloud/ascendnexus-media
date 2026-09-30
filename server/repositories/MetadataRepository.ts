import type { SeoMetadataRecord } from "../models/metadata/SeoMetadataModel";
import type { SocialMetadataRecord } from "../models/metadata/SocialMetadataModel";
import { BaseRepository } from "./BaseRepository";

type MetadataScope = { entityType: string; entityId?: string; path?: string };

const sameScope = <T extends MetadataScope>(record: T, scope: MetadataScope) =>
  record.entityType === scope.entityType && (scope.entityId ? record.entityId === scope.entityId : true) && (scope.path ? record.path === scope.path : true);

export class SeoMetadataRepository extends BaseRepository<SeoMetadataRecord & Record<string, unknown>> {
  constructor() { super("seoMetadataRecords", "seoMetadataId"); }

  async getByEntity(entityType: string, entityId: string) {
    return (await this.list({ includeArchived: true })).find((record) => record.entityType === entityType && record.entityId === entityId) ?? null;
  }

  async getByPath(path: string) {
    return (await this.list({ includeArchived: true })).find((record) => record.path === path) ?? null;
  }

  async getPublishedByEntity(entityType: string, entityId: string) {
    return (await this.list()).find((record) => record.entityType === entityType && record.entityId === entityId && record.status === "published" && record.publicVisibility === "public") ?? null;
  }

  async getPublishedByPath(path: string) {
    return (await this.list()).find((record) => record.path === path && record.status === "published" && record.publicVisibility === "public") ?? null;
  }

  async publish(id: string) {
    const current = await this.get(id);
    if (!current) return null;
    await this.ensureSinglePublishedRecord(current);
    return this.update(id, { status: "published", publicationState: "published", publicVisibility: "public", publishedAt: new Date().toISOString() });
  }

  async restore(id: string) {
    return this.update(id, { status: "draft", publicationState: "draft", publicVisibility: "not_public", archivedAt: undefined });
  }

  async ensureSinglePublishedRecord(scope: MetadataScope) {
    const records = await this.list({ includeArchived: true });
    await Promise.all(records.filter((record) => record.seoMetadataId !== (scope as SeoMetadataRecord).seoMetadataId && sameScope(record, scope) && record.status === "published").map((record) =>
      this.update(record.seoMetadataId, { status: "archived", publicationState: "archived", publicVisibility: "not_public", archivedAt: new Date().toISOString() }),
    ));
  }
}

export class SocialMetadataRepository extends BaseRepository<SocialMetadataRecord & Record<string, unknown>> {
  constructor() { super("socialMetadataRecords", "socialMetadataId"); }

  async getByEntity(entityType: string, entityId: string) {
    return (await this.list({ includeArchived: true })).find((record) => record.entityType === entityType && record.entityId === entityId) ?? null;
  }

  async getByPath(path: string) {
    return (await this.list({ includeArchived: true })).find((record) => record.path === path) ?? null;
  }

  async getPublishedByEntity(entityType: string, entityId: string) {
    return (await this.list()).find((record) => record.entityType === entityType && record.entityId === entityId && record.status === "published" && record.publicVisibility === "public") ?? null;
  }

  async getPublishedByPath(path: string) {
    return (await this.list()).find((record) => record.path === path && record.status === "published" && record.publicVisibility === "public") ?? null;
  }

  async publish(id: string) {
    const current = await this.get(id);
    if (!current) return null;
    await this.ensureSinglePublishedRecord(current);
    return this.update(id, { status: "published", publicationState: "published", publicVisibility: "public", publishedAt: new Date().toISOString() });
  }

  async restore(id: string) {
    return this.update(id, { status: "draft", publicationState: "draft", publicVisibility: "not_public", archivedAt: undefined });
  }

  async ensureSinglePublishedRecord(scope: MetadataScope) {
    const records = await this.list({ includeArchived: true });
    await Promise.all(records.filter((record) => record.socialMetadataId !== (scope as SocialMetadataRecord).socialMetadataId && sameScope(record, scope) && record.status === "published").map((record) =>
      this.update(record.socialMetadataId, { status: "archived", publicationState: "archived", publicVisibility: "not_public", archivedAt: new Date().toISOString() }),
    ));
  }
}

export const seoMetadataRepository = new SeoMetadataRepository();
export const socialMetadataRepository = new SocialMetadataRepository();
