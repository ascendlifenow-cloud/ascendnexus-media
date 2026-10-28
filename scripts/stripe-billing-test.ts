import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Stripe from "stripe";
import { createServer } from "node:http";

const root = await mkdtemp(join(tmpdir(), "anmx-stripe-"));
Object.assign(process.env, { NODE_ENV: "test", APP_ENV: "test", MONGODB_URI: "", MEDIA_DATA_ROOT: root, MEDIA_WORKERS_ENABLED: "false",
  STRIPE_BILLING_ENABLED: "false", STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: "whsec_fixture", STRIPE_APP_ORIGIN: "https://staging.example.test", STRIPE_PRICE_PREMIUM_MONTHLY: "price_fixture", STRIPE_PORTAL_CONFIGURATION_ID: "bpc_fixture" });
try {
  const { StripeBillingService } = await import("../server/services/billing/StripeBillingService");
  const { jsonDatabase } = await import("../server/services/media/JsonDatabase");
  const { membershipCatalogService } = await import("../server/services/membership/MembershipCatalogService");
  const { membershipAssignmentService } = await import("../server/services/membership/MembershipAssignmentService");
  const { billingPlanService, subscriptionService, giftMembershipService, refundService } = await import("../server/services/billing/BillingServices");
  await billingPlanService.ensureDefaultPlans();
  await jsonDatabase.update((data) => data.memberAccounts.push({ memberId: "fixture", status: "Active", emailVerified: true, updatedAt: new Date().toISOString(), metadata: {} } as never));
  await membershipAssignmentService.assignDefaultFreeTier("fixture");
  const sdk = new Stripe("sk_test_fixture");
  let pendingId = "";
  let providerState = "incomplete";
  let providerInvoiceState = "open";
  let retrieveCount = 0;
  let duringRetrieve: (() => Promise<void>) | undefined;
  let specificInvoice: unknown;
  const keys: string[] = [];
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const price = { id: "price_fixture", active: true, livemode: false, unit_amount: 999, currency: "usd", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" } };
  const provider = {
    webhooks: sdk.webhooks,
    prices: { retrieve: async () => price },
    invoices: { retrieve: async (invoiceId: string) => { assert.equal(invoiceId, "in_specific"); return specificInvoice; } },
    checkout: { sessions: { retrieve: async () => ({ id: "cs_fixture", status: "open", url: "https://checkout.stripe.com/c/pay/fixture" }), create: async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
      pendingId = params.subscription_data!.metadata!.anmxSubscriptionId as string;
      assert.equal(params.success_url, "https://staging.example.test/member/billing?checkout=returned");
      assert.equal(params.subscription_data?.trial_period_days, undefined);
      assert.ok(params.expires_at! >= Math.floor(Date.now() / 1000) + 1800, "Checkout needs at least Stripe's minimum remaining lifetime");
      keys.push(options.idempotencyKey!);
      return { id: "cs_fixture", url: "https://checkout.stripe.com/c/pay/fixture" };
    } } },
    billingPortal: { configurations: { retrieve: async () => ({ active: true, features: { subscription_cancel: { enabled: true }, subscription_update: { enabled: false } } }) }, sessions: { create: async (params: { customer: string; configuration: string }) => { assert.equal(params.customer, "cus_fixture"); assert.equal(params.configuration, "bpc_fixture"); return { url: "https://billing.stripe.com/p/session/fixture" }; } } },
    subscriptions: { retrieve: async () => {
      retrieveCount++;
      const result = { id: "sub_fixture", customer: "cus_fixture", livemode: false, metadata: { anmxSubscriptionId: pendingId }, status: providerState,
        items: { data: [{ id: "si_fixture", quantity: 1, price, current_period_start: expiry - 3600, current_period_end: expiry }] }, latest_invoice: { id: "in_fixture", customer: "cus_fixture", livemode: false, parent: { subscription_details: { subscription: "sub_fixture" } }, created: expiry - 3600, subtotal: 999, total: 999, status: providerInvoiceState, amount_paid: 999, currency: "usd", lines: { data: [{ period: { end: expiry }, parent: { subscription_item_details: { subscription_item: "si_fixture" } } }] } } };
      await duringRetrieve?.();
      return result;
    } },
  } as unknown as Stripe;
  const service = new StripeBillingService(() => provider);
  await assert.rejects(() => service.checkout("fixture", "premium-monthly", "checkout-request-001"), /not enabled/);
  process.env.STRIPE_BILLING_ENABLED = "true";
  await assert.rejects(() => service.checkout("fixture", "premium-monthly", "short"));
  await assert.rejects(() => service.checkout("fixture", "free", "checkout-request-001"));
  price.unit_amount = 1999;
  await assert.rejects(() => service.checkout("fixture", "premium-monthly", "checkout-request-001"), /does not match/);
  price.unit_amount = 999;
  await service.checkout("fixture", "premium-monthly", "checkout-request-001");
  await jsonDatabase.update((data) => { delete data.memberSubscriptions[0].metadataSafe!.checkoutSessionId; });
  await service.checkout("fixture", "premium-monthly", "checkout-request-001");
  assert.equal(keys[0], keys[1]);
  assert.equal((await jsonDatabase.read()).memberSubscriptions.length, 1);
  await service.checkout("fixture", "premium-monthly", "checkout-request-002");
  assert.equal((await jsonDatabase.read()).memberSubscriptions.length, 1, "Page reloads must resume rather than duplicate a pending checkout");
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "free");
  const event = (eventId: string, type = "customer.subscription.updated") => Buffer.from(JSON.stringify({ id: eventId, object: "event", type, livemode: false, data: { object: { id: "sub_fixture" } } }));
  const sign = (body: Buffer, timestamp = Math.floor(Date.now() / 1000)) => sdk.webhooks.generateTestHeaderString({ payload: body.toString(), secret: "whsec_fixture", timestamp });
  const raw = event("evt_unpaid");
  await assert.rejects(() => service.webhook(raw, "garbage"), /signature verification failed/);
  await assert.rejects(() => service.webhook(Buffer.from(`${raw} `), sign(raw)), /signature verification failed/);
  await assert.rejects(() => service.webhook(raw, sign(raw, Math.floor(Date.now() / 1000) - 1000)), /signature verification failed/);
  await service.webhook(raw, sign(raw));
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "free");
  providerState = "active"; providerInvoiceState = "paid";
  const paid = event("evt_paid");
  await service.webhook(paid, sign(paid));
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "premium");
  assert.equal((await jsonDatabase.read()).paymentRecords.length, 1);
  providerInvoiceState = "open";
  const renewal = event("evt_renewal_open");
  await service.webhook(renewal, sign(renewal));
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "premium", "A new open invoice must not remove already-paid access");
  providerInvoiceState = "paid";
  const readsBefore = retrieveCount;
  assert.equal((await service.webhook(paid, sign(paid))).reused, true);
  assert.equal(retrieveCount, readsBefore);
  assert.equal((await jsonDatabase.read()).paymentRecords.length, 1);
  assert.ok((await service.portal("fixture")).portalUrl.startsWith("https://billing.stripe.com/"));
  await assert.rejects(() => service.portal("other"), /No Stripe billing account/);
  await assert.rejects(() => subscriptionService.checkout("fixture", "free"), /billing portal/);
  await assert.rejects(() => subscriptionService.updateState(pendingId, "active"), /verified provider/);
  await assert.rejects(() => giftMembershipService.redeem("fixture", "any"), /unavailable/);
  const payment = (await jsonDatabase.read()).paymentRecords[0];
  await assert.rejects(() => refundService.create({ paymentId: payment.paymentId }), /Stripe dashboard/);
  await jsonDatabase.update((data) => data.protectedMediaAuthorizations.push({ authorizationId: "fixture-auth", memberId: "fixture", status: "active" } as never));
  providerState = "canceled";
  const canceled = event("evt_canceled", "customer.subscription.deleted");
  await service.webhook(canceled, sign(canceled));
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "free");
  assert.equal((await jsonDatabase.read()).protectedMediaAuthorizations[0].status, "revoked");
  // A delayed old event retrieves current provider state, not its obsolete payload.
  const delayed = event("evt_delayed");
  await service.webhook(delayed, sign(delayed));
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "free");
  await membershipAssignmentService.assignTier("fixture", "tier-vip", "admin_grant", "admin");
  providerState = "active";
  const afterManual = event("evt_after_manual");
  await service.webhook(afterManual, sign(afterManual));
  assert.equal((await membershipAssignmentService.getCurrentMembership("fixture"))?.tier.tierKey, "vip", "Provider updates must not overwrite a later manual assignment");
  const race = event("evt_race");
  duringRetrieve = async () => { await jsonDatabase.update((data) => { data.memberSubscriptions[0].metadataSafe = { ...data.memberSubscriptions[0].metadataSafe, concurrentChange: true }; }); };
  await assert.rejects(() => service.webhook(race, sign(race)), /changed during verification/);
  duringRetrieve = undefined;
  assert.equal((await jsonDatabase.read()).billingWebhookEvents.some((record) => record.providerEventId === "evt_race"), false);
  const beforeFailure = JSON.stringify((await jsonDatabase.read()).memberSubscriptions);
  await jsonDatabase.update((data) => { data.membershipTiers.find((tier) => tier.tierKey === "premium")!.status = "inactive"; });
  const unavailableTier = event("evt_bad_tier");
  await assert.rejects(() => service.webhook(unavailableTier, sign(unavailableTier)), /tier is unavailable/);
  assert.equal(JSON.stringify((await jsonDatabase.read()).memberSubscriptions), beforeFailure, "A rejected mutation must not poison the local database cache");
  await jsonDatabase.update((data) => { data.membershipTiers.find((tier) => tier.tierKey === "premium")!.status = "active"; });
  specificInvoice = { ...(await provider.subscriptions.retrieve("sub_fixture")).latest_invoice as Stripe.Invoice, id: "in_specific" };
  providerInvoiceState = "open";
  const historicalInvoice = Buffer.from(JSON.stringify({ id: "evt_specific_invoice", type: "invoice.paid", livemode: false, data: { object: { id: "in_specific", parent: { subscription_details: { subscription: "sub_fixture" } } } } }));
  await service.webhook(historicalInvoice, sign(historicalInvoice));
  assert.equal((await jsonDatabase.read()).paymentRecords.filter((record) => record.providerPaymentId === "in_specific").length, 1, "Delayed paid invoice must be recorded even if latest invoice is open");
  const { handleBillingRoute } = await import("../server/routes/billingRoutes");
  const { stripeBillingService } = await import("../server/services/billing/StripeBillingService");
  const { memberIdentityService } = await import("../server/services/members/MemberIdentityService");
  const { sendSafeError } = await import("../server/middleware/mediaErrorMiddleware");
  const { AuthApiError } = await import("../server/utils/auth/authErrorUtils");
  const authenticate = memberIdentityService.authenticateRequest;
  const webhook = stripeBillingService.webhook;
  const server = createServer(async (request, response) => {
    try { if (!await handleBillingRoute(request, response, new URL(request.url!, "http://localhost"))) { response.writeHead(404); response.end(); } }
    catch (error) { sendSafeError(response, error); }
  });
  try {
    stripeBillingService.webhook = service.webhook.bind(service);
    memberIdentityService.authenticateRequest = async () => { throw new AuthApiError("MEMBER_AUTH_REQUIRED", "Member authentication required.", 401); };
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const headers = { "Content-Type": "application/json", Origin: "https://staging.example.test" };
    assert.equal((await fetch(`${base}/api/member/billing/checkout`, { method: "POST", headers, body: "{}" })).status, 401);
    assert.equal((await fetch(`${base}/api/member/billing/checkout`, { method: "POST", headers: { ...headers, Origin: "https://evil.example.test" }, body: "{}" })).status, 403);
    memberIdentityService.authenticateRequest = async () => ({ member: { memberId: "fixture" } }) as never;
    assert.equal((await fetch(`${base}/api/member/billing/checkout`, { method: "POST", headers, body: JSON.stringify({ planKey: "premium-monthly", requestId: "checkout-http-001", memberId: "other" }) })).status, 400);
    const ignored = event("evt_http", "product.updated");
    const response = await fetch(`${base}/api/billing/webhooks/stripe`, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": sign(ignored) }, body: ignored });
    assert.equal(response.status, 200, "Raw HTTP bytes must reach SDK verification unchanged");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal((await fetch(`${base}/api/billing/webhooks/stripe`, { method: "POST", headers: { "Stripe-Signature": "forged" }, body: ignored })).status, 400);
  } finally {
    memberIdentityService.authenticateRequest = authenticate;
    stripeBillingService.webhook = webhook;
    await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); });
  }
  process.env.STRIPE_SECRET_KEY = "sk_live_fixture";
  assert.equal(service.health().enabled, false);
  console.log("Stripe isolated tests passed: SDK signatures, stale/tampered rejection, price validation, Checkout idempotency, unpaid denial, paid membership, duplicate events, provider portal binding, cancellation revocation and bypass guards. No real Stripe requests or charges.");
} finally { await rm(root, { recursive: true, force: true }); }
