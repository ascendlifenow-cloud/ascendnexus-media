const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Billing admin request failed.");
  return payload.data as T;
};

export const adminBillingApiService = {
  overview: () => fetch("/api/admin/billing", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  health: () => fetch("/api/admin/billing/health", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  createCoupon: (code: string) => fetch("/api/admin/billing/coupons", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, percentOff: 20 }) }).then((response) => parse<Record<string, unknown>>(response)),
  revenue: () => fetch("/api/admin/billing/revenue", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  providers: () => fetch("/api/admin/billing/payment-providers", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
};

