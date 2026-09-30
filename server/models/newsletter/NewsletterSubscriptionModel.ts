export interface NewsletterSubscriptionRecord {
  subscriptionId: string;
  newsletterSubscriptionId?: string;
  email: string;
  normalizedEmail: string;
  displayName?: string;
  status: "pending_confirmation" | "subscribed" | "unsubscribed" | "suppressed" | "bounced" | "complained" | "archived" | "pending" | "active";
  sourcePage?: string;
  sourceContext?: Record<string, unknown>;
  consent?: Record<string, unknown>;
  consentSource: string;
  consentTextVersion?: string;
  preferences?: Record<string, unknown>;
  confirmation?: {
    optInMode: "single_opt_in" | "double_opt_in";
    tokenHash?: string;
    expiresAt?: string;
    sentAt?: string;
    usedAt?: string;
  };
  unsubscribe?: {
    tokenHash?: string;
    requestedAt?: string;
    reason?: string;
  };
  suppression?: {
    reason?: string;
    source?: string;
  };
  deliveryStatus?: "not_required" | "queued" | "sent" | "failed" | "pending";
  idempotencyKey?: string;
  subscribedAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  suppressedAt?: string;
  unsubscribeReason?: string;
  confirmationTokenHash?: string;
  unsubscribeTokenHash?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  schemaVersion: number;
}
