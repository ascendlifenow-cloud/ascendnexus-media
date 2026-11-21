import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(readFileSync(new URL("../src/hooks/media/useMediaAssignmentReviewQueue.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const slots: any[] = [];
let cursor = 0;
let writes = 0;
const effects: Array<() => void> = [];
const pending: Array<{ resolve: (value: any) => void; reject: (error: Error) => void }> = [];
const invalidations: string[] = [];
const removed: string[] = [];
const listeners = new Map<string, Set<(event: any) => void>>();
class TestEvent { constructor(public type: string, public detail: any) {} }
const window = {
  addEventListener: (name: string, fn: (event: any) => void) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(fn); },
  removeEventListener: (name: string, fn: (event: any) => void) => { listeners.get(name)?.delete(fn); },
};
const emit = (name: string, detail: any) => { for (const fn of listeners.get(name) ?? []) fn(new TestEvent(name, detail)); };
const queryClient = { invalidateQueries: async ({ queryKey }: any) => { invalidations.push(JSON.stringify(queryKey)); } };
const memo = (factory: () => any, deps: any[]) => {
  const index = cursor++;
  if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) slots[index] = { value: factory(), deps };
  return slots[index].value;
};
const exports: any = {};
vm.runInNewContext(compiled, { exports, window, CustomEvent: TestEvent, require(name: string) {
  if (name === "react") return {
    useRef: (value: any) => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: (value: any) => { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next: any) => { writes++; slots[index] = typeof next === "function" ? next(slots[index]) : next; }]; },
    useCallback: (fn: any, deps: any[]) => memo(() => fn, deps), useMemo: memo,
    useEffect: (fn: any, deps: any[]) => { const index = cursor++; const previous = slots[index]; if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; }); },
  };
  if (name === "@tanstack/react-query") return { useQueryClient: () => queryClient };
  if (name.includes("MediaAssignmentReviewService")) return { mediaAssignmentReviewService: { listReviewItems: () => new Promise((resolve, reject) => pending.push({ resolve, reject })), removeAssetFromReviewQueue: (id: string) => removed.push(id) } };
  if (name.includes("MediaAssignmentEvents")) return { mediaAssignmentChangedEventName: "assignment" };
  if (name.endsWith("utils/admin")) return new Proxy({}, { get: (_target, key) => ({ all: [key], detail: (id: string) => [key, id] }) });
  if (name.includes("mediaAssignmentReviewUtils")) return { getMediaReviewQueueStats: () => ({}) };
  return {};
} });
const firstFilter = {}, secondFilter = { search: "new" };
let filter = firstFilter;
const render = () => { cursor = 0; const result = exports.useMediaAssignmentReviewQueue(filter); effects.splice(0).forEach(fn => fn()); return result; };
render();
filter = secondFilter; render();
pending[1].resolve({ ok: true, data: [{ assetId: "new" }] });
await Promise.resolve(); await Promise.resolve();
pending[0].resolve({ ok: true, data: [{ assetId: "old" }] });
await Promise.resolve(); await Promise.resolve();
assert.equal(render().items[0].assetId, "new", "late responses must not replace the current filter");
const denied = render().refreshQueue();
pending[2].resolve({ ok: false, error: { status: 401, message: "Sign in again" } }); await denied;
assert.equal(render().items.length, 0);
const rejected = render().refreshQueue();
pending[3].reject(new Error("private transport details")); await rejected;
assert.equal(render().loading, false);
assert.equal(render().error.includes("private transport"), false);
const seed = render().refreshQueue();
pending.at(-1)!.resolve({ ok: true, data: [{ assetId: "assigned" }, { assetId: "deleted" }] }); await seed;
const requestsBeforeInvalid = pending.length;
emit("assignment", {});
assert.equal(pending.length, requestsBeforeInvalid, "invalid event payload must not refresh or invalidate");
emit("assignment", { assetId: "assigned", entityType: "release", entityId: "release" });
assert.equal(render().items.length, 1, "assignment removes the row immediately");
assert.equal(removed.at(-1), "assigned");
assert.ok(invalidations.includes(JSON.stringify(["adminReleasesKeys", "release"])));
assert.equal(invalidations.some(key => key.includes("adminArtistsKeys")), false, "release assignment must not invalidate unrelated artist caches");
pending.at(-1)!.resolve({ ok: true, data: [{ assetId: "deleted" }] });
await Promise.resolve(); await Promise.resolve();
emit("anm:media-asset-hard-deleted", { assetId: "deleted" });
assert.equal(render().items.length, 0, "deletion removes the row immediately");
assert.equal(removed.at(-1), "deleted");
pending.at(-1)!.resolve({ ok: true, data: [] });
await Promise.resolve(); await Promise.resolve();
const last = render().refreshQueue();
for (const slot of slots) slot?.cleanup?.();
const before = writes;
pending.at(-1)!.resolve({ ok: true, data: [{ assetId: "late" }] }); await last;
assert.equal(writes, before, "unmount must suppress late state updates");
assert.equal([...listeners.values()].every(set => set.size === 0), true, "unmount must remove event listeners");
const requestsAfterUnmount = pending.length;
emit("assignment", { assetId: "late", entityType: "release", entityId: "release" });
assert.equal(pending.length, requestsAfterUnmount);
console.log("Media Review hook passed: response ordering, authorization clearing, safe failures, assignment/deletion events, targeted cache invalidation and unmount cleanup. Mocked hook lifecycle only.");
