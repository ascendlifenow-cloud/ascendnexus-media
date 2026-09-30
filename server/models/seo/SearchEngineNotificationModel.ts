export interface SearchEngineNotificationRecord {
  searchEngineNotificationId: string;
  provider: "indexnow" | "google" | "bing" | "custom";
  notificationType: "published" | "updated" | "removed";
  urls: string[];
  status: "queued" | "sent" | "failed" | "skipped" | "archived";
  responseCategory?: string;
  attemptedAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
