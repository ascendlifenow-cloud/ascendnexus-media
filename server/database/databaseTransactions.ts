import type { ClientSession } from "mongodb";
import { databaseConnectionService } from "./DatabaseConnectionService";

export const withDatabaseTransaction = async <T>(callback: (session?: ClientSession) => Promise<T>): Promise<T> => {
  if (!databaseConnectionService.isConfigured()) return callback(undefined);
  return databaseConnectionService.withSession(async (session) => {
    let result!: T;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  });
};

export const atomicIncrementVersionNumber = (current: number | undefined): number => Math.max(0, current ?? 0) + 1;

export const isTerminalStatus = (status: string): boolean => ["completed", "failed", "canceled", "archived", "deleted", "revoked", "expired"].includes(status);
