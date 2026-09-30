import type { IndexDescription } from "mongodb";
import { databaseCollections } from "./collectionRegistry";
import { databaseConnectionService } from "./DatabaseConnectionService";
import { normalizeDatabaseError } from "./databaseErrors";

export interface DatabaseIndexHealthReport {
  status: "healthy" | "degraded" | "failed";
  expectedCount: number;
  actualCount: number;
  missing: Array<{ collection: string; index: string }>;
  unexpected: Array<{ collection: string; index: string }>;
  conflicting: Array<{ collection: string; index: string; reason: string }>;
  uniqueConstraintIssues: string[];
  checkedAt: string;
}

const indexName = (index: IndexDescription): string => typeof index.name === "string" ? index.name : Object.keys(index.key ?? {}).join("_");

export class DatabaseIndexService {
  listExpectedIndexes() {
    return databaseCollections.flatMap((collection) => collection.indexes.map((idx) => ({
      collection: collection.collectionName,
      index: indexName(idx),
      definition: idx,
    })));
  }

  async ensureIndexes(): Promise<DatabaseIndexHealthReport> {
    if (!databaseConnectionService.isConfigured()) return this.localFallbackReport("degraded", "MongoDB is not configured.");
    try {
      const db = await databaseConnectionService.getDb();
      for (const collectionDef of databaseCollections) {
        const collection = db.collection(collectionDef.collectionName);
        if (collectionDef.indexes.length) await collection.createIndexes(collectionDef.indexes);
      }
      return this.compareIndexes();
    } catch (error) {
      const normalized = normalizeDatabaseError(error, "ensureIndexes");
      return {
        status: "failed",
        expectedCount: this.listExpectedIndexes().length,
        actualCount: 0,
        missing: [],
        unexpected: [],
        conflicting: [{ collection: "database", index: "ensureIndexes", reason: normalized.message }],
        uniqueConstraintIssues: [],
        checkedAt: new Date().toISOString(),
      };
    }
  }

  async listActualIndexes() {
    if (!databaseConnectionService.isConfigured()) return [];
    const db = await databaseConnectionService.getDb();
    const actual = [];
    for (const collectionDef of databaseCollections) {
      const indexes = await db.collection(collectionDef.collectionName).indexes().catch(() => []);
      actual.push(...indexes.map((idx) => ({ collection: collectionDef.collectionName, index: idx.name ?? "", definition: idx })));
    }
    return actual;
  }

  async compareIndexes(): Promise<DatabaseIndexHealthReport> {
    if (!databaseConnectionService.isConfigured()) return this.localFallbackReport("degraded", "MongoDB is not configured.");
    const expected = this.listExpectedIndexes();
    const actual = await this.listActualIndexes();
    const actualSet = new Set(actual.map((item) => `${item.collection}:${item.index}`));
    const expectedSet = new Set(expected.map((item) => `${item.collection}:${item.index}`));
    const missing = expected.filter((item) => !actualSet.has(`${item.collection}:${item.index}`)).map(({ collection, index }) => ({ collection, index }));
    const unexpected = actual
      .filter((item) => item.index !== "_id_" && !expectedSet.has(`${item.collection}:${item.index}`))
      .map(({ collection, index }) => ({ collection, index }));
    return {
      status: missing.length ? "degraded" : "healthy",
      expectedCount: expected.length,
      actualCount: actual.length,
      missing,
      unexpected,
      conflicting: [],
      uniqueConstraintIssues: [],
      checkedAt: new Date().toISOString(),
    };
  }

  reportMissingIndexes(report: DatabaseIndexHealthReport) {
    return report.missing;
  }

  reportConflictingIndexes(report: DatabaseIndexHealthReport) {
    return report.conflicting;
  }

  async verifyUniqueConstraints(): Promise<string[]> {
    const actual = await this.listActualIndexes();
    return this.listExpectedIndexes()
      .filter((expected) => (expected.definition as { unique?: boolean }).unique)
      .filter((expected) => !actual.some((item) => item.collection === expected.collection && item.index === expected.index && (item.definition as { unique?: boolean }).unique))
      .map((item) => `${item.collection}.${item.index}`);
  }

  private localFallbackReport(status: "healthy" | "degraded" | "failed", warning: string): DatabaseIndexHealthReport {
    return {
      status,
      expectedCount: this.listExpectedIndexes().length,
      actualCount: 0,
      missing: [],
      unexpected: [],
      conflicting: [{ collection: "local", index: "mongodb", reason: warning }],
      uniqueConstraintIssues: [],
      checkedAt: new Date().toISOString(),
    };
  }
}

export const databaseIndexService = new DatabaseIndexService();
