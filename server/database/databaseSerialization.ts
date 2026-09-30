const sensitiveKeyPattern = /(password|token|secret|credential|signedUrl|apiKey|privateKey|refreshToken|accessToken)/i;

export interface DatabaseRecordBase {
  createdAt: string;
  updatedAt?: string;
  schemaVersion: number;
  createdBy?: string;
  updatedBy?: string;
  metadata?: Record<string, unknown>;
}

export const currentSchemaVersion = 1;

export const withDatabaseDefaults = <T extends Record<string, unknown>>(record: T, actorId?: string): T & DatabaseRecordBase => {
  const now = new Date().toISOString();
  return {
    ...record,
    schemaVersion: typeof record.schemaVersion === "number" ? record.schemaVersion : currentSchemaVersion,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    createdBy: typeof record.createdBy === "string" ? record.createdBy : actorId,
    updatedBy: typeof record.updatedBy === "string" ? record.updatedBy : actorId,
  } as T & DatabaseRecordBase;
};

export const stripInternalMongoFields = <T>(record: T): T => {
  if (!record || typeof record !== "object") return record;
  const clone = { ...(record as Record<string, unknown>) };
  delete clone._id;
  delete clone.__v;
  return clone as T;
};

export const sanitizeDatabaseRecord = <T>(record: T): T => {
  if (Array.isArray(record)) return record.map((item) => sanitizeDatabaseRecord(item)) as T;
  if (!record || typeof record !== "object") return record;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (key === "_id" || key === "__v" || sensitiveKeyPattern.test(key)) continue;
    output[key] = sanitizeDatabaseRecord(value);
  }
  return output as T;
};

export const isUrlSafeSlug = (value: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

export const metadataSizeBytes = (metadata?: Record<string, unknown>): number => Buffer.byteLength(JSON.stringify(metadata ?? {}), "utf8");

export const assertBoundedMetadata = (metadata: Record<string, unknown> | undefined, maxBytes = 16_384): void => {
  if (metadataSizeBytes(metadata) > maxBytes) throw new Error(`Metadata exceeds ${maxBytes} bytes.`);
};
