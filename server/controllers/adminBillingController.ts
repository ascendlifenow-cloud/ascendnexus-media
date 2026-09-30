import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { mediaAuthorizationService } from "../services/media/MediaAuthorizationService";
import {
  billingHealthService,
  billingPlanService,
  billingService,
  billingWebhookService,
  couponService,
  giftMembershipService,
  paymentProviderService,
  promotionService,
  refundService,
  revenueAnalyticsService,
  subscriptionService,
} from "../services/billing/BillingServices";
import type { BillingProviderKey } from "../models/billing/BillingModels";

export class AdminBillingController {
  private async auth(request: IncomingMessage, permission: "users.read" | "users.manage" = "users.read") {
    const auth = await mediaAuthorizationService.authenticate(request);
    mediaAuthorizationService.requirePermission(auth, permission);
    return auth;
  }

  async overview(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await billingService.overview() });
  }

  async health(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await billingHealthService.getHealthReport() });
  }

  async plans(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: { plans: await billingPlanService.ensureDefaultPlans() } });
  }

  async subscriptions(request: IncomingMessage, response: ServerResponse, url: URL) {
    await this.auth(request, "users.read");
    const memberId = url.searchParams.get("memberId");
    sendJson(response, 200, { success: true, data: { subscriptions: memberId ? await subscriptionService.listForMember(memberId) : (await billingService.overview() as { subscriptions: unknown[] }).subscriptions } });
  }

  async coupons(request: IncomingMessage, response: ServerResponse) {
    const auth = await this.auth(request, request.method === "POST" ? "users.manage" : "users.read");
    if (request.method === "POST") {
      const body = await parseJsonBody(request) as never;
      sendJson(response, 201, { success: true, data: await couponService.create(body, auth.userId) });
      return;
    }
    const overview = await billingService.overview() as { coupons: unknown[] };
    sendJson(response, 200, { success: true, data: { coupons: overview.coupons } });
  }

  async promotions(request: IncomingMessage, response: ServerResponse) {
    const auth = await this.auth(request, request.method === "POST" ? "users.manage" : "users.read");
    if (request.method === "POST") {
      const body = await parseJsonBody(request) as never;
      sendJson(response, 201, { success: true, data: await promotionService.create(body, auth.userId) });
      return;
    }
    const overview = await billingService.overview() as { promotions: unknown[] };
    sendJson(response, 200, { success: true, data: { promotions: overview.promotions } });
  }

  async gifts(request: IncomingMessage, response: ServerResponse) {
    const auth = await this.auth(request, request.method === "POST" ? "users.manage" : "users.read");
    if (request.method === "POST") {
      const body = await parseJsonBody(request) as { purchaserMemberId?: string; recipientEmail?: string; billingPlanId?: string };
      sendJson(response, 201, { success: true, data: await giftMembershipService.create({ purchaserMemberId: body.purchaserMemberId, recipientEmail: body.recipientEmail, billingPlanId: body.billingPlanId ?? "billing-plan-premium-monthly" }, auth.userId) });
      return;
    }
    const overview = await billingService.overview() as { gifts: unknown[] };
    sendJson(response, 200, { success: true, data: { gifts: overview.gifts } });
  }

  async refund(request: IncomingMessage, response: ServerResponse) {
    const auth = await this.auth(request, "users.manage");
    const body = await parseJsonBody(request) as { paymentId?: string; amountCents?: number; reason?: string };
    sendJson(response, 201, { success: true, data: await refundService.create({ paymentId: body.paymentId ?? "", amountCents: body.amountCents, reason: body.reason }, auth.userId) });
  }

  async revenue(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await revenueAnalyticsService.report() });
  }

  async providers(request: IncomingMessage, response: ServerResponse) {
    await this.auth(request, "users.read");
    sendJson(response, 200, { success: true, data: await paymentProviderService.getHealth() });
  }

  async webhook(request: IncomingMessage, response: ServerResponse, provider: BillingProviderKey) {
    const body = await parseJsonBody(request) as Record<string, unknown>;
    const signature = String(request.headers["stripe-signature"] ?? request.headers["x-billing-signature"] ?? "");
    sendJson(response, 200, { success: true, data: await billingWebhookService.process(provider, body, signature) });
  }
}

export const adminBillingController = new AdminBillingController();

