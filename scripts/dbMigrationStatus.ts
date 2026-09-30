import { databaseMigrationService } from "../server/database/migrations/DatabaseMigrationService";

console.log(JSON.stringify({ success: true, data: await databaseMigrationService.getMigrationStatus() }, null, 2));
