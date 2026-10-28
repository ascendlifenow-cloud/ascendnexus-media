import Stripe from "stripe";
import { createHash } from "node:crypto";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import { membershipAssignmentService } from "../membership/MembershipAssignmentService";
import { AuthApiError } from "../../utils/auth/authErrorUtils";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const fail = (code: string, message: string, status = 409) => new AuthApiError(code, message, status);
const priceVariables: Record<string, string> = {
  "premium-monthly": "STRIPE_PRICE_PREMIUM_MONTHLY", "premium-annual": "STRIPE_PRICE_PREMIUM_ANNUAL",
  "supporter-monthly": "STRIPE_PRICE_SUPPORTER_MONTHLY", "supporter-annual": "STRIPE_PRICE_SUPPORTER_ANNUAL",
  "vip-monthly": "STRIPE_PRICE_VIP_MONTHLY", "vip-annual": "STRIPE_PRICE_VIP_ANNUAL",
};

export function stripeBillingSettings() {
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const live = secret.startsWith("sk_live_");
  const enabled = process.env.STRIPE_BILLING_ENABLED === "true";
  const origin = process.env.STRIPE_APP_ORIGIN ?? "";
  let safeOrigin = "";
  try { const parsed = new URL(origin); if (parsed.protocol === "https:" && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash) safeOrigin = parsed.origin; } catch { /* Configuration fails closed. */ }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const allowed = enabled && Boolean(safeOrigin) && webhookSecret.startsWith("whsec_") && /^bpc_[a-zA-Z0-9]+$/.test(process.env.STRIPE_PORTAL_CONFIGURATION_ID ?? "") && (secret.startsWith("sk_test_") || (live && process.env.STRIPE_LIVE_PAYMENTS_ENABLED === "true"));
  return { secret, live, enabled: allowed, origin: safeOrigin, webhookSecret };
}

export class StripeBillingService {
  private mutations: Promise<unknown> = Promise.resolve();
  private readonly attempts = new Map<string, { count: number; resetsAt: number }>();
  // Injection is used only by isolated tests; production uses the official SDK.
  constructor(private readonly factory = (key: string) => new Stripe(key, { maxNetworkRetries: 2, timeout: 20000 })) {}

  private client() {
    const settings = stripeBillingSettings();
    if (!settings.enabled) throw fail("STRIPE_CONFIGURATION_REQUIRED", "Stripe billing is not enabled or configured for this environment.", 503);
    return { client: this.factory(settings.secret), settings };
  }

  private async providerCall<T>(work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    catch { throw fail("BILLING_PROVIDER_UNAVAILABLE", "Stripe could not complete the request. Please retry or contact support.", 502); }
  }

  private update(mutator: (draft: MediaDatabaseShape) => void) {
    const operation = this.mutations.then(() => jsonDatabase.update((data) => {
      const draft = structuredClone(data);
      mutator(draft);
      Object.assign(data, draft);
    }));
    this.mutations = operation.catch(() => undefined);
    return operation;
  }

  private limit(memberId: string) {
    const now = Date.now();
    for (const [key, value] of this.attempts) if (value.resetsAt <= now) this.attempts.delete(key);
    if (this.attempts.size >= 10000 && !this.attempts.has(memberId)) throw fail("BILLING_BUSY", "Billing is busy. Please try later.", 503);
    const attempt = this.attempts.get(memberId) ?? { count: 0, resetsAt: now + 60000 };
    if (++attempt.count > 10) throw fail("BILLING_RATE_LIMITED", "Too many billing requests. Please wait before retrying.", 429);
    this.attempts.set(memberId, attempt);
  }

