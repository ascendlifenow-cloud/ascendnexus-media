import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const session = { user: { roles: ["super_admin"] }, permissions: ["admin.access"] };
let cached: any = session;
let finish!: (value: any) => void;
let resets = 0, announcements = 0;
const cancelled: any[] = [], removed: any[] = [];
const client = { cancelQueries: async (options: any) => { cancelled.push(options); }, removeQueries: (options: any) => removed.push(options) };
const service = { getCachedSession: () => cached, invalidateSession: () => { cached = null; }, getSession: () => new Promise(resolve => { finish = resolve; }), login: async () => (cached = session), logout: async () => {} };
const listeners = new Map<string, (event: any) => void>();
const slots: any[] = [];
const effects: Array<() => void> = [];
let cursor = 0;
const memo = (factory: () => any, deps: any[]) => {
  const index = cursor++;
  if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) slots[index] = { value: factory(), deps };
  return slots[index].value;
};
const exports: any = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/admin/auth/AdminAuthProvider.tsx", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, window: { addEventListener: (name: string, fn: any) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) }, require(name: string) {
  if (name === "react") return {
    useRef: (value: any) => { const index = cursor++; return slots[index] ??= { current: value }; },
    useState: (value: any) => { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next: any) => { slots[index] = next; }]; },
    useCallback: (fn: any, deps: any[]) => memo(() => fn, deps), useMemo: memo,
    useEffect: (fn: any, deps: any[]) => { const index = cursor++; const previous = slots[index]; if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) effects.push(() => { previous?.cleanup?.(); slots[index] = { deps, cleanup: fn() }; }); },
  };
  if (name === "react/jsx-runtime") return { jsx: (_type: any, props: any) => props.value };
  if (name === "@tanstack/react-query") return { useQueryClient: () => client };
  if (name.includes("AdminAuthContext")) return { AdminAuthContext: { Provider: {} } };
  if (name.includes("AdminAuthApiService")) return { adminAuthApiService: service, AdminAuthRequestError: class extends Error {} };
  if (name.includes("adminLogoutEvents")) return { adminLogoutEventKey: "admin-signout", announceAdminLogout: () => announcements++ };
  if (name.includes("MediaAssignmentReviewService")) return { mediaAssignmentReviewService: { reset: () => resets++ } };
  throw new Error(name);
} });
const render = () => { cursor = 0; const result = exports.AdminAuthProvider({ children: null }); effects.splice(0).forEach(fn => fn()); return result; };
assert.equal(render().isAuthenticated, true);
listeners.get("storage")!({ key: "member-event", newValue: "changed" });
assert.equal(render().isAuthenticated, true);
listeners.get("storage")!({ key: "admin-signout", newValue: "changed" });
assert.equal(render().isAuthenticated, false);
assert.equal(cached, null);
assert.equal(resets, 1);
assert.equal(JSON.stringify(cancelled), '[{"queryKey":["admin"]}]');
assert.equal(JSON.stringify(removed), '[{"queryKey":["admin"]}]');
finish(session); await Promise.resolve(); await Promise.resolve();
assert.equal(render().isAuthenticated, false, "late refresh cannot undo cross-tab logout");
await render().login("synthetic", "synthetic");
assert.equal(render().isAuthenticated, true);
await render().logout();
assert.equal(render().isAuthenticated, false);
assert.equal(announcements, 1);
assert.equal(resets, 2);
for (const slot of slots) slot?.cleanup?.();
assert.equal(listeners.size, 0);
const eventExports: any = {};
let stored: [string, string] | undefined;
const storage = { setItem: (key: string, value: string) => { stored = [key, value]; } };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/admin/auth/adminLogoutEvents.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: eventExports, window: { localStorage: storage } });
eventExports.announceAdminLogout();
assert.equal(stored![0], eventExports.adminLogoutEventKey);
assert.match(stored![1], /^\d+-[a-z0-9]+$/);
storage.setItem = () => { throw new Error("Storage blocked"); };
assert.doesNotThrow(() => eventExports.announceAdminLogout());
console.log("Admin sign-out lifecycle passed: isolated storage event, immediate access/cache clearing, stale response suppression, local announcement and cleanup. Mocked tabs only.");
