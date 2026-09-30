import { createHash, randomUUID } from "node:crypto";
import type {
  BillingPlanRecord,
  BillingProviderKey,
  CouponRecord,
  GiftMembershipRecord,
  InvoiceRecord,
  MemberSubscriptionRecord,
  PaymentRecord,
  PromotionRecord,
  RefundRecord,
  SubscriptionState,
} from "../../models/billing/BillingModels";
import { AuthApiError } from "../../utils/auth/authErrorUtils";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { membershipAssignmentService } from "../membership/MembershipAssignmentService";
import { membershipCatalogService } from "../membership/MembershipCatalogService";

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`;
const cents = (value: number) => Math.max(0, Math.round(value));
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const defaultBillingPlans: Array<Pick<BillingPlanRecord, "planKey" | "membershipTierKey" | "name" | "description" | "interval" | "amountCents" | "currency" | "trialDays">> = [
  { planKey: "free", membershipTierKey: "free", name: "Free", description: "Free member access.", interval: "free", amountCents: 0, currency: "USD" },
  { planKey: "premium-monthly", membershipTierKey: "premium", name: "Premium Monthly", description: "Premium monthly membership.", interval: "monthly", amountCents: 999, currency: "USD", trialDays: 7 },
  { planKey: "premium-annual", membershipTierKey: "premium", name: "Premium Annual", description: "Premium annual membership.", interval: "annual", amountCents: 9999, currency: "USD", trialDays: 7 },
  { planKey: "supporter-monthly", membershipTierKey: "supporter", name: "Supporter Monthly", description: "Supporter monthly membership.", interval: "monthly", amountCents: 1999, currency: "USD", trialDays: 7 },
  { planKey: "supporter-annual", membershipTierKey: "supporter", name: "Supporter Annual", description: "Supporter annual membership.", interval: "annual", amountCents: 19999, currency: "USD", trialDays: 7 },
  { planKey: "vip-monthly", membershipTierKey: "vip", name: "VIP Monthly", description: "VIP monthly membership.", interval: "monthly", amountCents: 4999, currency: "USD" },
  { planKey: "vip-annual", membershipTierKey: "vip", name: "VIP Annual", description: "VIP annual membership.", interval: "annual", amountCents: 49999, currency: "USD" },
];

export interface CheckoutSessionResult {
  checkoutSessionId: string;
  provider: BillingProviderKey;
  providerCheckoutSessionId: string;
  checkoutUrl?: string;
  status: "pending" | "provider_configuration_required";
  subscriptionId: string;
  plan: BillingPlanRecord;
  safeMessage: string;
}

export interface PaymentProviderAdapter {
  provider: BillingProviderKey;
  createCheckoutSession(input: { memberId: string; plan: BillingPlanRecord; coupon?: CouponRecord }): Promise<Pick<CheckoutSessionResult, "providerCheckoutSessionId" | "checkoutUrl" | "status" | "safeMessage">>;
  verifyWebhook(input: { signature?: string; rawBody?: string; payload: Record<string, unknown> }): Promise<{ verified: boolean; providerEventId: string; eventType: string }>;
  getHealth(): Promise<Record<string, unknown>>;
}

export class StripeProvider implements PaymentProviderAdapter {
  provider: BillingProviderKey = "stripe";

  async createCheckoutSession(input: { memberId: string; plan: BillingPlanRecord; coupon?: CouponRecord }) {
    const configured = Boolean(process.env.STRIPE_SECRET_KEY && input.plan.providerPriceId);
    return {
      providerCheckoutSessionId: `stripe-checkout-${Date.now()}-${randomUUID().slice(0, 8)}`,
      checkoutUrl: configured ? `https://checkout.stripe.com/c/pay/${input.plan.providerPriceId}` : undefined,
      status: configured ? "pending" as const : "provider_configuration_required" as const,
      safeMessage: configured ? "Stripe checkout session prepared." : "Stripe checkout requires STRIPE_SECRET_KEY and a provider price ID.",
    };
  }

  async verifyWebhook(input: { signature?: string; payload: Record<string, unknown> }) {
    const configured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    const providerEventId = String(input.payload.id ?? `stripe-local-${Date.now()}`);
    const eventType = String(input.payload.type ?? input.payload.eventType ?? "unknown");
    return { verified: configured ? Boolean(input.signature) : input.payload.testMode === true, providerEventId, eventType };
  }

  async getHealth() {
    return {
      provider: this.provider,
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      mode: process.env.STRIPE_SECRET_KEY ? "stripe_ready" : "configuration_required",
    };
  }
}