  private customerFor(subscriptions: MediaDatabaseShape["memberSubscriptions"], memberId: string) {
    const owned = subscriptions.filter((item) => item.memberId === memberId && item.provider === "stripe" && item.providerCustomerId);
    const active = owned.filter((item) => !["canceled", "expired", "refunded"].includes(item.state));
    if (new Set(active.map((item) => item.providerCustomerId)).size > 1) throw fail("BILLING_CUSTOMER_AMBIGUOUS", "Multiple billing accounts require support review.");
    return [...(active.length ? active : owned)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.providerCustomerId;
  }

  private async portalConfiguration(client: Stripe) {
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID ?? "";
    if (!/^bpc_[a-zA-Z0-9]+$/.test(configuration)) throw fail("BILLING_PORTAL_UNCONFIGURED", "Stripe billing management must be configured before checkout is available.", 503);
    const portal = await this.providerCall(() => client.billingPortal.configurations.retrieve(configuration));
    if (!portal.active || !portal.features.subscription_cancel.enabled || portal.features.subscription_update.enabled) throw fail("BILLING_PORTAL_UNSAFE", "Stripe billing management configuration requires review.", 503);
    return configuration;
  }

  health() {
    const settings = stripeBillingSettings();
    return { provider: "stripe", enabled: settings.enabled, mode: settings.live ? "live" : "test", webhookConfigured: Boolean(settings.webhookSecret),
      configuredPlans: Object.entries(priceVariables).filter(([, variable]) => /^price_/.test(process.env[variable] ?? "")).map(([key]) => key) };
  }

  async checkout(memberId: string, planKey: string, requestId: unknown) {
    if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw fail("BILLING_REQUEST_INVALID", "A valid checkout request identifier is required.", 400);
    const { client, settings } = this.client();
    this.limit(memberId);
    await this.portalConfiguration(client);
    const priceId = process.env[priceVariables[planKey]];
    if (!priceVariables[planKey] || !/^price_[a-zA-Z0-9]+$/.test(priceId ?? "")) throw fail("BILLING_PRICE_NOT_CONFIGURED", "This membership plan is not available for checkout.");
    const price = await this.providerCall(() => client.prices.retrieve(priceId!));
    const data = await jsonDatabase.read();
    const customer = this.customerFor(data.memberSubscriptions, memberId);
    const plan = data.billingPlans.find((item) => item.planKey === planKey && item.status === "active" && item.provider === "stripe");
    if (!plan || !price.active || price.livemode !== settings.live || !price.recurring || price.recurring.interval_count !== 1 || price.recurring.usage_type !== "licensed"
      || price.recurring.interval !== (plan.interval === "annual" ? "year" : "month") || price.unit_amount !== plan.amountCents || price.currency.toUpperCase() !== plan.currency.toUpperCase()) throw fail("BILLING_PRICE_MISMATCH", "Stripe price does not match the configured membership plan. Contact support.");
    let subscriptionId = `stripe-pending-${digest(`${memberId}:${requestId}`)}`;
    const now = new Date().toISOString();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    await this.update((draft) => {
      const member = draft.memberAccounts.find((item) => item.memberId === memberId);
      if (!member || member.status !== "Active" || !member.emailVerified) throw fail("BILLING_ACCOUNT_INACTIVE", "An active verified member account is required.", 403);
      const retry = draft.memberSubscriptions.find((item) => item.subscriptionId === subscriptionId);
      if (retry) {
        if (retry.planKey !== planKey || retry.state !== "pending" || Number(retry.metadataSafe?.checkoutExpiresAt) <= Date.now()) throw fail("BILLING_CHECKOUT_EXPIRED", "This checkout request is no longer available. Refresh billing.");
        return;
      }
      const existing = draft.memberSubscriptions.find((item) => item.memberId === memberId && item.provider === "stripe" &&
        (["active", "trial", "grace", "past_due", "paused", "suspended"].includes(item.state) || (item.state === "pending" && (Boolean(item.providerSubscriptionId) || Number(item.metadataSafe?.checkoutExpiresAt ?? Infinity) > Date.now()))));
      if (existing) {
        if (existing.state === "pending" && !existing.providerSubscriptionId && existing.planKey === planKey && Number(existing.metadataSafe?.checkoutExpiresAt) > Date.now()) {
          subscriptionId = existing.subscriptionId;
          return;
        }
        throw fail("BILLING_SUBSCRIPTION_EXISTS", "An existing subscription or pending checkout must be managed before starting another.");
      }
      member.updatedAt = new Date(Math.max(Date.now(), Date.parse(member.updatedAt) + 1 || 0)).toISOString();
      draft.memberSubscriptions.push({ subscriptionId, memberId, billingPlanId: plan.billingPlanId, planKey, provider: "stripe", state: "pending", createdAt: now, updatedAt: now, schemaVersion: 1,
        metadataSafe: { stripePriceId: priceId, checkoutExpiresAt: expiresAt * 1000, checkoutRequestId: requestId, expectedCustomerId: customer,
          initialAssignmentId: draft.memberMembershipAssignments.find((item) => item.memberId === memberId && item.status === "active")?.assignmentId,
          initialAuthorizationVersion: member.metadata?.authorizationVersion ?? 0 } });
    });
    const pending = await jsonDatabase.findCollectionRecord("memberSubscriptions", { subscriptionId });
    const expiry = Math.floor(Number(pending!.metadataSafe?.checkoutExpiresAt) / 1000);
    if (typeof pending?.metadataSafe?.checkoutSessionId === "string") {
      const existing = await this.providerCall(() => client.checkout.sessions.retrieve(pending.metadataSafe!.checkoutSessionId as string));
      if (existing.status !== "open" || !existing.url || new URL(existing.url).hostname !== "checkout.stripe.com") throw fail("BILLING_CHECKOUT_UNAVAILABLE", "Checkout is completed or expired. Refresh your membership before trying again.");
      return { checkoutUrl: existing.url, status: "pending", safeMessage: "Resume your existing Stripe checkout." };
    }
    if (expiry < Math.floor(Date.now() / 1000) + 1800) throw fail("BILLING_CHECKOUT_RECONCILIATION_REQUIRED", "This checkout attempt needs reconciliation. Contact support or wait for it to expire.");
    const session = await this.providerCall(() => client.checkout.sessions.create({ mode: "subscription", line_items: [{ price: priceId!, quantity: 1 }],
      client_reference_id: memberId, customer: pending?.metadataSafe?.expectedCustomerId as string | undefined,
      metadata: { anmxSubscriptionId: subscriptionId }, subscription_data: { metadata: { anmxSubscriptionId: subscriptionId } },
      success_url: `${settings.origin}/member/billing?checkout=returned`, cancel_url: `${settings.origin}/member/billing?checkout=canceled`, expires_at: expiry,
    }, { idempotencyKey: subscriptionId }));
    if (!session.url || new URL(session.url).hostname !== "checkout.stripe.com") throw fail("BILLING_PROVIDER_UNAVAILABLE", "Stripe checkout is temporarily unavailable.", 502);
    await this.update((draft) => {
      const target = draft.memberSubscriptions.find((item) => item.subscriptionId === subscriptionId)!;
      target.metadataSafe = { ...target.metadataSafe, checkoutSessionId: session.id };
      // Never mark access active based on a checkout URL or a browser redirect.
    });
    return { checkoutUrl: session.url, status: "pending", safeMessage: "Continue to Stripe secure checkout. Access updates after payment verification." };
  }

  async portal(memberId: string) {
    const { client, settings } = this.client();
    this.limit(memberId);
    const configuration = await this.portalConfiguration(client);
    const subscriptions = await jsonDatabase.listCollection("memberSubscriptions");
    const customer = this.customerFor(subscriptions, memberId);
    if (!customer) throw fail("BILLING_CUSTOMER_NOT_FOUND", "No Stripe billing account is available yet.");
    const session = await this.providerCall(() => client.billingPortal.sessions.create({ customer, configuration, return_url: `${settings.origin}/member/billing` }));
    if (new URL(session.url).hostname !== "billing.stripe.com") throw fail("BILLING_PROVIDER_UNAVAILABLE", "Stripe billing portal is unavailable.", 502);
    return { portalUrl: session.url };
  }

  async webhook(rawBody: Buffer, signature: string) {
    const { client, settings } = this.client();
    if (!settings.webhookSecret) throw fail("BILLING_WEBHOOK_UNCONFIGURED", "Billing webhook is not configured.", 503);
    let event: Stripe.Event;
    try { event = client.webhooks.constructEvent(rawBody, signature, settings.webhookSecret); }
    catch { throw fail("BILLING_WEBHOOK_SIGNATURE_INVALID", "Webhook signature verification failed.", 400); }
    if (event.livemode !== settings.live) throw fail("BILLING_WEBHOOK_MODE_INVALID", "Webhook environment does not match.", 400);
    const supported = ["checkout.session.completed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed", "invoice.paid", "invoice.payment_failed"];
    if (!supported.includes(event.type)) return { received: true, ignored: true };
    const receiptId = `stripe-event-${digest(event.id)}`;
    if (await jsonDatabase.findCollectionRecord("billingWebhookEvents", { webhookEventId: receiptId })) return { received: true, reused: true };
    const object = event.data.object;
    let providerSubscriptionId: string | null = null;
    if (event.type.startsWith("customer.subscription.")) providerSubscriptionId = object.id;
    else if (event.type === "checkout.session.completed") {
      const session = object as Stripe.Checkout.Session;
      providerSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
    } else {
      const invoice = object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      providerSubscriptionId = typeof subscription === "string" ? subscription : subscription?.id ?? null;
    }
    if (!providerSubscriptionId) return { received: true, ignored: true };
    // Read the baseline before the network request; reject stale projections at commit.
    const before = structuredClone(await jsonDatabase.read());
    const subscription = await this.providerCall(() => client.subscriptions.retrieve(providerSubscriptionId, { expand: ["latest_invoice"] }));
    const localId = subscription.metadata.anmxSubscriptionId;
    const local = before.memberSubscriptions.find((item) => item.subscriptionId === localId && item.provider === "stripe");
    if (!local) throw fail("BILLING_SUBSCRIPTION_UNMAPPED", "Subscription could not be mapped to a pending membership.");
    const item = subscription.items.data[0];
    const plan = before.billingPlans.find((record) => record.billingPlanId === local.billingPlanId && record.status === "active");
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    if (!plan || subscription.items.data.length !== 1 || !item || item.quantity !== 1 || item.price.id !== local.metadataSafe?.stripePriceId || subscription.livemode !== settings.live
      || (local.providerSubscriptionId && local.providerSubscriptionId !== subscription.id) || (local.providerCustomerId && local.providerCustomerId !== customerId)
      || (local.metadataSafe?.expectedCustomerId && local.metadataSafe.expectedCustomerId !== customerId)) throw fail("BILLING_SUBSCRIPTION_MISMATCH", "Subscription configuration does not match the membership.");
    let invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    if (event.type.startsWith("invoice.")) invoice = await this.providerCall(() => client.invoices.retrieve(object.id));
    if (invoice) {
      const invoiceSubscription = invoice.parent?.subscription_details?.subscription;
      const invoiceCustomer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if ((typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription?.id) !== subscription.id || invoiceCustomer !== customerId || invoice.livemode !== settings.live) throw fail("BILLING_INVOICE_MISMATCH", "Invoice does not match the verified subscription.");
    }
    const end = item.current_period_end * 1000;
    const paidLines = invoice?.status === "paid" ? invoice.lines?.data.filter((line) => line.parent?.subscription_item_details?.subscription_item === item.id) ?? [] : [];
    const paidThrough = Math.max(Number(local.metadataSafe?.paidThrough ?? 0), ...paidLines.map((line) => Math.min(line.period.end * 1000, end)));
    const paid = ["active", "past_due"].includes(subscription.status) && !subscription.pause_collection && paidThrough > Date.now();
    const state = paid ? "active" : subscription.status === "canceled" ? "canceled" : subscription.status === "incomplete_expired" ? "expired" : subscription.status === "past_due" ? "past_due" : subscription.status === "unpaid" || subscription.status === "paused" ? "suspended" : "pending";
    const now = new Date().toISOString();
    await this.update((draft) => {
      if (draft.billingWebhookEvents.some((record) => record.webhookEventId === receiptId)) return;
      const target = draft.memberSubscriptions.find((record) => record.subscriptionId === localId);
      if (!target || JSON.stringify(target) !== JSON.stringify(local)) throw fail("BILLING_SYNC_CONFLICT", "Billing changed during verification. Retry this event.");
      const member = draft.memberAccounts.find((record) => record.memberId === target.memberId);
      const baselineMember = before.memberAccounts.find((record) => record.memberId === target.memberId);
      if (JSON.stringify(member) !== JSON.stringify(baselineMember)) throw fail("BILLING_SYNC_CONFLICT", "Member changed during verification. Retry this event.");
      const tier = draft.membershipTiers.find((record) => record.tierKey === (paid ? plan.membershipTierKey : "free") && record.status === "active");
      if (!tier || tier.isStaffTier) throw fail("BILLING_TIER_UNAVAILABLE", "Membership tier is unavailable.");
      target.providerSubscriptionId = subscription.id;
      target.providerCustomerId = customerId;
      target.state = state;
      target.updatedAt = now;
      target.currentPeriodStart = new Date(item.current_period_start * 1000).toISOString();
      target.currentPeriodEnd = new Date(end).toISOString();
      target.cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined;
      target.metadataSafe = { ...target.metadataSafe, paidThrough };
      const current = draft.memberMembershipAssignments.find((record) => record.memberId === target.memberId && record.status === "active");
      // A failed pending checkout must not erase an unrelated manual grant.
      const ownsAssignment = current?.source === "subscription" && current.metadata?.stripeSubscriptionId === subscription.id;
      const initialUnchanged = current ? current.assignmentId === local.metadataSafe?.initialAssignmentId : !local.metadataSafe?.initialAssignmentId && (member?.metadata?.authorizationVersion ?? 0) === local.metadataSafe?.initialAuthorizationVersion;
      const needsAssignment = ownsAssignment || (paid && initialUnchanged);
      const entitlementEnd = paid ? new Date(paidThrough).toISOString() : undefined;
      if (member && member.status !== "Deleted" && needsAssignment && (current?.tierId !== tier.tierId || current.endsAt !== entitlementEnd)) {
        const assignment = membershipAssignmentService.applyTierAssignment(draft, member.memberId, tier.tierId, "subscription", entitlementEnd, now);
        assignment.metadata = { stripeSubscriptionId: subscription.id };
      }
      if (invoice?.status === "paid" && paidLines.length) {
        const paymentId = `stripe-invoice-${digest(invoice.id)}`;
        const invoiceId = `stripe-local-invoice-${digest(invoice.id)}`;
        if (!draft.invoiceRecords.some((record) => record.invoiceId === invoiceId)) draft.invoiceRecords.push({ invoiceId, invoiceNumber: invoice.number ?? invoice.id, memberId: target.memberId, subscriptionId: localId, provider: "stripe", providerInvoiceId: invoice.id,
          status: "paid", subtotalCents: invoice.subtotal, discountCents: (invoice.total_discount_amounts ?? []).reduce((sum, discount) => sum + discount.amount, 0), taxCents: Math.max(0, invoice.total - (invoice.total_excluding_tax ?? invoice.total)), totalCents: invoice.total, amountPaidCents: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(), issuedAt: new Date(invoice.created * 1000).toISOString(), paidAt: now,
          lineItems: [{ description: plan.name, amountCents: invoice.total, quantity: 1 }], schemaVersion: 1 });
        if (!draft.paymentRecords.some((record) => record.paymentId === paymentId)) draft.paymentRecords.push({ paymentId, memberId: target.memberId, subscriptionId: localId, invoiceId, provider: "stripe", providerPaymentId: invoice.id, amountCents: invoice.amount_paid, currency: invoice.currency.toUpperCase(), status: "succeeded", createdAt: now, updatedAt: now, schemaVersion: 1 });
      }
      draft.billingWebhookEvents.push({ webhookEventId: receiptId, provider: "stripe", providerEventId: event.id, eventType: event.type, status: "processed", signatureVerified: true, receivedAt: now, processedAt: now, schemaVersion: 1 });
      draft.adminAuditEvents.push({ auditEventId: receiptId, action: "stripe_subscription_synchronized", entityType: "member_account", entityId: target.memberId, actorId: "stripe-webhook", summary: "Verified Stripe subscription state synchronized.", createdAt: now, metadata: { state, tierKey: tier.tierKey } });
    });
    return { received: true, reused: false };
  }
}

export const stripeBillingService = new StripeBillingService();
