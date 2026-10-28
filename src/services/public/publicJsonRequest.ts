// Bound public reads so an unavailable API cannot leave the public shell loading indefinitely.
export async function publicJsonRequest<T>(url: string, allowMissing = false, timeoutMs = 15000): Promise<T | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 404 && allowMissing) return undefined;
    if (!response.ok) throw new Error(`Public API request failed: ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function loadArtworkSources<A, R, G>(artists: () => Promise<A[]>, releases: () => Promise<R[]>, gallery: () => Promise<G[]>) {
  const results = await Promise.allSettled([artists(), releases(), gallery()] as const);
  if (results.every((result) => result.status === "rejected")) throw new Error("Artwork sources are unavailable.");
  return {
    artists: results[0].status === "fulfilled" ? results[0].value : [],
    releases: results[1].status === "fulfilled" ? results[1].value : [],
    gallery: results[2].status === "fulfilled" ? results[2].value : [],
    partial: results.some((result) => result.status === "rejected"),
  };
}
