import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const deferred = () => { let resolve!: (value: any) => void; let reject!: (error: any) => void; const promise = new Promise<any>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; };
const flush = async () => { for (let n = 0; n < 8; n++) await Promise.resolve(); };
function mount(file: string, component: string, services: Record<string, any>, props: any = {}) {
  const exports: Record<string, any> = {};
  const slots: any[] = [];
  const listeners = new Map<string, Set<(event?: any) => void>>();
  let cursor = 0;
  let effects: Array<() => void> = [];
  const jsx = (type: any, props: any) => ({ type, props });
  const react = {
    useState(initial: any) { const key = cursor++; if (!(key in slots)) slots[key] = initial; return [slots[key], (value: any) => { slots[key] = typeof value === "function" ? value(slots[key]) : value; }]; },
    useRef(initial: any) { const key = cursor++; return slots[key] ??= { current: initial }; },
    useId() { cursor++; return "picker"; },
    useContext: () => services.portal,
    useCallback: (callback: any) => { cursor++; return callback; },
    useEffect(effect: any, deps: any[]) {
      const key = cursor++; const old = slots[key];
      if (!old || deps.some((value, index) => value !== old.deps[index])) effects.push(() => { old?.cleanup?.(); slots[key] = { deps, cleanup: effect() }; });
    },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, AbortController, AbortSignal,
    window: { addEventListener: (name: string, callback: any) => { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback); }, removeEventListener: (name: string, callback: any) => listeners.get(name)?.delete(callback) },
    require(name: string) {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "react-router-dom") return { useLocation: () => ({ pathname: "/member/playlists" }), Navigate: "Navigate", Link: "Link" };
      if (name.includes("MemberEngagementApiService")) return { memberEngagementApiService: services.engagement };
      if (name.includes("MemberDashboardApiService")) return { memberDashboardApiService: services.dashboard };
      if (name.includes("MemberAuthApiService")) return { memberAuthApiService: services.auth };
      if (name.includes("AuthenticationShellService")) return { authShellChangedEvent: "auth_changed" };
      if (name.includes("MemberPortalContext")) return { MemberPortalContext: { Provider: "Portal" } };
      if (name.includes("MemberApiError")) return { MemberApiError: Error };
      return new Proxy({}, { get: (_target, key) => String(key) });
    },
  });
  const nodes = (root: any): any[] => !root || typeof root !== "object" ? [] : Array.isArray(root) ? root.flatMap(nodes) : [root, ...nodes(root.props?.children)];
  return {
    render: () => { cursor = 0; effects = []; const result = exports[component](props); for (const effect of effects) effect(); return nodes(result); },
    changed: (storage = false) => { for (const listener of listeners.get(storage ? "storage" : "auth_changed") ?? []) listener({ key: "auth_changed" }); },
    unmount: () => { for (const slot of slots) slot?.cleanup?.(); },
  };
}
const pickerFile = "../src/member/components/engagement/AddReleaseToPlaylistButton.tsx";
const list = deferred(); const add = deferred(); let adds = 0; let refreshes = 0; let listCalls = 0; let signal: AbortSignal;
const playlist = { playlistId: "mine", name: "My Mix" };
const services = { portal: { session: { member: { memberId: "member-a" } }, refreshDashboard: async () => { refreshes++; } }, engagement: {
  playlists: (value: AbortSignal) => { listCalls++; signal = value; return list.promise; },
  addPlaylistItem: () => { adds++; return add.promise; },
} };
const picker = mount(pickerFile, "AddReleaseToPlaylistButton", services, { release: { releaseId: "song", title: "Song" } });
picker.render();
const open = picker.render().find(node => node.type === "Button").props.onClick;
open(); assert.equal(listCalls, 1); list.resolve([playlist]); await flush();
const choose = picker.render().find(node => node.type === "button" && node.props.children === "My Mix");
choose.props.onClick(); choose.props.onClick(); assert.equal(adds, 1);
add.resolve([]); await flush(); assert.equal(refreshes, 1);
assert.ok(picker.render().some(node => node.props?.role === "status" && node.props.children === "Added to My Mix"));
picker.render().find(node => node.type === "Button").props.onClick(); assert.equal(listCalls, 2, "Reopening must reload current playlists");
picker.changed(true); assert.equal(signal!.aborted, true); await flush();
assert.equal(picker.render().some(node => node.props?.["aria-label"] === "Choose a playlist"), false); picker.unmount();
for (const stage of ["list", "add"]) {
  const pending = deferred(); let refresh = 0;
  const stale = mount(pickerFile, "AddReleaseToPlaylistButton", { portal: { session: { member: { memberId: "a" } }, refreshDashboard: async () => { refresh++; } }, engagement: { playlists: () => stage === "list" ? pending.promise : Promise.resolve([playlist]), addPlaylistItem: () => pending.promise } }, { release: { releaseId: "song", title: "Song" } });
  stale.render(); stale.render().find(node => node.type === "Button").props.onClick(); await flush();
  if (stage === "add") stale.render().find(node => node.type === "button").props.onClick();
  stale.changed(); pending.resolve([playlist]); await flush();
  assert.equal(refresh, 0, "Stale save must not refresh another account");
  assert.equal(stale.render().some(node => node.props?.role === "status"), false); stale.unmount();
}
const old = deferred(); const newer = deferred(); let requests = 0;
const guard = mount("../src/member/guards/MemberRouteGuard.tsx", "MemberRouteGuard", { auth: { session: async () => ({ member: { memberId: "a", status: "Active" } }) }, dashboard: { dashboard: () => ++requests === 1 ? Promise.resolve({ marker: "initial" }) : requests === 2 ? old.promise : newer.promise } }, { children: "member content" });
guard.render(); await flush();
const refresh = guard.render().find(node => node.type === "Portal").props.value.refreshDashboard;
const first = refresh(); const second = refresh(); newer.resolve({ marker: "new" }); await second; old.resolve({ marker: "old" }); await first;
assert.equal(guard.render().find(node => node.type === "Portal").props.value.dashboard.marker, "new", "Out-of-order refresh must not overwrite newer data");
guard.changed(true); assert.equal(guard.render().some(node => node.type === "Portal"), false, "Account change removes private content before rehydration"); guard.unmount();
console.log("Member playlist lifecycle passed: fresh lists, duplicate-click guard, dashboard refresh, cross-tab/logout cleanup, stale-response suppression and ordered private dashboard updates. Mocked lifecycle, not browser E2E.");
