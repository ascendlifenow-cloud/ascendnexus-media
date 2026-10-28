import { createHash } from "node:crypto";

export const publicationSyncId = (entityType: string, entityId: string): string =>
  `sync-${createHash("sha256").update(JSON.stringify([entityType, entityId])).digest("hex")}`;
