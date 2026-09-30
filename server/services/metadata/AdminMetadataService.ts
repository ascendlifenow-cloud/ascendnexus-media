import type { SeoMetadataRecord } from "../../models/metadata/SeoMetadataModel";
import type { SocialMetadataRecord } from "../../models/metadata/SocialMetadataModel";
import { seoMetadataRepository, socialMetadataRepository } from "../../repositories/MetadataRepository";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { publicContentCacheService } from "../public/PublicContentCacheService";
import { canonicalUrlService } from "./CanonicalUrlService";
import { metadataValidationService } from "./MetadataValidationService";
import { publicRouteMetadataCatalog } from "./PublicRouteMetadataCatalog";
import { robotsDirectiveService } from "./RobotsDirectiveService";

export interface MetadataUpsertPayload {
  metadataId?: string;
  entityType: string;
  entityId?: string;
  path?: string;
  title: string;
  description: string;
  canonicalUrl?: string;
  imageAssetId?: string;
  imageUrl?: string;
  imageAlt?: string;
  robots?: string;
  openGraph?: Record<string, unknown>;
  twitterCard?: Record<string, unknown>;
  structuredData?: Record<string, unknown>;
}

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class AdminMetadataService {
  async list() {
    const [seo, social] = await Promise.all([
      seoMetadataRepository.list({ includeArchived: true }),
      socialMetadataRepository.list({ includeArchived: true }),
    ]);
    return { seo, social };
  }

  async get(metadataId: string) {
    return (await seoMetadataRepository.get(metadataId)) ?? (await socialMetadataRepository.get(metadataId));
  }

  async create(payload: MetadataUpsertPayload, actorId: string) {
    const validation = await this.validatePayload(payload);
    if (!validation.valid) throw new Error(`METADATA_VALIDATION_FAILED:${validation.blockingIssues.join("; ")}`);
    const createdAt = nowIso();
    const seo: SeoMetadataRecord & Record<string, unknown> = {
      seoMetadataId: payload.metadataId ?? id("seo"),
      entityType: payload.entityType,
      entityId: payload.entityId,
      path: payload.path ? publicRouteMetadataCatalog.normalizePath(payload.path) : undefined,
      title: payload.title,
      description: payload.description,
      canonicalUrl: payload.canonicalUrl,
      imageAssetId: payload.imageAssetId,
      imageUrl: payload.imageUrl,
      imageAlt: payload.imageAlt,
      robots: payload.robots ?? robotsDirectiveService.serialize(robotsDirectiveService.resolveDefaults(true)),
      structuredData: payload.structuredData,
      status: "draft",
      publicationState: "draft",
      publicVisibility: "not_public",
      createdBy: actorId,
      updatedBy: actorId,
      createdAt,
      updatedAt: createdAt,
      schemaVersion: 1,
    };
    const social: SocialMetadataRecord & Record<string, unknown> = {
      socialMetadataId: id("social"),
      entityType: payload.entityType,
      entityId: payload.entityId,
      path: seo.path,
      title: payload.title,
      description: payload.description,
      imageAssetId: payload.imageAssetId,
      imageUrl: payload.imageUrl,
      imageAlt: payload.imageAlt,
      openGraph: payload.openGraph ?? { type: "website" },
      twitterCard: payload.twitterCard ?? { card: "summary_large_image" },
      status: "draft",
      publicationState: "draft",
      publicVisibility: "not_public",
      createdBy: actorId,
      updatedBy: actorId,
      createdAt,
      updatedAt: createdAt,
      schemaVersion: 1,
    };
    const createdSeo = await seoMetadataRepository.create(seo);
    const createdSocial = await socialMetadataRepository.create(social);
    await mediaAuditPersistenceService.record("metadata_created", `Created metadata for ${payload.entityType}`, { actorId, entityType: "seo_metadata", entityId: createdSeo.seoMetadataId, metadata: { socialMetadataId: createdSocial.socialMetadataId } });
    return { seo: createdSeo, social: createdSocial };
  }

  async update(metadataId: string, payload: Partial<MetadataUpsertPayload>, actorId: string) {
    const current = await this.get(metadataId);
    if (!current) return null;
    const merged = { ...current, ...payload } as MetadataUpsertPayload;
    const validation = await this.validatePayload(merged);
    if (!validation.valid) throw new Error(`METADATA_VALIDATION_FAILED:${validation.blockingIssues.join("; ")}`);
    const patch = { ...payload, updatedBy: actorId, publicationState: "draft", publicVisibility: "not_public" };
    const updated = "seoMetadataId" in current
      ? await seoMetadataRepository.update(metadataId, patch as Partial<SeoMetadataRecord & Record<string, unknown>>)
      : await socialMetadataRepository.update(metadataId, patch as Partial<SocialMetadataRecord & Record<string, unknown>>);
    await mediaAuditPersistenceService.record("metadata_updated", `Updated metadata ${metadataId}`, { actorId, entityType: "seo_metadata", entityId: metadataId });
    return updated;
  }

  async validatePayload(payload: MetadataUpsertPayload) {
    const canonicalUrl = payload.canonicalUrl ?? (payload.path ? canonicalUrlService.buildCanonicalUrl(payload.path) : undefined);
    return metadataValidationService.validate({
      title: payload.title,
      description: payload.description,
      canonicalUrl,
      imageUrl: payload.imageUrl,
      openGraphType: String(payload.openGraph?.type ?? "website"),
      twitterCard: String(payload.twitterCard?.card ?? "summary_large_image"),
      structuredData: payload.structuredData,
      entityPublic: true,
    });
  }

  async readiness(metadataId: string) {
    const current = await this.get(metadataId);
    if (!current) return null;
    const validation = await this.validatePayload(current as MetadataUpsertPayload);
    return { metadataId, ready: validation.valid, ...validation };
  }

  async publish(metadataId: string, actorId: string) {
    const readiness = await this.readiness(metadataId);
    if (!readiness?.ready) throw new Error(`METADATA_PUBLICATION_BLOCKED:${readiness?.blockingIssues.join("; ") ?? "Metadata not found."}`);
    const published = metadataId.startsWith("social-") || (await socialMetadataRepository.get(metadataId))
      ? await socialMetadataRepository.publish(metadataId)
      : await seoMetadataRepository.publish(metadataId);
    publicContentCacheService.deleteByPattern("public:metadata");
    await mediaAuditPersistenceService.record("metadata_published", `Published metadata ${metadataId}`, { actorId, entityType: "seo_metadata", entityId: metadataId });
    return published;
  }

  async archive(metadataId: string, actorId: string) {
    const archived = metadataId.startsWith("social-") || (await socialMetadataRepository.get(metadataId))
      ? await socialMetadataRepository.archive(metadataId, actorId)
      : await seoMetadataRepository.archive(metadataId, actorId);
    publicContentCacheService.deleteByPattern("public:metadata");
    await mediaAuditPersistenceService.record("metadata_archived", `Archived metadata ${metadataId}`, { actorId, entityType: "seo_metadata", entityId: metadataId });
    return archived;
  }

  async restore(metadataId: string, actorId: string) {
    const restored = metadataId.startsWith("social-") || (await socialMetadataRepository.get(metadataId))
      ? await socialMetadataRepository.restore(metadataId)
      : await seoMetadataRepository.restore(metadataId);
    await mediaAuditPersistenceService.record("metadata_restored", `Restored metadata ${metadataId}`, { actorId, entityType: "seo_metadata", entityId: metadataId });
    return restored;
  }
}

export const adminMetadataService = new AdminMetadataService();
