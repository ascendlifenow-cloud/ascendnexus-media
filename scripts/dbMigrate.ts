import { databaseMigrationService } from "../server/database/migrations/DatabaseMigrationService";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const backupAcknowledged = args.has("--backup-acknowledged");
const result = await databaseMigrationService.runPendingMigrations({ dryRun, appliedBy: "cli", backupAcknowledged });
console.log(JSON.stringify(result, null, 2));
