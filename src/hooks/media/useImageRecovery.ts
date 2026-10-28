import { useState } from "react";

export const retryPublicImage = (source?: string) => {
  if (!source) return source;
  try {
    const url = new URL(source);
    // Never alter signed artifacts or private gateway URLs.
    if (url.protocol !== "https:" || !url.pathname.startsWith("/public/") || url.search || url.hash) return source;
    url.searchParams.set("anmImageRetry", "1");
    return url.href;
  } catch { return source; }
};

// Retry a transient image failure once, then try the approved original before using a placeholder.
export function useImageRecovery(preferred?: string, original?: string) {
  const identity = `${preferred ?? ""}\n${original ?? ""}`;
  const [failure, setFailure] = useState({ identity, count: 0 });
  const count = failure.identity === identity ? failure.count : 0;
  const hasOriginal = Boolean(original && original !== preferred);
  return {
    source: count >= 2 && hasOriginal ? original : count === 1 ? retryPublicImage(preferred) : preferred,
    exhausted: count >= (hasOriginal ? 3 : 2),
    imageKey: `${identity}:${count}`,
    recover: () => setFailure((previous) => ({ identity, count: previous.identity === identity ? previous.count + 1 : 1 })),
  };
}
