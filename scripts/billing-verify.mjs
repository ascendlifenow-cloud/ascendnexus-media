import { randomUUID } from "node:crypto";
import { defaultMemberPreferences } from "../server/models/members/MemberModels.ts";
import { jsonDatabase } from "../server/services/media/JsonDatabase.ts";
import {
  billingHealthService,
  billingPlanService,
  billingService,
  billingWebhookService,
  couponService,
  giftMembershipService,
  promotionService,
  refundService,
  revenueAnalyticsService,
  subscriptionService,
} from "../server/services/billing/BillingServices.ts";
import { membershipAssignmentService } from "../server/services/membership/MembershipAssignmentService.ts";

const command = process.argv.find((arg) => arg.startsWith("--command="))?.split("=")[1] ?? "verify";
const failures = [];
const marker = `billing-smoke-${Date.now()}-${randomUUID().slice(0, 8)}`;
const actorId = "billing-smoke-admin";

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const safePrint = (payload) => console.log(JSON.stringify(payload, (key, value) => {
  if (key.toLowerCase().includes("email")) return "[REDACTED]";
  if (key.toLowerCase().includes("redemptioncode")) return "[REDACTED]";
  if (typeof value === "string" && /(secret|token=|signature=|x-amz-|private\/|storagePath|privateObjectKey|signedUrl|full[-_]?song|authorizationReference|streamEndpoint|downloadUrl|card)/i.test(value)) return "[REDACTED]";
  return value;
}, 2));

const cleanup = async () => {
  await jsonDatabase.update((data) => {
    const ids = new Set(data.memberAccounts.filter((member) => member.memberId.includes("billing-smoke") || member.normalizedEmail.includes("billing-smoke")).map((member) => member.memberId));
    data.memberAccounts = data.memberAccounts.filter((member) => !ids.has(member.memberId));
    data.memberSessions = data.memberSessions.filter((session) => !ids.has(session.memberId));
    data.memberMembershipAssignments = data.memberMembershipAssignments.filter((assignment) => !ids.has(assignment.memberId));
    data.memberEntitlementGrants = data.memberEntitlementGrants.filter((grant) => !ids.has(grant.memberId));
    data.memberSubscriptions = data.memberSubscriptions.filter((subscription) => !ids.has(subscription.memberId));
    data.paymentMethods = data.paymentMethods.filter((method) => !ids.has(method.memberId));
    data.paymentRecords = data.paymentRecords.filter((payment) => !ids.has(payment.memberId));
    data.invoiceRecords = data.invoiceRecords.filter((invoice) => !ids.has(invoice.memberId));
    data.refundRecords = data.refundRecords.filter((refund) => !ids.has(refund.memberId));
    data.giftMemberships = data.giftMemberships.filter((gift) => !ids.has(String(gift.purchaserMemberId ?? "")) && !ids.has(String(gift.redeemedByMemberId ?? "")));
    data.billingWebhookEvents = data.billingWebhookEvents.filter((event) => !String(event.providerEventId).includes("billing-smoke"));
    data.couponRecords = data.couponRecords.filter((coupon) => !coupon.code.includes("BILLINGSMOKE"));
    data.promotionRecords = data.promotionRecords.filter((promotion) => !promotion.promotionKey.includes("billing-smoke"));
    data.adminAuditEvents = data.adminAuditEvents.filter((event) => {
      const text = JSON.stringify(event);
      return !ids.has(String(event.entityId ?? "")) && !ids.has(String(event.actorId ?? "")) && !text.includes("billing-smoke") && !text.includes("BILLINGSMOKE");
    });
  });
};

const prepareMember = async () => {
  const timestamp = new Date().toISOString();
  await jsonDatabase.update((data) => {
    data.memberAccounts.push({
      memberId: marker,
      email: `${marker}@example.invalid`,
      normalizedEmail: `${marker}@example.invalid`,
      displayName: "Billing Smoke Member",
      username: marker,
      membershipTier: "Free Member",
      status: "Active",
      emailVerified: true,
      emailVerifiedAt: timestamp,
      passwordHash: "not-used-in-billing-smoke",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLogin: timestamp,
      failedLoginCount: 0,
      preferences: defaultMemberPreferences(),
      schemaVersion: 1,
      metadata: { authorizationVersion: 1 },
    });
  });
  await membershipAssignmentService.assignDefaultFreeTier(marker);
  return marker;
};

