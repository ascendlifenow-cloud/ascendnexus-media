export type BillingProviderKey = "stripe" | "manual" | "test";
export type BillingPlanInterval = "free" | "monthly" | "annual" | "custom";
export type BillingPlanStatus = "draft" | "active" | "inactive" | "archived";
export type SubscriptionState = "pending" | "trial" | "active" | "grace" | "past_due" | "suspended" | "canceled" | "expired" | "refunded" | "paused";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded" | "canceled";
export type InvoiceStatus = "draft" | "open" | "paid" | "failed" | "void" | "refunded";
export type DiscountType = "fixed" | "percentage";
export type DiscountDuration = "one_time" | "recurring";
export type GiftMembershipStatus = "purchased" | "redeemed" | "expired" | "canceled";

export interface BillingPlanRecord {
  billingPlanId: string;
  planKey: string;
  membershipTierKey: "free" | "premium" | "supporter" | "vip" | "enterprise" | "custom";
  name: string;
  description: string;
  interval: BillingPlanInterval;
  amountCents: number;
  currency: string;
  status: BillingPlanStatus;
  provider: BillingProviderKey;
  providerPriceId?: string;
  trialDays?: number;
  isPubliclyVisible: boolean;
  metadataSafe?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MemberSubscriptionRecord {
  subscriptionId: string;
  memberId: string;
  billingPlanId: string;
  planKey: string;
  provider: BillingProviderKey;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  state: SubscriptionState;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  graceEndsAt?: string;
  cancelAt?: string;
  canceledAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  latestInvoiceId?: string;
  couponCode?: string;
  promotionCode?: string;
  metadataSafe?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface PaymentMethodRecord {
  paymentMethodId: string;
  memberId: string;
  provider: BillingProviderKey;
  providerPaymentMethodId: string;
  type: "card" | "wallet_readiness" | "manual";
  brand?: string;
  lastFour?: string;
  expirationMonth?: number;
  expirationYear?: number;
  status: "active" | "expired" | "removed";
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface PaymentRecord {
  paymentId: string;
  memberId: string;
  subscriptionId?: string;
  invoiceId?: string;
  provider: BillingProviderKey;
  providerPaymentId?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  failureCode?: string;
  failureMessageSafe?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface InvoiceRecord {
  invoiceId: string;
  invoiceNumber: string;
  memberId: string;
  subscriptionId?: string;
  provider: BillingProviderKey;
  providerInvoiceId?: string;
  status: InvoiceStatus;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  amountPaidCents: number;
  currency: string;
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  receiptNumber?: string;
  lineItems: Array<{ description: string; amountCents: number; quantity: number }>;
  metadataSafe?: Record<string, unknown>;
  schemaVersion: number;
}

export interface RefundRecord {
  refundId: string;
  memberId: string;
  paymentId: string;
  subscriptionId?: string;
  provider: BillingProviderKey;
  providerRefundId?: string;
  amountCents: number;
  currency: string;
  status: "pending" | "succeeded" | "failed";
  reason: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface CouponRecord {
  couponId: string;
  code: string;
  discountType: DiscountType;
  amountOffCents?: number;
  percentOff?: number;
  duration: DiscountDuration;
  status: "active" | "inactive" | "expired" | "archived";
  usageLimit?: number;
  usedCount: number;
  startsAt?: string;
  expiresAt?: string;
  restrictedMemberIds?: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface PromotionRecord {
  promotionId: string;
  promotionKey: string;
  name: string;
  type: "launch" | "seasonal" | "referral" | "artist" | "invitation";
  couponCode?: string;
  status: "draft" | "active" | "paused" | "expired" | "archived";
  startsAt: string;
  endsAt?: string;
  metadataSafe?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface GiftMembershipRecord {
  giftId: string;
  purchaserMemberId?: string;
  recipientEmailHash?: string;
  billingPlanId: string;
  redemptionCodeHash: string;
  status: GiftMembershipStatus;
  purchasedAt: string;
  expiresAt: string;
  redeemedByMemberId?: string;
  redeemedAt?: string;
  schemaVersion: number;
}

export interface BillingWebhookEventRecord {
  webhookEventId: string;
  provider: BillingProviderKey;
  providerEventId: string;
  eventType: string;
  status: "received" | "processed" | "failed";
  signatureVerified: boolean;
  processedAt?: string;
  errorSafe?: string;
  metadataSafe?: Record<string, unknown>;
  receivedAt: string;
  schemaVersion: number;
}

export interface BillingRevenueSnapshotRecord {
  revenueSnapshotId: string;
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  generatedAt: string;
  metrics: Record<string, number | string>;
  schemaVersion: number;
}
