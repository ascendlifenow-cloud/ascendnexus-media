import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports: any = {};
const requests: Array<{ resolve: (value: any) => void }> = [];
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/admin/services/AdminAuthApiService.ts", import.meta.url), "utf8").replaceAll("import.meta.env", "({})"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, AbortSignal, fetch: () => new Promise(resolve => requests.push({ resolve })) });
const response = (id: string) => ({ ok: true, status: 200, json: async () => ({ success: true, data: { user: { userId: id, roles: ["admin"] }, permissions: ["admin.access"] } }) });
const service = new exports.AdminAuthApiService();
const oldSession = service.getSession();
const logout = service.logout();
requests[1].resolve(response("logout")); await logout;
requests[0].resolve(response("old"));
await assert.rejects(oldSession, /changed|expired/i);
assert.equal(service.getCachedSession(), null, "late session response must not undo logout");

const nextSession = service.getSession();
const secondLogout = service.logout();
const login = service.login("fixture@example.invalid", "synthetic-test-only");
requests[4].resolve(response("new")); await login;
requests[3].resolve(response("logout")); await secondLogout;
assert.equal(service.getCachedSession().user.userId, "new", "old logout completion must not erase a newer login");
requests[2].resolve(response("older"));
await assert.rejects(nextSession, /changed|expired/i);
assert.equal(service.getCachedSession().user.userId, "new");
console.log("Admin session races passed: late session responses cannot undo logout or replace a newer login. Mocked transport only.");
