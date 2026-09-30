const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Billing request failed.");
  return payload.data as T;
};

export const memberBillingApiService = {
  overview: () => fetch("/api/member/billing", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  plans: () => fetch("/api/member/billing/plans", { credentials: "include" }).then((response) => parse<{ plans: Array<Record<string, unknown>> }>(response)),
  checkout: (planKey: string, couponCode?: string) => fetch("/api/member/billing/checkout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planKey, couponCode }),
  }).then((response) => parse<Record<string, unknown>>(response)),
  cancel: () => fetch("/api/member/billing/cancel", { method: "POST", credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  invoices: () => fetch("/api/member/invoices", { credentials: "include" }).then((response) => parse<{ invoices: Array<Record<string, unknown>> }>(response)),
  payments: () => fetch("/api/member/billing/history", { credentials: "include" }).then((response) => parse<{ payments: Array<Record<string, unknown>> }>(response)),
};

