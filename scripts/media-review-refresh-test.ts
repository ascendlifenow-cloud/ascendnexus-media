import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/services/media/MediaAssignmentReviewService.ts", import.meta.url), "utf8");
const exports: any = {};
let assetRequests = 0;
let intakeRequests = 0;
let assetReply: () => Promise<unknown> = async () => ({ ok: true, data: [] });
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
    shouldIncludeAssetInReviewQueue: () => true,
    buildReviewItemFromMediaAsset: (asset: any) => ({ reviewItemId: `media-review-${asset.assetId}`, assetId: asset.assetId, asset, status: "pending" }),
  };
  if (name === "../admin") return { adminMediaService: {
    listMediaAssets: () => { assetRequests++; return assetReply(); },
    listMediaIntakeRecords: async () => { intakeRequests++; return { ok: true, data: [] }; },
  }, recordMediaAuditEvent: () => {} };
  if (name.includes("MediaAssignmentEvents")) return { dispatchMediaReviewCountChanged: () => {} };
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
const concurrent = new exports.MediaAssignmentReviewService();
let finish!: (value: unknown) => void;
assetReply = () => new Promise(resolve => { finish = resolve; });
const first = concurrent.listReviewItems();
const second = concurrent.listReviewItems();
assert.equal(assetRequests, 1, "overlapping queue refreshes should share one asset request");
assert.equal(intakeRequests, 1);
concurrent.removeAssetFromReviewQueue("deleted");
finish({ ok: true, data: [{ assetId: "deleted" }, { assetId: "current" }] });
assert.equal((await first).data.length, 1);
assert.equal((await second).data[0].assetId, "current");
assetReply = async () => ({ ok: false, error: { code: "server_error", message: "Unavailable", status: 503 } });
assert.equal((await concurrent.listReviewItems()).ok, false);
assetReply = async () => ({ ok: true, data: [{ assetId: "fresh" }] });
assert.equal((await concurrent.listReviewItems()).data[0].assetId, "fresh", "completed and failed requests must release the shared refresh");
assetReply = async () => { throw new Error("Synthetic transport rejection"); };
await assert.rejects(concurrent.listReviewItems(), /Synthetic transport rejection/);
assetReply = async () => ({ ok: true, data: [] });
assert.equal((await concurrent.listReviewItems()).data.length, 0);
console.log("Media review refresh passed: failure propagation, shared in-flight requests, deletion during refresh and recovery after completion/failure/rejection. Mocked transport only.");