const getMemberTier = async (memberId) => {
  const data = await jsonDatabase.read();
  return data.memberAccounts.find((member) => member.memberId === memberId)?.membershipTier;
};

const noLeak = (payload, label) => {
  expect(!JSON.stringify(payload).match(/private\/|storagePath|privateObjectKey|signedUrl|signature=|fullSong|full-song|full_song|authorizationReference|streamEndpoint|downloadUrl|cardNumber|cvc/i), `${label} leaked protected or payment-sensitive data.`);
};

const runHealth = async () => {
  await billingPlanService.ensureDefaultPlans(actorId);
  return billingHealthService.getHealthReport();
};

const runVerify = async () => {
  await cleanup();
  const memberId = await prepareMember();
  try {
    const plans = await billingPlanService.ensureDefaultPlans(actorId);
    expect(plans.some((plan) => plan.planKey === "premium-monthly"), "Premium monthly plan is missing.");
    expect(plans.some((plan) => plan.planKey === "vip-annual"), "VIP annual plan is missing.");

    const coupon = await couponService.create({ code: `BILLINGSMOKE${Date.now().toString().slice(-5)}`, percentOff: 25, duration: "one_time", usageLimit: 5 }, actorId);
    const promotion = await promotionService.create({ promotionKey: `billing-smoke-${Date.now()}`, name: "Billing Smoke Promotion", couponCode: coupon.code }, actorId);
    expect(promotion.couponCode === coupon.code, "Promotion did not link coupon.");

    const checkout = await subscriptionService.checkout(memberId, "premium-monthly", coupon.code);
    expect(checkout.subscriptionId, "Checkout did not create a subscription.");
    expect(checkout.status === "provider_configuration_required" || checkout.status === "pending", "Checkout status is not safe.");

    await billingWebhookService.process("stripe", { id: `${marker}-event`, type: "checkout.session.completed", subscriptionId: checkout.providerCheckoutSessionId, testMode: true, amountCents: 749, currency: "USD" });
    const tierAfterPayment = await getMemberTier(memberId);
    expect(String(tierAfterPayment).toLowerCase().includes("premium"), "Payment webhook did not synchronize Premium membership.");

    const overview = await billingService.overview(memberId);
    expect(Array.isArray(overview.subscriptions) && overview.subscriptions.length >= 1, "Member billing overview missing subscriptions.");
    expect(Array.isArray(overview.invoices) && overview.invoices.length >= 1, "Member billing overview missing invoices.");
    expect(Array.isArray(overview.payments) && overview.payments.length >= 1, "Member billing overview missing payments.");

    const revenue = await revenueAnalyticsService.report();
    expect(Number(revenue.mrrCents) > 0, "Revenue report did not include MRR.");

    const gift = await giftMembershipService.create({ purchaserMemberId: memberId, recipientEmail: `${marker}-gift@example.invalid`, billingPlanId: "billing-plan-supporter-monthly" }, actorId);
    expect(gift.gift.giftId, "Gift membership was not created.");

    const paymentId = overview.payments[0]?.paymentId;
    if (paymentId) {
      const refund = await refundService.create({ paymentId: String(paymentId), reason: "Billing smoke refund" }, actorId);
      expect(refund.status === "succeeded", "Refund did not succeed.");
      const tierAfterRefund = await getMemberTier(memberId);
      expect(String(tierAfterRefund).toLowerCase().includes("free"), "Refund did not revoke paid access to Free.");
    }

    const health = await billingHealthService.getHealthReport();
    expect(health.rawCardStorage === "disabled", "Billing health does not confirm raw card storage is disabled.");
    noLeak({ checkout, overview, revenue, gift, health }, "Billing verification");
    return {
      plans: plans.length,
      checkout: true,
      webhook: true,
      tierAfterPayment,
      invoices: overview.invoices.length,
      payments: overview.payments.length,
      mrrCents: revenue.mrrCents,
      gift: true,
      refund: Boolean(paymentId),
      rawCardStorage: health.rawCardStorage,
    };
  } finally {
    await cleanup();
  }
};

const result = command === "health" ? await runHealth() : await runVerify();

if (failures.length) {
  safePrint({ success: false, command, failures, result });
  process.exitCode = 1;
} else {
  safePrint({ success: true, command, result });
}
