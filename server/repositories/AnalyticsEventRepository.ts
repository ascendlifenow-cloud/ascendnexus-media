import type { AnalyticsEventRecord } from "../models/analytics/AnalyticsEventModel";
import { BaseRepository } from "./BaseRepository";

export class AnalyticsEventRepository extends BaseRepository<AnalyticsEventRecord> {
  constructor() {
    super("analyticsEventRecords", "analyticsEventId");
  }

  async recent(limit = 50): Promise<AnalyticsEventRecord[]> {
    return this.list({ includeArchived: true, sort: "receivedAt", direction: "desc", limit });
  }
}

export const analyticsEventRepository = new AnalyticsEventRepository();
