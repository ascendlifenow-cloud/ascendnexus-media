export const isPublicSafeUrl = (url: string | undefined): boolean =>
  Boolean(url && !url.includes("private") && !url.includes("signed") && !url.includes("mockSigned") && !url.includes("token="));

export const publicSafeUrl = (url: string | undefined, fallback?: string): string | undefined =>
  isPublicSafeUrl(url) ? url : isPublicSafeUrl(fallback) ? fallback : undefined;

export const isPublishedState = (record: { status?: string; metadata?: Record<string, unknown> }): boolean => {
  const state = record.metadata?.publicationState;
  if (typeof state === "string") return state === "published" || state === "legacy_public";
  return record.status === "active" || record.status === "published";
};
