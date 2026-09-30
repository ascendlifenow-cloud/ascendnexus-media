const envValue = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export const adminApiBase = (): string =>
  (envValue("VITE_MEDIA_UPLOAD_API_BASE_URL") ?? envValue("VITE_API_URL") ?? "").replace(/\/+$/, "");

export const adminApiUrl = (path: string): string => `${adminApiBase()}${path}`;
