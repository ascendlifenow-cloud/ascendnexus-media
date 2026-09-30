import { databaseCollections } from "./collectionRegistry";
import { databaseConnectionService } from "./DatabaseConnectionService";
import { jsonDatabase } from "../services/media/JsonDatabase";

export interface DatabaseIntegrityReport {
  status: "healthy" | "degraded" | "failed";
  brokenReferences: string[];
  duplicateApplicationIds: string[];
  duplicateSlugs: string[];
  orphanStorageObjects: string[];
  orphanMediaAssets: string[];
  stalePublicationLocks: string[];
  stuckJobs: string[];
  checkedAt: string;
}

const duplicates = <T extends Record<string, unknown>>(records: T[], key: string): string[] => {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const record of records) {
    const value = record[key];
    if (typeof value !== "string" || !value) continue;
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
};

export class DatabaseIntegrityService {
  async buildIntegrityReport(): Promise<DatabaseIntegrityReport> {
    const data = await jsonDatabase.read();
    const duplicateApplicationIds = databaseCollections.flatMap((def) => duplicates((data as unknown as Record<string, Record<string, unknown>[]>)[def.property] ?? [], def.applicationId).map((value) => `${def.collectionName}:${value}`));
    const duplicateSlugs = [
      ...duplicates(data.artistRecords, "slug").map((value) => `artists:${value}`),
      ...duplicates(data.releaseRecords, "slug").map((value) => `releases:${value}`),
      ...duplicates(data.galleryItems, "slug").map((value) => `gallery:${value}`),
    ];
    const artistIds = new Set(data.artistRecords.map((artist) => artist.artistId));
    const releaseIds = new Set(data.releaseRecords.map((release) => release.releaseId));
    const assetIds = new Set(data.mediaAssets.map((asset) => asset.assetId));
    const storageIds = new Set(data.mediaStorageObjects.map((object) => object.storageObjectId));
    const brokenReferences = [
      ...data.releaseRecords.filter((release) => release.artistId && !artistIds.has(release.artistId)).map((release) => `release:${release.releaseId}:artist:${release.artistId}`),
      ...data.galleryItems.filter((item) => item.artistId && !artistIds.has(item.artistId)).map((item) => `gallery:${item.galleryItemId}:artist:${item.artistId}`),
      ...data.galleryItems.filter((item) => item.releaseId && !releaseIds.has(item.releaseId)).map((item) => `gallery:${item.galleryItemId}:release:${item.releaseId}`),
      ...data.mediaAssetLinks.filter((link) => !assetIds.has(link.assetId)).map((link) => `mediaLink:${link.linkId}:asset:${link.assetId}`),
      ...data.mediaAssetVersions.filter((version) => !assetIds.has(version.assetId) || !storageIds.has(version.storageObjectId)).map((version) => `mediaVersion:${version.versionId}`),
      ...data.mediaProcessingJobs.filter((job) => !assetIds.has(job.assetId) || !storageIds.has(job.storageObjectId)).map((job) => `processingJob:${job.processingJobId}`),
    ];
    const orphanStorageObjects = data.mediaStorageObjects.filter((object) => object.assetId && !assetIds.has(object.assetId)).map((object) => object.storageObjectId);
    const linkedAssetIds = new Set(data.mediaAssetLinks.map((link) => link.assetId));
    const orphanMediaAssets = data.mediaAssets
      .filter((asset) => asset.assignmentStatus === "assigned" && !linkedAssetIds.has(asset.assetId) && !asset.ownerId)
      .map((asset) => asset.assetId);
    const stalePublicationLocks = data.mediaPublicationLocks.filter((lock) => lock.status === "active" && Date.parse(lock.expiresAt) < Date.now()).map((lock) => lock.lockId);
    const stuckJobs = data.mediaProcessingJobs.filter((job) => ["active", "processing", "retrying"].includes(job.status) && job.updatedAt && Date.parse(job.updatedAt) < Date.now() - 24 * 60 * 60 * 1000).map((job) => job.processingJobId);
    const issues = duplicateApplicationIds.length + duplicateSlugs.length + brokenReferences.length + orphanStorageObjects.length + orphanMediaAssets.length + stalePublicationLocks.length + stuckJobs.length;
    return {
      status: issues ? "degraded" : "healthy",
      brokenReferences,
      duplicateApplicationIds,
      duplicateSlugs,
      orphanStorageObjects,
      orphanMediaAssets,
      stalePublicationLocks,
      stuckJobs,
      checkedAt: new Date().toISOString(),
    };
  }

  findBrokenReferences = async () => (await this.buildIntegrityReport()).brokenReferences;
  findDuplicateApplicationIds = async () => (await this.buildIntegrityReport()).duplicateApplicationIds;
  findDuplicateSlugs = async () => (await this.buildIntegrityReport()).duplicateSlugs;
  findOrphanStorageObjects = async () => (await this.buildIntegrityReport()).orphanStorageObjects;
  findOrphanMediaAssets = async () => (await this.buildIntegrityReport()).orphanMediaAssets;
  findStalePublicationLocks = async () => (await this.buildIntegrityReport()).stalePublicationLocks;
  findStuckJobs = async () => (await this.buildIntegrityReport()).stuckJobs;

  async getConnectionMode() {
    return databaseConnectionService.isConfigured() ? "mongodb" : "local_development_json";
  }
}

export const databaseIntegrityService = new DatabaseIntegrityService();
