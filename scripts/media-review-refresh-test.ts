import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/services/media/MediaAssignmentReviewService.ts", import.meta.url), "utf8");
const exports: any = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require(name: string) {
  if (name.includes("httpClient")) return {
    createApiSuccess: (data: unknown) => ({ ok: true, data }),
    createApiError: (code: string, message: string, status: number) => ({ ok: false, error: { code, message, status } }),
  };
  if (name.includes("mediaAssignmentReviewUtils")) return {
    filterMediaReviewItems: (items: unknown) => items,
    sortMediaReviewItems: (items: unknown) => items,
  };
  return {};
} });
const service = new exports.MediaAssignmentReviewService();
const item = { reviewItemId: "review", assetId: "asset", status: "pending" };
service.reviewItems.set("review", item);
for (const status of [401, 403, 503]) {
  const failure = { ok: false, error: { code: "refresh_failed", message: "Refresh failed", status } };
  service.buildReviewQueueFromMediaAssets = async () => failure;
  assert.equal(await service.listReviewItems(), failure, "list must not report cached results as fresh on failure");
  assert.equal(await service.getReviewItem("review"), failure, "detail must not report cached results as fresh on failure");
}
service.buildReviewQueueFromMediaAssets = async () => ({ ok: true, data: [item] });
assert.equal((await service.listReviewItems()).data[0], item);
assert.equal((await service.getReviewItem("review")).data, item);
assert.equal((await service.getReviewItem("missing")).error.status, 404);
console.log("Media review refresh passed: authentication and service failures propagate; successful list/detail and missing-item responses remain correct. Mocked transport only.");
