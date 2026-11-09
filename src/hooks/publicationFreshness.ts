import type { QueryClient, QueryKey } from "@tanstack/react-query";

export const publicationChangedKey = "anm-publication-changed";
const authChangedKey = "anm-auth-shell-changed";
const memberRoots = new Set(["member-release-catalog", "member-song-detail"]);
const contentRoots = new Set(["public-api", "release-catalog", "song-detail", ...memberRoots]);

export const publicationRefreshOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
} as const;

export const isPublicationQuery = (key: QueryKey) => contentRoots.has(String(key[0]));

export function invalidatePublicationContent(client: QueryClient) {
  // Hidden tabs become stale now, but fetch only when visible again.
  return client.invalidateQueries({
    predicate: (query) => isPublicationQuery(query.queryKey),
    refetchType: typeof document !== "undefined" && document.visibilityState === "hidden" ? "none" : "active",
  });
}

export function announcePublicationChange(client: QueryClient) {
  void invalidatePublicationContent(client);
  try {
    // Never broadcast content, session identifiers, or permission decisions.
    window.localStorage.setItem(publicationChangedKey, `${Date.now()}-${Math.random()}`);
  } catch { /* Refresh policies still work when storage is unavailable. */ }
}

export function subscribePublicationChanges(client: QueryClient, target: Window = window) {
  const clearMemberContent = () => {
    const filters = { predicate: (query: { queryKey: QueryKey }) => memberRoots.has(String(query.queryKey[0])) };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  };
  const storage = (event: StorageEvent) => {
    if (event.key === authChangedKey || event.key === null) clearMemberContent();
    else if (event.key === publicationChangedKey) void invalidatePublicationContent(client);
  };
  target.addEventListener("storage", storage);
  target.addEventListener(authChangedKey, clearMemberContent);
  return () => {
    target.removeEventListener("storage", storage);
    target.removeEventListener(authChangedKey, clearMemberContent);
  };
}
