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
    const data = await jsonDatabase.read();
    let records = [...((data[this.property] as T[]) ?? [])];
    if (!options.includeArchived) records = records.filter((record) => record.status !== "archived");
    if (!options.includeDeleted) records = records.filter((record) => record.status !== "deleted" && !record.deletedAt);
    if (options.sort) {
      records.sort((a, b) => String(a[options.sort!] ?? "").localeCompare(String(b[options.sort!] ?? "")));
      if (options.direction === "desc") records.reverse();
    }
    return options.limit ? records.slice(0, options.limit) : records;
  }

  async get(id: string): Promise<T | null> {
    const data = await jsonDatabase.read();
    return (((data[this.property] as T[]) ?? []).find((record) => record[this.idField] === id) as T | undefined) ?? null;
  }

  async findBy(field: keyof T, value: unknown): Promise<T | null> {
    const data = await jsonDatabase.read();
    return (((data[this.property] as T[]) ?? []).find((record) => record[field] === value) as T | undefined) ?? null;
  }

  async create(record: T): Promise<T> {
    await jsonDatabase.update((data) => {
      const records = (data[this.property] as T[]) ?? [];
      if (records.some((item) => item[this.idField] === record[this.idField])) throw new Error(`Duplicate ${String(this.idField)}.`);
      records.push(record);
      (data[this.property] as T[]) = records;
    });
    return record;
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    let updated: T | null = null;
    await jsonDatabase.update((data) => {
      const records = (data[this.property] as T[]) ?? [];
      (data[this.property] as T[]) = records.map((record) => {
        if (record[this.idField] !== id) return record;
        updated = { ...record, ...patch, updatedAt: new Date().toISOString() } as T;
        return updated;
      });
    });
    return updated;
  }

  async archive(id: string, actorId?: string): Promise<T | null> {
    return this.update(id, { status: "archived", archivedAt: new Date().toISOString(), archivedBy: actorId } as Partial<T>);
  }

  async softDelete(id: string, actorId?: string, reason?: string): Promise<T | null> {
    return this.update(id, { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: actorId, deleteReason: reason } as Partial<T>);
  }
}
