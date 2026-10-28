import { useState } from "react";

// Retry a transient image failure once, then try the approved original before using a placeholder.
export function useImageRecovery(preferred?: string, original?: string) {
  const identity = `${preferred ?? ""}\n${original ?? ""}`;
  const [failure, setFailure] = useState({ identity, count: 0 });
  const count = failure.identity === identity ? failure.count : 0;
  const hasOriginal = Boolean(original && original !== preferred);
  return {
    source: count >= 2 && hasOriginal ? original : preferred,
    exhausted: count >= (hasOriginal ? 3 : 2),
    imageKey: `${identity}:${count}`,
    recover: () => setFailure((previous) => ({ identity, count: previous.identity === identity ? previous.count + 1 : 1 })),
  };
}