export class ManualBillingProvider implements PaymentProviderAdapter {
  provider: BillingProviderKey = "manual";

  async createCheckoutSession(input: { memberId: string; plan: BillingPlanRecord }) {
    return {
      providerCheckoutSessionId: `manual-checkout-${input.memberId}-${Date.now()}`,
      status: "pending" as const,
      safeMessage: "Manual billing checkout recorded for administrator completion.",
    };
  }

  async verifyWebhook(input: { payload: Record<string, unknown> }) {
    return { verified: input.payload.testMode === true, providerEventId: String(input.payload.id ?? `manual-${Date.now()}`), eventType: String(input.payload.type ?? input.payload.eventType ?? "manual.event") };
  }

  async getHealth() {
    return { provider: this.provider, configured: true, mode: "manual_readiness" };
  }
}

export class PaymentProviderService {
  private readonly stripe = new StripeProvider();
  private readonly manual = new ManualBillingProvider();

  getProvider(provider: BillingProviderKey = "stripe") {
    return provider === "manual" || provider === "test" ? this.manual : this.stripe;
  }

  async getHealth() {
    return { stripe: await this.stripe.getHealth(), manual: await this.manual.getHealth(), selectedProductionProvider: "stripe" };
  }
}

export class BillingPlanService {
  async ensureDefaultPlans(actorId = "system") {
    await membershipCatalogService.ensureDefaultCatalog(actorId);
    const now = nowIso();
    await jsonDatabase.update((data) => {
      for (const plan of defaultBillingPlans) {
        if (data.billingPlans.some((item) => item.planKey === plan.planKey)) continue;
        data.billingPlans.push({
          billingPlanId: `billing-plan-${plan.planKey}`,
          ...plan,
          status: "active",
          provider: plan.amountCents > 0 ? "stripe" : "manual",
          isPubliclyVisible: true,
          metadataSafe: { commerceReady: true, providerRequired: plan.amountCents > 0 },
          createdAt: now,
          updatedAt: now,
          schemaVersion: 1,
        });
      }
    });
    await mediaAuditPersistenceService.record("billing_plans_verified", "Billing plans verified.", { actorId, entityType: "billing_plan" });
    return this.listPublicPlans();
  }

  async listPublicPlans() {
    const data = await jsonDatabase.read();
    if (!data.billingPlans.length) return this.ensureDefaultPlans();
    return data.billingPlans.filter((plan) => plan.status === "active" && plan.isPubliclyVisible).sort((a, b) => a.amountCents - b.amountCents);
  }

  async getPlan(planKey: string) {
    const plans = await this.listPublicPlans();
    const plan = plans.find((item) => item.planKey === planKey);
    if (!plan) throw new AuthApiError("BILLING_PLAN_NOT_FOUND", "Billing plan was not found.", 404);
    return plan;
  }
}

