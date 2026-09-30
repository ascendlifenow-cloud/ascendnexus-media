import { databaseIndexService } from "../DatabaseIndexService";
import { jsonDatabase } from "../../services/media/JsonDatabase";

export interface DatabaseMigrationDefinition {
  id: string;
  name: string;
  version: number;
  description: string;
  destructive: boolean;
  requiresBackup: boolean;
  estimatedImpact: "low" | "medium" | "high";
  up: () => Promise<void>;
  down?: () => Promise<void>;
  verify: () => Promise<{ success: boolean; warnings: string[] }>;
}

const withDefaults = (records: Array<Record<string, unknown>>) => {
  const now = new Date().toISOString();
  for (const record of records) {
    if (!record.createdAt) record.createdAt = now;
    if (!record.updatedAt) record.updatedAt = now;
    if (!record.schemaVersion) record.schemaVersion = 1;
  }
};

export const databaseMigrations: DatabaseMigrationDefinition[] = [
  {
    id: "0001-create-required-indexes",
    name: "Create required database indexes",
    version: 1,
    description: "Creates unique and query-performance indexes for production collections.",
    destructive: false,
    requiresBackup: false,
    estimatedImpact: "medium",
    up: async () => {
      await databaseIndexService.ensureIndexes();
    },
    verify: async () => {
      const report = await databaseIndexService.compareIndexes();
      return { success: report.status !== "failed" && report.missing.length === 0, warnings: report.missing.map((item) => `${item.collection}.${item.index}`) };
    },
  },
  {
    id: "0002-backfill-schema-version-and-timestamps",
    name: "Backfill schema version and timestamps",
    version: 2,
    description: "Adds schemaVersion and timestamp defaults for legacy records where safe.",
    destructive: false,
    requiresBackup: false,
    estimatedImpact: "low",
    up: async () => {
      await jsonDatabase.update((data) => {
        for (const value of Object.values(data)) {
          if (Array.isArray(value)) withDefaults(value as Array<Record<string, unknown>>);
        }
      });
    },
    verify: async () => {
      const data = await jsonDatabase.read();
      const missing = Object.entries(data).flatMap(([key, value]) => Array.isArray(value) ? value.filter((record) => !record.schemaVersion).map(() => key) : []);
      return { success: missing.length === 0, warnings: missing };
    },
  },
  {
    id: "0003-normalize-public-safety-fields",
    name: "Normalize public safety fields",
    version: 3,
    description: "Ensures full-song fields and signed URLs are not exposed through public-safe top-level fields.",
    destructive: false,
    requiresBackup: false,
    estimatedImpact: "low",
    up: async () => {
      await jsonDatabase.update((data) => {
        for (const storage of data.mediaStorageObjects) {
          if (storage.accessLevel !== "public") storage.publicUrl = undefined;
          storage.signedUrl = undefined;
        }
        for (const asset of data.mediaAssets) {
          if (asset.assetType === "full_song" || asset.metadata?.fullSongUrl) {
            asset.url = asset.accessLevel === "public" ? undefined : asset.url;
            asset.metadata = { ...asset.metadata, requiresManualPublicSafetyReview: true };
          }
        }
      });
    },
    verify: async () => {
      const data = await jsonDatabase.read();
      const unsafe = data.mediaStorageObjects.filter((storage) => storage.accessLevel !== "public" && storage.publicUrl).map((storage) => storage.storageObjectId);
      return { success: unsafe.length === 0, warnings: unsafe };
    },
  },
];
