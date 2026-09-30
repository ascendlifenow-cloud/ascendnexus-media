import { databaseConnectionService } from "./DatabaseConnectionService";
import { databaseIndexService } from "./DatabaseIndexService";
import { databaseIntegrityService } from "./DatabaseIntegrityService";
import { databaseMigrationService } from "./migrations/DatabaseMigrationService";

export class DatabaseHealthService {
  async getHealth() {
    const [connection, indexes, integrity, migrations] = await Promise.all([
      databaseConnectionService.getHealth(),
      databaseIndexService.compareIndexes().catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "Index check failed." })),
      databaseIntegrityService.buildIntegrityReport().catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "Integrity check failed." })),
      databaseMigrationService.getMigrationStatus().catch((error) => ({ status: "failed", error: error instanceof Error ? error.message : "Migration check failed." })),
    ]);
    return {
      status: connection.status === "healthy" && indexes.status === "healthy" && integrity.status === "healthy" ? "healthy" : "degraded",
      connection,
      indexes,
      integrity,
      migrations,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const databaseHealthService = new DatabaseHealthService();