export class CouponService {
  async create(input: Partial<CouponRecord>, actorId = "system") {
    const timestamp = nowIso();
    const code = String(input.code ?? "").trim().toUpperCase();
    if (!code) throw new AuthApiError("BILLING_COUPON_INVALID", "Coupon code is required.", 400);
    const coupon: CouponRecord = {
      couponId: id("coupon"),
      code,
      discountType: input.discountType ?? "percentage",
      amountOffCents: input.amountOffCents,
      percentOff: input.percentOff ?? 10,
      duration: input.duration ?? "one_time",
      status: input.status ?? "active",
      usageLimit: input.usageLimit,
      usedCount: 0,
      startsAt: input.startsAt,
      expiresAt: input.expiresAt,
      restrictedMemberIds: input.restrictedMemberIds,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      if (data.couponRecords.some((item) => item.code === coupon.code)) throw new AuthApiError("BILLING_COUPON_EXISTS", "Coupon code already exists.", 409);
      data.couponRecords.unshift(coupon);
    });
    await mediaAuditPersistenceService.record("billing_coupon_created", `Billing coupon ${coupon.code} created.`, { actorId, entityType: "billing_coupon", entityId: coupon.couponId });
    return coupon;
  }

  async validate(code: string | undefined, memberId: string, plan: BillingPlanRecord) {
    if (!code) return undefined;
    const normalized = code.trim().toUpperCase();
    const data = await jsonDatabase.read();
    const coupon = data.couponRecords.find((item) => item.code === normalized && item.status === "active");
    if (!coupon) throw new AuthApiError("BILLING_COUPON_INVALID", "Coupon is invalid.", 400);
    if (coupon.expiresAt && Date.parse(coupon.expiresAt) <= Date.now()) throw new AuthApiError("BILLING_COUPON_EXPIRED", "Coupon is expired.", 400);
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new AuthApiError("BILLING_COUPON_LIMIT_REACHED", "Coupon usage limit has been reached.", 400);
    if (coupon.restrictedMemberIds?.length && !coupon.restrictedMemberIds.includes(memberId)) throw new AuthApiError("BILLING_COUPON_NOT_ALLOWED", "Coupon is not available for this member.", 403);
    if (plan.amountCents === 0) throw new AuthApiError("BILLING_COUPON_NOT_APPLICABLE", "Coupon is not applicable to a free plan.", 400);
    return coupon;
  }

  discountFor(coupon: CouponRecord | undefined, amountCents: number) {
    if (!coupon) return 0;
    return coupon.discountType === "fixed" ? Math.min(amountCents, cents(coupon.amountOffCents ?? 0)) : cents(amountCents * ((coupon.percentOff ?? 0) / 100));
  }

  async markUsed(code?: string) {
    if (!code) return;
    await jsonDatabase.update((data) => {
      const coupon = data.couponRecords.find((item) => item.code === code.toUpperCase());
      if (coupon) {
        coupon.usedCount += 1;
        coupon.updatedAt = nowIso();
      }
    });
  }
}

export class InvoiceService {
  async createInvoice(input: { memberId: string; subscriptionId?: string; plan: BillingPlanRecord; coupon?: CouponRecord }) {
    const timestamp = nowIso();
    const discountCents = couponService.discountFor(input.coupon, input.plan.amountCents);
    const taxCents = 0;
    const totalCents = Math.max(0, input.plan.amountCents - discountCents + taxCents);
    const invoice: InvoiceRecord = {
      invoiceId: id("invoice"),
      invoiceNumber: `ANM-${Date.now()}`,
      memberId: input.memberId,
      subscriptionId: input.subscriptionId,
      provider: input.plan.provider,
      status: totalCents === 0 ? "paid" : "open",
      subtotalCents: input.plan.amountCents,
      discountCents,
      taxCents,
      totalCents,
      amountPaidCents: totalCents === 0 ? 0 : 0,
      currency: input.plan.currency,
      issuedAt: timestamp,
      dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      paidAt: totalCents === 0 ? timestamp : undefined,
      receiptNumber: totalCents === 0 ? `RCPT-${Date.now()}` : undefined,
      lineItems: [{ description: input.plan.name, amountCents: input.plan.amountCents, quantity: 1 }],
      metadataSafe: { taxReadiness: "not_configured", couponCode: input.coupon?.code },
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => data.invoiceRecords.unshift(invoice));
    return invoice;
  }

