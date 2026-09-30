export type DatabaseErrorCode =
  | "DATABASE_UNAVAILABLE"
  | "DATABASE_CONNECTION_FAILED"
  | "DATABASE_VALIDATION_FAILED"
  | "DATABASE_DUPLICATE_KEY"
  | "DATABASE_CONFLICT"
  | "DATABASE_NOT_FOUND"
  | "DATABASE_TRANSACTION_FAILED"
  | "DATABASE_MIGRATION_FAILED"
  | "DATABASE_INDEX_FAILED"
  | "DATABASE_INTEGRITY_FAILED"
  | "DATABASE_WRITE_FAILED"
  | "DATABASE_READ_FAILED";

export interface NormalizedDatabaseError {
  code: DatabaseErrorCode;
  message: string;
  field?: string;
  retryable: boolean;
  operation: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export class DatabaseError extends Error {
  readonly code: DatabaseErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly operation: string;
  readonly field?: string;
  readonly metadata?: Record<string, string | number | boolean | null>;

  constructor(input: {
    code: DatabaseErrorCode;
    message: string;
    operation: string;
    status?: number;
    retryable?: boolean;
    field?: string;
    metadata?: Record<string, string | number | boolean | null>;
  }) {
    super(input.message);
    this.name = "DatabaseError";
    this.code = input.code;
    this.status = input.status ?? 500;
    this.retryable = input.retryable ?? false;
    this.operation = input.operation;
    this.field = input.field;
    this.metadata = input.metadata;
  }
}

const duplicateFieldFromMessage = (message: string): string | undefined => {
  const match = /index:\s+([^\s]+)_/.exec(message) ?? /dup key:\s+\{\s+([^:]+):/.exec(message);
  return match?.[1];
};

export const normalizeDatabaseError = (error: unknown, operation = "database"): NormalizedDatabaseError => {
  if (error instanceof DatabaseError) {
    return {
      code: error.code,
      message: error.message,
      field: error.field,
      retryable: error.retryable,
      operation: error.operation,
      metadata: error.metadata,
    };
  }
  const err = error as { code?: number | string; message?: string; name?: string };
  if (err?.code === 11000) {
    return {
      code: "DATABASE_DUPLICATE_KEY",
      message: "A record with the same unique value already exists.",
      field: duplicateFieldFromMessage(err.message ?? ""),
      retryable: false,
      operation,
    };
  }
  if (err?.name === "MongoNetworkError" || err?.name === "MongoServerSelectionError") {
    return {
      code: "DATABASE_UNAVAILABLE",
      message: "Database is unavailable.",
      retryable: true,
      operation,
    };
  }
  return {
    code: "DATABASE_WRITE_FAILED",
    message: "Database operation failed.",
    retryable: false,
    operation,
  };
};
