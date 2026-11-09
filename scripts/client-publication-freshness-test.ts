import assert from "node:assert/strict";
import { QueryClient, QueryObserver, focusManager } from "@tanstack/react-query";
import { invalidatePublicationContent, publicationChangedKey, publicationRefreshOptions, subscribePublicationChanges } from "../src/hooks/publicationFreshness";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const target = new EventTarget();
const storage = (key: string | null) => {
  const event = new Event("storage");
  Object.defineProperty(event, "key", { value: key });
  target.dispatchEvent(event);
};
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const cleanup = subscribePublicationChanges(client, target as unknown as Window);
let count = 39;
let requests = 0;
const observer = new QueryObserver(client, {
  ...publicationRefreshOptions,
  queryKey: ["release-catalog"],
  queryFn: async () => { requests++; return { count }; },
});
const states: Array<{ count?: number; pending: boolean }> = [];
const unsubscribe = observer.subscribe(result => states.push({ count: result.data?.count, pending: result.isPending }));
client.mount();
try {
  await tick();
  assert.equal(observer.getCurrentResult().data?.count, 39);
  client.setQueryData(["public-api", "landing"], { count: 39 });
  client.setQueryData(["member-release-catalog", "member", "session", 1], { count: 39 });
  client.setQueryData(["member-song-detail", "member", "session", 1, "song"], { title: "Song" });
  client.setQueryData(["unrelated"], { untouched: true });
  count = 113;
  states.length = 0;
  await invalidatePublicationContent(client);
  assert.equal(observer.getCurrentResult().data?.count, 113);
  assert.ok(states.every(state => !state.pending && state.count !== undefined), "Background refresh must keep rendered data");
  assert.equal(client.getQueryState(["public-api", "landing"])?.isInvalidated, true);
  assert.equal(client.getQueryState(["unrelated"])?.isInvalidated, false);

  count = 114;
  storage(publicationChangedKey);
  await tick();
  assert.equal(observer.getCurrentResult().data?.count, 114);
  assert.equal(client.getQueryData<{ count: number }>(["member-release-catalog", "member", "session", 1])?.count, 39, "Events must not copy public data into member caches");

  Object.defineProperty(globalThis, "document", { configurable: true, value: { visibilityState: "hidden" } });
  const beforeHidden = requests;
  count = 115;
  storage(publicationChangedKey);
  await tick();
  assert.equal(requests, beforeHidden, "Hidden tabs must not fetch on publication events");
  assert.equal(client.getQueryState(["release-catalog"])?.isInvalidated, true);
  Object.defineProperty(globalThis, "document", { configurable: true, value: { visibilityState: "visible" } });
  focusManager.setFocused(false);
  focusManager.setFocused(true);
  await tick();
  assert.equal(observer.getCurrentResult().data?.count, 115, "Returning to a stale tab refreshes it");

  let resolvePrivate!: (value: string) => void;
  const pending = client.fetchQuery({ queryKey: ["member-song-detail", "old-session"], queryFn: () => new Promise<string>(resolve => { resolvePrivate = resolve; }) }).catch(() => undefined);
  storage("anm-auth-shell-changed");
  resolvePrivate("private old-session data");
  await pending;
  assert.equal(client.getQueryCache().findAll({ queryKey: ["member-release-catalog"] }).length, 0);
  assert.equal(client.getQueryCache().findAll({ queryKey: ["member-song-detail"] }).length, 0, "Auth changes cancel in-flight private requests before eviction");
  assert.ok(client.getQueryData(["release-catalog"]));

  cleanup();
  await invalidatePublicationContent(client);
  const beforeCleanupEvent = requests;
  storage(publicationChangedKey);
  await tick();
  assert.equal(requests, beforeCleanupEvent, "Disposed listeners must do no work");
  assert.equal(publicationRefreshOptions.refetchInterval, 60_000);
  assert.equal(publicationRefreshOptions.refetchIntervalInBackground, false);
  console.log("Client publication freshness tests passed: 39 -> 113 without loading flicker, targeted invalidation, cross-tab signals, hidden-tab deferral/focus refresh, auth cancellation/eviction, listener cleanup.");
} finally {
  cleanup();
  unsubscribe();
  client.unmount();
  client.clear();
  focusManager.setFocused(undefined);
  Reflect.deleteProperty(globalThis, "document");
}