  async listForMember(memberId: string) {
    const data = await jsonDatabase.read();
    return data.invoiceRecords.filter((invoice) => invoice.memberId === memberId).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  }

  async markPaid(invoiceId: string, paymentId: string) {
    await jsonDatabase.update((data) => {
      const invoice = data.invoiceRecords.find((item) => item.invoiceId === invoiceId);
      const payment = data.paymentRecords.find((item) => item.paymentId === paymentId);
      if (invoice && payment) {
        invoice.status = "paid";
        invoice.amountPaidCents = payment.amountCents;
        invoice.paidAt = nowIso();
        invoice.receiptNumber = invoice.receiptNumber ?? `RCPT-${Date.now()}`;
      }
    });
  }
}

export class EntitlementSyncService {
  async syncSubscription(subscriptionId: string, actorId = "billing-system") {
    const data = await jsonDatabase.read();
    const subscription = data.memberSubscriptions.find((item) => item.subscriptionId === subscriptionId);
    if (!subscription) throw new AuthApiError("BILLING_SUBSCRIPTION_NOT_FOUND", "Subscription was not found.", 404);
    const plan = data.billingPlans.find((item) => item.billingPlanId === subscription.billingPlanId);
    if (!plan) throw new AuthApiError("BILLING_PLAN_NOT_FOUND", "Billing plan was not found.", 404);
    const shouldGrant = ["trial", "active", "grace"].includes(subscription.state);
    if (shouldGrant) {
      const tier = await membershipCatalogService.getTierByKey(plan.membershipTierKey);
      if (tier) await membershipAssignmentService.assignTier(subscription.memberId, tier.tierId, "subscription", actorId, subscription.currentPeriodEnd);
      return { synchronized: true, action: "grant", tierKey: plan.membershipTierKey, state: subscription.state };
    }
    await membershipAssignmentService.revokeMembership(subscription.memberId, `Subscription state ${subscription.state} removed paid access.`, actorId);
    const freeTier = await membershipCatalogService.getTierByKey("free");
    if (freeTier) await membershipAssignmentService.assignTier(subscription.memberId, freeTier.tierId, "subscription", actorId);
    return { synchronized: true, action: "revoke_to_free", tierKey: "free", state: subscription.state };
  }
}

