export interface PublicMembershipTier {
  tierKey: string;
  name: string;
  description: string;
  benefits: string[];
  availability: "available" | "coming_soon";
  billingReadiness: string;
  displayMetadata?: Record<string, unknown>;
}

const parse = async <T>(response: Response): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.errors?.[0] ?? "Membership request failed.");
  return body.data as T;
};

export const publicMembershipApiService = {
  async listTiers() {
    return parse<PublicMembershipTier[]>(await fetch("/api/public/membership/tiers", { credentials: "include" }));
  },
};
