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
const queryClient = { invalidateQueries: async () => {} };
const memo = (factory: () => any, deps: any[]) => {
  const index = cursor++;
  if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) slots[index] = { value: factory(), deps };
  return slots[index].value;
};
const exports: any = {};
vm.runInNewContext(compiled, { exports, window: { addEventListener() {}, removeEventListener() {} }, require(name: string) {
  if (name === "react") return {
    useRef: (value: any) => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: (value: any) => { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next: any) => { writes++; slots[index] = typeof next === "function" ? next(slots[index]) : next; }]; },
    useCallback: (fn: any, deps: any[]) => memo(() => fn, deps), useMemo: memo,
    useEffect: (fn: any, deps: any[]) => { const index = cursor++; const previous = slots[index]; if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; }); },
  };
  if (name === "@tanstack/react-query") return { useQueryClient: () => queryClient };
  if (name.includes("MediaAssignmentReviewService")) return { mediaAssignmentReviewService: { listReviewItems: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } };
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
const last = render().refreshQueue();
for (const slot of slots) slot?.cleanup?.();
const before = writes;
pending[4].resolve({ ok: true, data: [{ assetId: "late" }] }); await last;
assert.equal(writes, before, "unmount must suppress late state updates");
console.log("Media Review hook passed: filter response ordering, authorization clearing, safe rejection handling and unmount cleanup. Mocked hook lifecycle only.");
