import { databaseConnectionService } from "../DatabaseConnectionService";
import { mediaAuditPersistenceService } from "../../services/media/MediaAuditPersistenceService";
import type { DatabaseMigrationRecord } from "../../models/system/DatabaseMigrationModel";
import { jsonDatabase } from "../../services/media/JsonDatabase";
import { databaseMigrations, type DatabaseMigrationDefinition } from "./index";

export class DatabaseMigrationService {
  async listMigrations(): Promise<DatabaseMigrationRecord[]> {
    const data = await jsonDatabase.read();
    return data.databaseMigrations.sort((a, b) => a.version - b.version);
  }

  async getPendingMigrations(): Promise<DatabaseMigrationDefinition[]> {
    const completed = new Set((await this.listMigrations()).filter((migration) => migration.status === "completed").map((migration) => migration.migrationId));
    return databaseMigrations.filter((migration) => !completed.has(migration.id)).sort((a, b) => a.version - b.version);
  }

  async validateMigrationOrder() {
    const versions = databaseMigrations.map((migration) => migration.version);
    const uniqueVersions = new Set(versions);
    return { valid: versions.length === uniqueVersions.size, versions };
  }

  async runPendingMigrations(options: { dryRun?: boolean; appliedBy?: string; backupAcknowledged?: boolean } = {}) {
    const pending = await this.getPendingMigrations();
    if (options.dryRun) return { success: true, dryRun: true, pending: pending.map((migration) => migration.id) };
    const results = [];
    for (const migration of pending) {
      results.push(await this.runMigration(migration.id, options));
    }
    return { success: results.every((result) => result.success), dryRun: false, results };
  }

  async runMigration(migrationId: string, options: { appliedBy?: string; backupAcknowledged?: boolean } = {}) {
    const migration = databaseMigrations.find((item) => item.id === migrationId);
    if (!migration) throw new Error(`Unknown migration: ${migrationId}`);
    if (migration.requiresBackup && !options.backupAcknowledged) throw new Error(`Migration ${migrationId} requires backup acknowledgement.`);
    const existing = (await this.listMigrations()).find((item) => item.migrationId === migrationId && item.status === "completed");
    if (existing) return { success: true, skipped: true, migrationId };
    await this.record(migration, "running", options.appliedBy);
    await mediaAuditPersistenceService.record("database_migration_started", `Started database migration ${migration.id}`, { entityType: "database_migration", entityId: migration.id });
    try {
      await migration.up();
      const verification = await migration.verify();
      if (!verification.success) throw new Error(`Migration verification failed: ${verification.warnings.join(", ")}`);
      await this.record(migration, "completed", options.appliedBy);
      await mediaAuditPersistenceService.record("database_migration_completed", `Completed database migration ${migration.id}`, { entityType: "database_migration", entityId: migration.id });
      return { success: true, migrationId, warnings: verification.warnings };
    } catch (error) {
      await this.record(migration, "failed", options.appliedBy, error instanceof Error ? error.message : "Unknown migration error.");
      await mediaAuditPersistenceService.record("database_migration_failed", `Failed database migration ${migration.id}`, { entityType: "database_migration", entityId: migration.id });
      throw error;
    }
  }

  async rollbackMigration(migrationId: string) {
    const migration = databaseMigrations.find((item) => item.id === migrationId);
    if (!migration?.down) return { success: false, reason: "Rollback is not supported for this migration." };
    await migration.down();
    await this.record(migration, "rolled_back");
    return { success: true };
  }

  async getMigrationStatus() {
    const records = await this.listMigrations();
    const pending = await this.getPendingMigrations();
    return {
      status: pending.length ? "pending" : "current",
      configured: databaseConnectionService.isConfigured(),
      totalKnown: databaseMigrations.length,
      completed: records.filter((record) => record.status === "completed").length,
      failed: records.filter((record) => record.status === "failed").length,
      pending: pending.map((migration) => migration.id),
      checkedAt: new Date().toISOString(),
    };
  }

  async createBackupCheckpoint() {
    return { required: false, message: "Backup checkpoint integration is reserved for the backup/restore prompt." };
  }

  private async record(migration: DatabaseMigrationDefinition, status: DatabaseMigrationRecord["status"], appliedBy?: string, error?: string) {
    const now = new Date().toISOString();
    await jsonDatabase.update((data) => {
      const existing = data.databaseMigrations.find((item) => item.migrationId === migration.id);
      const record: DatabaseMigrationRecord = {
        migrationId: migration.id,
        name: migration.name,
        version: migration.version,
        status,
        startedAt: existing?.startedAt ?? now,
        completedAt: status === "completed" ? now : existing?.completedAt,
        failedAt: status === "failed" ? now : existing?.failedAt,
        appliedBy,
        error,
        schemaVersion: 1,
        metadata: { destructive: migration.destructive, requiresBackup: migration.requiresBackup, estimatedImpact: migration.estimatedImpact },
      };
      if (existing) Object.assign(existing, record);
      else data.databaseMigrations.push(record);
    });
  }
}

export const databaseMigrationService = new DatabaseMigrationService();
