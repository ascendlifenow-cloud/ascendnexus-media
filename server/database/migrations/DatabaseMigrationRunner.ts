import { databaseMigrationService } from "./DatabaseMigrationService";

export const runDatabaseMigrations = (options: { dryRun?: boolean; appliedBy?: string; backupAcknowledged?: boolean } = {}) =>
  databaseMigrationService.runPendingMigrations(options);
