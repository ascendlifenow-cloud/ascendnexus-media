import type { ConsentPolicyRecord } from "../models/analytics/ConsentPolicyModel";
import { BaseRepository } from "./BaseRepository";

export class ConsentPolicyRepository extends BaseRepository<ConsentPolicyRecord> {
  constructor() {
    super("consentPolicyRecords", "consentPolicyId");
  }

  async getPublished(): Promise<ConsentPolicyRecord | null> {
    const records = await this.list({ includeArchived: true, sort: "publishedAt", direction: "desc" });
    return records.find((record) => record.status === "published") ?? null;
  }
}

export const consentPolicyRepository = new ConsentPolicyRepository();
