import type { IncomingMessage, ServerResponse } from "node:http";
import { adminBillingController } from "../controllers/adminBillingController";
import { memberBillingController } from "../controllers/memberBillingController";

export const handleBillingRoute = async (request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> => {
  const method = request.method ?? "GET";
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (method === "GET" && (path === "/api/member/billing" || path === "/api/member/subscription")) return memberBillingController.overview(request, response).then(() => true);
  if (method === "GET" && path === "/api/member/billing/plans") return memberBillingController.plans(request, response).then(() => true);
  if (method === "POST" && path === "/api/member/billing/checkout") return memberBillingController.checkout(request, response).then(() => true);
  if (method === "POST" && path === "/api/member/billing/cancel") return memberBillingController.cancel(request, response).then(() => true);
  if (method === "GET" && (path === "/api/member/invoices" || path === "/api/member/receipts")) return memberBillingController.invoices(request, response).then(() => true);
  if (method === "GET" && (path === "/api/member/payment-methods" || path === "/api/member/billing/history")) return memberBillingController.payments(request, response).then(() => true);
  if (method === "POST" && path === "/api/member/billing/gifts/redeem") return memberBillingController.redeemGift(request, response).then(() => true);

  if (method === "GET" && path === "/api/admin/billing") return adminBillingController.overview(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/billing/health") return adminBillingController.health(request, response).then(() => true);
  if (method === "GET" && path === "/api/admin/billing/plans") return adminBillingController.plans(request, response).then(() => true);
  if (method === "GET" && (path === "/api/admin/subscriptions" || path === "/api/admin/billing/subscriptions")) return adminBillingController.subscriptions(request, response, url).then(() => true);
  if ((method === "GET" || method === "POST") && (path === "/api/admin/coupons" || path === "/api/admin/billing/coupons")) return adminBillingController.coupons(request, response).then(() => true);
  if ((method === "GET" || method === "POST") && (path === "/api/admin/promotions" || path === "/api/admin/billing/promotions")) return adminBillingController.promotions(request, response).then(() => true);
  if ((method === "GET" || method === "POST") && (path === "/api/admin/gifts" || path === "/api/admin/billing/gifts")) return adminBillingController.gifts(request, response).then(() => true);
  if (method === "POST" && (path === "/api/admin/refunds" || path === "/api/admin/billing/refunds")) return adminBillingController.refund(request, response).then(() => true);
  if (method === "GET" && (path === "/api/admin/revenue" || path === "/api/admin/billing/revenue")) return adminBillingController.revenue(request, response).then(() => true);
  if (method === "GET" && (path === "/api/admin/payment-providers" || path === "/api/admin/billing/payment-providers")) return adminBillingController.providers(request, response).then(() => true);
  const webhookMatch = /^\/api\/billing\/webhooks\/(stripe|manual|test)$/.exec(path);
  if (method === "POST" && webhookMatch) return adminBillingController.webhook(request, response, webhookMatch[1] as never).then(() => true);

  return false;
};
