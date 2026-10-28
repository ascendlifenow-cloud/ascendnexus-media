import { isDeepStrictEqual } from "node:util";
import type { ClientSession, Db } from "mongodb";
import { databaseCollections } from "./collectionRegistry";
import { stripInternalMongoFields, withDatabaseDefaults } from "./databaseSerialization";
import { publicationSyncId } from "./publicationSyncIdentity";

type RecordData = Record<string, unknown>;
type Snapshot = Record<string, RecordData[]>;
export interface SnapshotChange {
  collectionName: string;
  idField: string;
  id: string;
  legacyFilter?: Record<string, unknown>;
  before?: RecordData;
  after?: RecordData;
}

const comparable = (record: RecordData) => JSON.parse(JSON.stringify(stripInternalMongoFields(record)));
const equal = (left: RecordData, right: RecordData) => isDeepStrictEqual(comparable(left), comparable(right));

export function planSnapshotChanges(before: Snapshot, after: Snapshot): SnapshotChange[] {
  const changes: SnapshotChange[] = [];
  for (const definition of databaseCollections) {
    if (isDeepStrictEqual(before[definition.property] ?? [], after[definition.property] ?? [])) continue;
    const index = (records: RecordData[]) => {
      const result = new Map<string, RecordData>();
      for (const record of records) {
        const legacySync = definition.property === "publishedContentSyncStatuses" && record.syncStatusId === undefined && typeof record.entityType === "string" && typeof record.entityId === "string";
        const id = legacySync ? publicationSyncId(record.entityType as string, record.entityId as string) : record[definition.applicationId];
        if (typeof id !== "string" || !id || result.has(id)) throw new Error("Database mutation contains missing or duplicate identifiers.");
        result.set(id, record);
      }
      return result;
    };
    const previous = index(before[definition.property] ?? []);
    const next = index(after[definition.property] ?? []);
    for (const id of new Set([...previous.keys(), ...next.keys()])) {
      const oldRecord = previous.get(id);
      const newRecord = next.get(id);
      if (oldRecord && newRecord && equal(oldRecord, newRecord)) continue;
      const legacyFilter = definition.property === "publishedContentSyncStatuses" && oldRecord && oldRecord.syncStatusId === undefined
        ? { entityType: oldRecord.entityType, entityId: oldRecord.entityId, syncStatusId: { $exists: false } } : undefined;
      const afterRecord = definition.property === "publishedContentSyncStatuses" && newRecord && newRecord.syncStatusId === undefined ? { ...newRecord, syncStatusId: id } : newRecord;
      changes.push({ collectionName: definition.collectionName, idField: definition.applicationId, id, legacyFilter, before: oldRecord, after: afterRecord });
    }
  }
  return changes;
}

// Called inside one Mongo transaction: stale snapshots never replace newer records.
export async function applySnapshotChanges(db: Db, session: ClientSession, changes: SnapshotChange[]): Promise<void> {
  for (const change of changes) {
    const collection = db.collection(change.collectionName);
    const filter = change.legacyFilter ?? { [change.idField]: change.id };
    const current = await collection.findOne(filter, { session });
    if (change.before ? !current || !equal(change.before, current) : Boolean(current)) {
      throw new Error("Database mutation conflict. Reload the current record and retry.");
    }
  }
  for (const change of changes) {
    const collection = db.collection(change.collectionName);
    const filter = change.legacyFilter ?? { [change.idField]: change.id };
    if (!change.after) await collection.deleteOne(filter, { session });
    else if (!change.before) await collection.insertOne(withDatabaseDefaults(change.after), { session });
    else await collection.replaceOne(filter, withDatabaseDefaults(change.after), { session });
  }
}
