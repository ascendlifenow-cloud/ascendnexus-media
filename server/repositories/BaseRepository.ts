import type { MediaDatabaseShape } from "../services/media/JsonDatabase";
import { jsonDatabase } from "../services/media/JsonDatabase";

export interface ListOptions<T> {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  sort?: keyof T;
  direction?: "asc" | "desc";
  limit?: number;
}

export class BaseRepository<T extends Record<string, unknown>> {
  constructor(private readonly property: keyof MediaDatabaseShape, private readonly idField: keyof T) {}

  async list(options: ListOptions<T> = {}): Promise<T[]> {
    let records = [...(((await jsonDatabase.listCollection(this.property)) as T[]) ?? [])];
    if (!options.includeArchived) records = records.filter((record) => record.status !== "archived");
    if (!options.includeDeleted) records = records.filter((record) => record.status !== "deleted" && !record.deletedAt);
    if (options.sort) {
      records.sort((a, b) => String(a[options.sort!] ?? "").localeCompare(String(b[options.sort!] ?? "")));
      if (options.direction === "desc") records.reverse();
    }
    return options.limit ? records.slice(0, options.limit) : records;
  }

  async get(id: string): Promise<T | null> {
    return (await jsonDatabase.findCollectionRecord(this.property, { [String(this.idField)]: id })) as T | null;
  }

  async findBy(field: keyof T, value: unknown): Promise<T | null> {
    return (await jsonDatabase.findCollectionRecord(this.property, { [String(field)]: value })) as T | null;
  }

  async create(record: T): Promise<T> {
    const existing = await this.get(String(record[this.idField]));
    if (existing) throw new Error(`Duplicate ${String(this.idField)}.`);
    return (await jsonDatabase.insertCollectionRecord(this.property, record as never)) as T;
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    return (await jsonDatabase.patchCollectionRecord(
      this.property,
      { [String(this.idField)]: id },
      patch as never,
    )) as T | null;
  }

  async archive(id: string, actorId?: string): Promise<T | null> {
    return this.update(id, { status: "archived", archivedAt: new Date().toISOString(), archivedBy: actorId } as Partial<T>);
  }

  async softDelete(id: string, actorId?: string, reason?: string): Promise<T | null> {
    return this.update(id, { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: actorId, deleteReason: reason } as Partial<T>);
  }
}
