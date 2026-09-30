const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.[0] ?? "Certification request failed.");
  return payload.data as T;
};

export const adminMemberEcosystemCertificationApiService = {
  production: () => fetch("/api/admin/production-certification", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  member: () => fetch("/api/admin/member-certification", { credentials: "include" }).then((response) => parse<unknown>(response)),
  security: () => fetch("/api/admin/security-certification", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
  performance: () => fetch("/api/admin/performance-certification", { credentials: "include" }).then((response) => parse<Record<string, unknown>>(response)),
};

