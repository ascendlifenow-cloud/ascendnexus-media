import { mediaStorageService } from "../../services/storage";

const apiBase = (): string | undefined => mediaStorageService.getStorageConfig().uploadApiBaseUrl?.replace(/\/+$/, "");
const headers = (json = false): HeadersInit => {
  const token = (import.meta.env as Record<string, string | undefined>).VITE_MEDIA_ADMIN_DEV_TOKEN;
  return { ...(json ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<{ success: boolean; data?: T; errors?: string[] }> => {
  const base = apiBase();
  if (!base) return { success: false, errors: ["Admin export/import API is not configured."] };
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...headers(Boolean(init.body)), ...(init.headers ?? {}) }, credentials: "include" });
  const payload = await response.json().catch(() => ({}));
  return response.ok ? payload : { success: false, errors: payload.errors ?? [payload.message ?? "Export/import request failed."] };
};

export const adminExportApiService = {
  estimate: (body: unknown) => request<Record<string, unknown>>("/api/admin/exports/estimate", { method: "POST", body: JSON.stringify(body) }),
  create: (body: unknown) => request<Record<string, unknown>>("/api/admin/exports", { method: "POST", body: JSON.stringify(body) }),
  list: () => request<Record<string, unknown>[]>("/api/admin/exports"),
  get: (exportJobId: string) => request<Record<string, unknown>>(`/api/admin/exports/${encodeURIComponent(exportJobId)}`),
  authorizeDownload: (exportJobId: string) => request<Record<string, unknown>>(`/api/admin/exports/${encodeURIComponent(exportJobId)}/download-authorize`, { method: "POST", body: "{}" }),
  capabilities: () => request<Record<string, unknown>>("/api/admin/exports/capabilities"),
  securityPolicy: () => request<Record<string, unknown>>("/api/admin/exports/security-policy"),
  jobSecurity: (exportJobId: string) => request<Record<string, unknown>>(`/api/admin/exports/${encodeURIComponent(exportJobId)}/security`),
  verify: (exportJobId: string) => request<Record<string, unknown>>(`/api/admin/exports/${encodeURIComponent(exportJobId)}/verify`, { method: "POST", body: "{}" }),
  health: () => request<Record<string, unknown>>("/api/admin/exports/health"),
};

export const adminImportApiService = {
  upload: (packageData: unknown) => request<Record<string, unknown>>("/api/admin/imports/upload", { method: "POST", body: JSON.stringify({ packageData }) }),
  inspect: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/inspect`, { method: "POST", body: "{}" }),
  dryRun: (importJobId: string, body: unknown = {}) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/dry-run`, { method: "POST", body: JSON.stringify(body) }),
  execute: (importJobId: string, body: unknown = {}) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/execute`, { method: "POST", body: JSON.stringify(body) }),
  rollback: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/rollback`, { method: "POST", body: "{}" }),
  list: () => request<Record<string, unknown>[]>("/api/admin/imports"),
  get: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}`),
  conflicts: (importJobId: string) => request<Record<string, unknown>[]>(`/api/admin/imports/${encodeURIComponent(importJobId)}/conflicts`),
  verification: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/verification`),
  decrypt: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/decrypt`, { method: "POST", body: "{}" }),
  verifyIntegrity: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/verify-integrity`, { method: "POST", body: "{}" }),
  verifySignature: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/verify-signature`, { method: "POST", body: "{}" }),
  security: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/security`),
  checkpoints: (importJobId: string) => request<Record<string, unknown>>(`/api/admin/imports/${encodeURIComponent(importJobId)}/checkpoints`),
  trustedSigners: () => request<Record<string, unknown>[]>("/api/admin/imports/trusted-signers"),
};

export const adminExportImportSecurityApiService = {
  capabilities: adminExportApiService.capabilities,
  securityPolicy: adminExportApiService.securityPolicy,
  health: adminExportApiService.health,
  trustedSigners: adminImportApiService.trustedSigners,
};

export const adminExportImportCertificationApiService = {
  status: () => request<Record<string, unknown>>("/api/admin/export-import/certification"),
  run: () => request<Record<string, unknown>>("/api/admin/export-import/certification/run", { method: "POST", body: "{}" }),
};