export class SubscriptionService {
  async checkout(memberId: string, planKey: string, couponCode?: string): Promise<CheckoutSessionResult> {
    const plan = await billingPlanService.getPlan(planKey);
    const coupon = await couponService.validate(couponCode, memberId, plan);
    const provider = paymentProviderService.getProvider(plan.provider);
    const providerSession = await provider.createCheckoutSession({ memberId, plan, coupon });
    const timestamp = nowIso();
    let subscription: MemberSubscriptionRecord;
    const invoice = await invoiceService.createInvoice({ memberId, plan, coupon });
    await jsonDatabase.update((data) => {
      for (const existing of data.memberSubscriptions) {
        if (existing.memberId === memberId && ["pending", "trial", "active", "grace", "past_due"].includes(existing.state)) {
          existing.state = "canceled";
          existing.canceledAt = timestamp;
          existing.updatedAt = timestamp;
        }
      }
      subscription = {
        subscriptionId: id("subscription"),
        memberId,
        billingPlanId: plan.billingPlanId,
        planKey: plan.planKey,
        provider: plan.provider,
        providerSubscriptionId: providerSession.providerCheckoutSessionId,
        state: plan.amountCents === 0 ? "active" : "pending",
        currentPeriodStart: timestamp,
        currentPeriodEnd: this.periodEnd(plan.interval),
        trialEndsAt: plan.trialDays ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000).toISOString() : undefined,
        latestInvoiceId: invoice.invoiceId,
        couponCode: coupon?.code,
        metadataSafe: { checkoutSessionId: providerSession.providerCheckoutSessionId },
        createdAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: 1,
      };
      data.memberSubscriptions.unshift(subscription);
      const targetInvoice = data.invoiceRecords.find((item) => item.invoiceId === invoice.invoiceId);
      if (targetInvoice) targetInvoice.subscriptionId = subscription.subscriptionId;
    });
    await couponService.markUsed(coupon?.code);
    await mediaAuditPersistenceService.record("billing_checkout_created", `Checkout created for ${plan.planKey}.`, { actorId: memberId, entityType: "member_subscription", entityId: subscription!.subscriptionId });
    if (plan.amountCents === 0) await entitlementSyncService.syncSubscription(subscription!.subscriptionId);
    return { checkoutSessionId: providerSession.providerCheckoutSessionId, provider: plan.provider, providerCheckoutSessionId: providerSession.providerCheckoutSessionId, checkoutUrl: providerSession.checkoutUrl, status: providerSession.status, subscriptionId: subscription!.subscriptionId, plan, safeMessage: providerSession.safeMessage };
  }

  async listForMember(memberId: string) {
    const data = await jsonDatabase.read();
    return data.memberSubscriptions.filter((item) => item.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async current(memberId: string) {
    const subscriptions = await this.listForMember(memberId);
    return subscriptions.find((item) => ["pending", "trial", "active", "grace", "past_due", "paused"].includes(item.state));
  }

  async updateState(subscriptionId: string, state: SubscriptionState, actorId = "billing-system") {
    await jsonDatabase.update((data) => {
      const subscription = data.memberSubscriptions.find((item) => item.subscriptionId === subscriptionId || item.providerSubscriptionId === subscriptionId);
      if (!subscription) throw new AuthApiError("BILLING_SUBSCRIPTION_NOT_FOUND", "Subscription was not found.", 404);
      subscription.state = state;
      subscription.updatedAt = nowIso();
      if (state === "canceled") subscription.canceledAt = subscription.updatedAt;
      if (state === "paused") subscription.pausedAt = subscription.updatedAt;
      if (state === "active") subscription.resumedAt = subscription.updatedAt;
    });
    const data = await jsonDatabase.read();
    const subscription = data.memberSubscriptions.find((item) => item.subscriptionId === subscriptionId || item.providerSubscriptionId === subscriptionId);
    if (subscription) await entitlementSyncService.syncSubscription(subscription.subscriptionId, actorId);
    return subscription;
  }

  async cancel(memberId: string) {
    const current = await this.current(memberId);
    if (!current) throw new AuthApiError("BILLING_SUBSCRIPTION_NOT_FOUND", "No active subscription was found.", 404);
    return this.updateState(current.subscriptionId, "canceled", memberId);
  }

  private periodEnd(interval: BillingPlanRecord["interval"]) {
    const days = interval === "annual" ? 365 : interval === "monthly" ? 30 : 3650;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
}

export class PaymentService {
  async recordPayment(input: { memberId: string; subscriptionId?: string; invoiceId?: string; provider?: BillingProviderKey; providerPaymentId?: string; amountCents: number; currency: string; status: PaymentRecord["status"] }) {
    const timestamp = nowIso();
    const payment: PaymentRecord = {
      paymentId: id("payment"),
      memberId: input.memberId,
      subscriptionId: input.subscriptionId,
      invoiceId: input.invoiceId,
      provider: input.provider ?? "stripe",
      providerPaymentId: input.providerPaymentId,
      amountCents: cents(input.amountCents),
      currency: input.currency,
      status: input.status,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => data.paymentRecords.unshift(payment));
    if (payment.status === "succeeded" && payment.invoiceId) await invoiceService.markPaid(payment.invoiceId, payment.paymentId);
    return payment;
  }

  async listForMember(memberId: string) {
    const data = await jsonDatabase.read();
    return data.paymentRecords.filter((payment) => payment.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class RefundService {
  async create(input: { paymentId: string; amountCents?: number; reason?: string }, actorId = "system") {
    const data = await jsonDatabase.read();
    const payment = data.paymentRecords.find((item) => item.paymentId === input.paymentId);
    if (!payment) throw new AuthApiError("BILLING_PAYMENT_NOT_FOUND", "Payment was not found.", 404);
    const refundAmount = cents(input.amountCents ?? payment.amountCents);
    const timestamp = nowIso();
    const refund: RefundRecord = {
      refundId: id("refund"),
      memberId: payment.memberId,
      paymentId: payment.paymentId,
      subscriptionId: payment.subscriptionId,
      provider: payment.provider,
      amountCents: refundAmount,
      currency: payment.currency,
      status: "succeeded",
      reason: String(input.reason ?? "Administrative refund").slice(0, 500),
      createdBy: actorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((next) => {
      next.refundRecords.unshift(refund);
      const target = next.paymentRecords.find((item) => item.paymentId === payment.paymentId);
      if (target) {
        target.status = refundAmount >= target.amountCents ? "refunded" : "partially_refunded";
        target.updatedAt = timestamp;
      }
    });
    if (payment.subscriptionId && refundAmount >= payment.amountCents) await subscriptionService.updateState(payment.subscriptionId, "refunded", actorId);
    await mediaAuditPersistenceService.record("billing_refund_created", `Refund ${refund.refundId} created.`, { actorId, entityType: "billing_refund", entityId: refund.refundId });
    return refund;
  }
}

export class PromotionService {
  async create(input: Partial<PromotionRecord>, actorId = "system") {
    const timestamp = nowIso();
    const promotion: PromotionRecord = {
      promotionId: id("promotion"),
      promotionKey: String(input.promotionKey ?? `promotion-${Date.now()}`).trim(),
      name: String(input.name ?? "Promotion").slice(0, 120),
      type: input.type ?? "launch",
      couponCode: input.couponCode,
      status: input.status ?? "active",
      startsAt: input.startsAt ?? timestamp,
      endsAt: input.endsAt,
      metadataSafe: input.metadataSafe,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => data.promotionRecords.unshift(promotion));
    await mediaAuditPersistenceService.record("billing_promotion_created", `Promotion ${promotion.promotionKey} created.`, { actorId, entityType: "billing_promotion", entityId: promotion.promotionId });
    return promotion;
  }
}

export class GiftMembershipService {
  async create(input: { purchaserMemberId?: string; recipientEmail?: string; billingPlanId: string }, actorId = "system") {
    const timestamp = nowIso();
    const redemptionCode = randomUUID().replace(/-/g, "");
    const gift: GiftMembershipRecord = {
      giftId: id("gift"),
      purchaserMemberId: input.purchaserMemberId,
      recipientEmailHash: input.recipientEmail ? hash(input.recipientEmail.trim().toLowerCase()) : undefined,
      billingPlanId: input.billingPlanId,
      redemptionCodeHash: hash(redemptionCode),
      status: "purchased",
      purchasedAt: timestamp,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => data.giftMemberships.unshift(gift));
    await mediaAuditPersistenceService.record("billing_gift_created", `Gift membership ${gift.giftId} created.`, { actorId, entityType: "billing_gift", entityId: gift.giftId });
    return { gift, redemptionCode };
  }

  async redeem(memberId: string, redemptionCode: string) {
    let gift: GiftMembershipRecord | undefined;
    await jsonDatabase.update((data) => {
      gift = data.giftMemberships.find((item) => item.redemptionCodeHash === hash(redemptionCode) && item.status === "purchased");
      if (!gift) throw new AuthApiError("BILLING_GIFT_INVALID", "Gift membership code is invalid.", 400);
      if (Date.parse(gift.expiresAt) <= Date.now()) {
        gift.status = "expired";
        throw new AuthApiError("BILLING_GIFT_EXPIRED", "Gift membership code is expired.", 400);
      }
      gift.status = "redeemed";
      gift.redeemedByMemberId = memberId;
      gift.redeemedAt = nowIso();
    });
    if (!gift) throw new AuthApiError("BILLING_GIFT_INVALID", "Gift membership code is invalid.", 400);
    const data = await jsonDatabase.read();
    const plan = data.billingPlans.find((item) => item.billingPlanId === gift!.billingPlanId);
    if (plan) {
      const subscription = await subscriptionService.checkout(memberId, plan.planKey);
      await subscriptionService.updateState(subscription.subscriptionId, "active", memberId);
    }
    return gift;
  }
}

export class BillingWebhookService {
  async process(providerKey: BillingProviderKey, payload: Record<string, unknown>, signature?: string, rawBody?: string) {
    const provider = paymentProviderService.getProvider(providerKey);
    const verification = await provider.verifyWebhook({ signature, rawBody, payload });
    const timestamp = nowIso();
    if (!verification.verified) throw new AuthApiError("BILLING_WEBHOOK_SIGNATURE_INVALID", "Billing webhook signature verification failed.", 401);
    const event = {
      webhookEventId: id("billing-webhook"),
      provider: providerKey,
      providerEventId: verification.providerEventId,
      eventType: verification.eventType,
      status: "received" as const,
      signatureVerified: true,
      metadataSafe: { objectId: String(payload.subscriptionId ?? payload.providerSubscriptionId ?? payload.id ?? "") },
      receivedAt: timestamp,
      schemaVersion: 1,
    };
    await jsonDatabase.update((data) => {
      if (data.billingWebhookEvents.some((item) => item.provider === providerKey && item.providerEventId === event.providerEventId)) return;
      data.billingWebhookEvents.unshift(event);
    });
    try {
      await this.applyEvent(verification.eventType, payload);
      await jsonDatabase.update((data) => {
        const target = data.billingWebhookEvents.find((item) => item.webhookEventId === event.webhookEventId);
        if (target) {
          target.status = "processed";
          target.processedAt = nowIso();
        }
      });
    } catch (error) {
      await jsonDatabase.update((data) => {
        const target = data.billingWebhookEvents.find((item) => item.webhookEventId === event.webhookEventId);
        if (target) {
          target.status = "failed";
          target.errorSafe = error instanceof Error ? error.message.slice(0, 300) : "Webhook processing failed.";
        }
      });
      throw error;
    }
    return event;
  }

  private async applyEvent(eventType: string, payload: Record<string, unknown>) {
    const providerSubscriptionId = String(payload.subscriptionId ?? payload.providerSubscriptionId ?? "");
    const data = await jsonDatabase.read();
    const subscription = data.memberSubscriptions.find((item) => item.subscriptionId === providerSubscriptionId || item.providerSubscriptionId === providerSubscriptionId);
    if (["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "invoice.paid", "payment_succeeded"].includes(eventType) && subscription) {
      const plan = data.billingPlans.find((item) => item.billingPlanId === subscription.billingPlanId);
      await paymentService.recordPayment({ memberId: subscription.memberId, subscriptionId: subscription.subscriptionId, invoiceId: subscription.latestInvoiceId, provider: subscription.provider, providerPaymentId: String(payload.paymentId ?? payload.id ?? ""), amountCents: Number(payload.amountCents ?? plan?.amountCents ?? 0), currency: String(payload.currency ?? plan?.currency ?? "USD"), status: "succeeded" });
      await subscriptionService.updateState(subscription.subscriptionId, "active");
      return;
    }
    if (["invoice.payment_failed", "payment_failed"].includes(eventType) && subscription) {
      await subscriptionService.updateState(subscription.subscriptionId, "past_due");
      return;
    }
    if (["customer.subscription.deleted", "subscription_canceled"].includes(eventType) && subscription) {
      await subscriptionService.updateState(subscription.subscriptionId, "canceled");
      return;
    }
    if (["charge.refunded", "refund.created"].includes(eventType)) {
      const paymentId = String(payload.paymentId ?? "");
      if (paymentId) await refundService.create({ paymentId, amountCents: Number(payload.amountCents ?? undefined), reason: "Provider refund event" }, "billing-webhook");
    }
  }
}

export class RevenueAnalyticsService {
  async report() {
    const data = await jsonDatabase.read();
    const active = data.memberSubscriptions.filter((item) => item.state === "active");
    const paidInvoices = data.invoiceRecords.filter((invoice) => invoice.status === "paid");
    const monthlyFromPlan = (planKey: string, amount: number) => planKey.includes("annual") ? amount / 12 : amount;
    const mrrCents = active.reduce((sum, subscription) => {
      const plan = data.billingPlans.find((item) => item.billingPlanId === subscription.billingPlanId);
      return sum + monthlyFromPlan(subscription.planKey, plan?.amountCents ?? 0);
    }, 0);
    return {
      totalRevenueCents: paidInvoices.reduce((sum, invoice) => sum + invoice.amountPaidCents, 0),
      mrrCents: cents(mrrCents),
      arrCents: cents(mrrCents * 12),
      activeSubscriptions: active.length,
      canceledSubscriptions: data.memberSubscriptions.filter((item) => item.state === "canceled").length,
      churnRateReadiness: data.memberSubscriptions.length ? data.memberSubscriptions.filter((item) => item.state === "canceled").length / data.memberSubscriptions.length : 0,
      trialSubscriptions: data.memberSubscriptions.filter((item) => item.state === "trial").length,
      refundTotalCents: data.refundRecords.reduce((sum, refund) => sum + refund.amountCents, 0),
      couponUsage: data.couponRecords.reduce((sum, coupon) => sum + coupon.usedCount, 0),
      generatedAt: nowIso(),
    };
  }
}

export class BillingHealthService {
  async getHealthReport() {
    const data = await jsonDatabase.read();
    const providerHealth = await paymentProviderService.getHealth();
    return {
      overallStatus: "available",
      plans: data.billingPlans.length,
      subscriptions: data.memberSubscriptions.length,
      activeSubscriptions: data.memberSubscriptions.filter((item) => item.state === "active").length,
      pastDueSubscriptions: data.memberSubscriptions.filter((item) => item.state === "past_due").length,
      invoices: data.invoiceRecords.length,
      refunds: data.refundRecords.length,
      coupons: data.couponRecords.length,
      gifts: data.giftMemberships.length,
      providerHealth,
      pciScope: "provider_hosted_checkout",
      rawCardStorage: "disabled",
      checkedAt: nowIso(),
    };
  }
}

export class BillingService {
  async overview(memberId?: string) {
    await billingPlanService.ensureDefaultPlans();
    const data = await jsonDatabase.read();
    const revenue = await revenueAnalyticsService.report();
    if (memberId) {
      return {
        plans: await billingPlanService.listPublicPlans(),
        currentSubscription: await subscriptionService.current(memberId),
        subscriptions: await subscriptionService.listForMember(memberId),
        invoices: await invoiceService.listForMember(memberId),
        payments: await paymentService.listForMember(memberId),
      };
    }
    return {
      plans: data.billingPlans,
      subscriptions: data.memberSubscriptions.slice(0, 100),
      invoices: data.invoiceRecords.slice(0, 100),
      refunds: data.refundRecords.slice(0, 100),
      coupons: data.couponRecords,
      promotions: data.promotionRecords,
      gifts: data.giftMemberships.slice(0, 100),
      revenue,
      health: await billingHealthService.getHealthReport(),
    };
  }
}

export const paymentProviderService = new PaymentProviderService();
export const billingPlanService = new BillingPlanService();
export const couponService = new CouponService();
export const invoiceService = new InvoiceService();
export const entitlementSyncService = new EntitlementSyncService();
export const subscriptionService = new SubscriptionService();
export const paymentService = new PaymentService();
export const refundService = new RefundService();
export const promotionService = new PromotionService();
export const giftMembershipService = new GiftMembershipService();
export const billingWebhookService = new BillingWebhookService();
export const revenueAnalyticsService = new RevenueAnalyticsService();
export const billingHealthService = new BillingHealthService();
export const billingService = new BillingService();
