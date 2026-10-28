import type { IncomingMessage, ServerResponse } from "node:http";
import { parseJsonBody } from "../middleware/adminMediaUploadMiddleware";
import { sendJson } from "../middleware/mediaErrorMiddleware";
import { memberIdentityService } from "../services/members/MemberIdentityService";
import { stripeBillingService, stripeBillingSettings } from "../services/billing/StripeBillingService";
import { AuthApiError } from "../utils/auth/authErrorUtils";
import {
  billingPlanService,
  billingService,
  giftMembershipService,
  invoiceService,
  paymentService,
} from "../services/billing/BillingServices";

const privateBillingHeaders = (response: ServerResponse) => {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
};

export class MemberBillingController {
  async overview(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await billingService.overview(session.member.memberId) });
  }

  async plans(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { plans: await billingPlanService.listPublicPlans() } });
  }

  async checkout(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    this.requireBillingOrigin(request);
    const session = await memberIdentityService.authenticateRequest(request);
    const body = await parseJsonBody(request) as { planKey?: string; requestId?: string };
    if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.planKey !== "string" || Object.keys(body).some((key) => !["planKey", "requestId"].includes(key))) throw new AuthApiError("BILLING_REQUEST_INVALID", "Select a configured paid membership plan.", 400);
    sendJson(response, 201, { success: true, data: await stripeBillingService.checkout(session.member.memberId, body.planKey, body.requestId) });
  }

  async cancel(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    this.requireBillingOrigin(request);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: await stripeBillingService.portal(session.member.memberId) });
  }

  private requireBillingOrigin(request: IncomingMessage) {
    if (!stripeBillingSettings().origin || request.headers.origin !== stripeBillingSettings().origin) throw new AuthApiError("BILLING_ORIGIN_INVALID", "Billing request origin was not accepted.", 403);
  }

  async invoices(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { invoices: await invoiceService.listForMember(session.member.memberId) } });
  }

  async payments(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    sendJson(response, 200, { success: true, data: { payments: await paymentService.listForMember(session.member.memberId) } });
  }

  async redeemGift(request: IncomingMessage, response: ServerResponse) {
    privateBillingHeaders(response);
    const session = await memberIdentityService.authenticateRequest(request);
    const body = await parseJsonBody(request) as { redemptionCode?: string };
    sendJson(response, 200, { success: true, data: await giftMembershipService.redeem(session.member.memberId, body.redemptionCode ?? "") });
  }
}

export const memberBillingController = new MemberBillingController();
