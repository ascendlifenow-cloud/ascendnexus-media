import { getBackendConfig } from "../config/backendConfig";
import { adminRoleService } from "../services/auth/AdminRoleService";
import { mediaAuditPersistenceService } from "../services/media/MediaAuditPersistenceService";
import { databaseConnectionService } from "./DatabaseConnectionService";
import { databaseIndexService } from "./DatabaseIndexService";

export class DatabaseInitializationService {
  async initialize() {
    const config = getBackendConfig();
    const warnings: string[] = [];
    if (databaseConnectionService.isConfigured()) {
      await databaseConnectionService.connect();
    } else if (config.app.isProduction || config.app.isStaging) {
      throw new Error("MONGODB_URI is required for production/staging database initialization.");
    } else {
      warnings.push("MongoDB is not configured; using local JSON fallback for development/test only.");
    }
    const indexReport = await databaseIndexService.ensureIndexes();
    const roles = await adminRoleService.initializeRoles();
    await mediaAuditPersistenceService.record("database_initialization_completed", "Database initialization completed", {
      entityType: "system",
      metadata: { indexStatus: indexReport.status, roleCount: roles.length },
    });
    return {
      success: true,
      mode: databaseConnectionService.isConfigured() ? "mongodb" : "local_development_json",
      indexStatus: indexReport.status,
      roleCount: roles.length,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }
}

export const databaseInitializationService = new DatabaseInitializationService();
