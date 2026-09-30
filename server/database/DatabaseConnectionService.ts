import { MongoClient, type ClientSession, type Db } from "mongodb";
import { getBackendConfig } from "../config/backendConfig";
import type { ConfigurationHealthStatus } from "../config/configTypes";
import { DatabaseError } from "./databaseErrors";

export type DatabaseConnectionState = "disconnected" | "connecting" | "connected" | "degraded" | "reconnecting" | "failed" | "closing";

export interface DatabaseHealthReport {
  status: ConfigurationHealthStatus;
  connected: boolean;
  databaseNameSafe?: string;
  latencyMs?: number;
  poolSize?: number;
  migrationStatus: string;
  lastCheckedAt: string;
  warnings: string[];
  errors: string[];
}

const safeDatabaseName = (uri: string | undefined, fallback: string | undefined): string | undefined => {
  if (fallback) return fallback;
  if (!uri) return undefined;
  try {
    const parsed = new URL(uri);
    const name = parsed.pathname.replace(/^\/+/, "").split("?")[0];
    return name || undefined;
  } catch {
    return undefined;
  }
};

export class DatabaseConnectionService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private state: DatabaseConnectionState = "disconnected";
  private lastError: string | null = null;

  isConfigured(): boolean {
    return Boolean(getBackendConfig().database.uri);
  }

  async connect(): Promise<Db> {
    if (this.db && this.state === "connected") return this.db;
    const config = getBackendConfig();
    if (!config.database.uri) {
      this.state = "failed";
      throw new DatabaseError({
        code: "DATABASE_CONNECTION_FAILED",
        message: "MONGODB_URI is not configured.",
        operation: "connect",
        retryable: false,
      });
    }
    this.state = this.client ? "reconnecting" : "connecting";
    try {
      this.client = new MongoClient(config.database.uri, {
        connectTimeoutMS: config.database.connectTimeoutMs,
        serverSelectionTimeoutMS: config.database.serverSelectionTimeoutMs,
        maxPoolSize: config.database.maxPoolSize,
        minPoolSize: config.database.minPoolSize,
        retryWrites: config.database.retryWrites,
      });
      await this.client.connect();
      this.db = this.client.db(config.database.databaseName || safeDatabaseName(config.database.uri, undefined));
      this.state = "connected";
      this.lastError = null;
      return this.db;
    } catch (error) {
      this.state = "failed";
      this.lastError = error instanceof Error ? error.message : "Unknown database connection error.";
      throw new DatabaseError({
        code: "DATABASE_CONNECTION_FAILED",
        message: "Unable to connect to MongoDB.",
        operation: "connect",
        retryable: true,
      });
    }
  }

  async disconnect(): Promise<void> {
    this.state = "closing";
    await this.client?.close();
    this.client = null;
    this.db = null;
    this.state = "disconnected";
  }

  isConnected(): boolean {
    return this.state === "connected" && Boolean(this.db);
  }

  getConnectionState(): DatabaseConnectionState {
    return this.state;
  }

  async getDb(): Promise<Db> {
    return this.db ?? this.connect();
  }

  async ping(): Promise<{ ok: boolean; latencyMs?: number }> {
    const started = Date.now();
    const db = await this.getDb();
    await db.command({ ping: 1 });
    return { ok: true, latencyMs: Date.now() - started };
  }

  async getHealth(): Promise<DatabaseHealthReport> {
    const config = getBackendConfig();
    const warnings: string[] = [];
    const errors: string[] = [];
    if (!config.database.uri) {
      const message = "MONGODB_URI is not configured.";
      if (config.app.isProduction || config.app.isStaging) errors.push(message);
      else warnings.push(`${message} JSON fallback is allowed only for local development/test.`);
      return {
        status: errors.length ? "misconfigured" : "degraded",
        connected: false,
        databaseNameSafe: config.database.databaseName,
        migrationStatus: "not_checked",
        lastCheckedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
    try {
      const ping = await this.ping();
      return {
        status: ping.ok ? "healthy" : "degraded",
        connected: ping.ok,
        databaseNameSafe: safeDatabaseName(config.database.uri, config.database.databaseName),
        latencyMs: ping.latencyMs,
        poolSize: config.database.maxPoolSize,
        migrationStatus: "available",
        lastCheckedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    } catch {
      errors.push(this.lastError ?? "Database ping failed.");
      return {
        status: "unavailable",
        connected: false,
        databaseNameSafe: safeDatabaseName(config.database.uri, config.database.databaseName),
        migrationStatus: "not_checked",
        lastCheckedAt: new Date().toISOString(),
        warnings,
        errors,
      };
    }
  }

  async withSession<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
    const db = await this.getDb();
    const session = db.client.startSession();
    try {
      return await callback(session);
    } finally {
      await session.endSession();
    }
  }

  async shutdown(): Promise<void> {
    await this.disconnect();
  }
}

export const databaseConnectionService = new DatabaseConnectionService();
