import assert from "node:assert/strict";
import { countPendingMediaReviewItems, dispatchMediaReviewCountChanged, mediaReviewCountChangedEventName } from "../src/services/media/MediaAssignmentEvents";

const items = Array.from({ length: 13 }, () => ({ status: "pending" }));
assert.equal(countPendingMediaReviewItems(items), 13);
for (let i = 0; i < 4; i++) items[i].status = "resolved";
assert.equal(countPendingMediaReviewItems(items), 9);
items[4].status = "in_review";
assert.equal(countPendingMediaReviewItems(items), 9);
assert.equal(countPendingMediaReviewItems([{ status: "ignored" }, { status: "archived" }, { status: "resolved" }]), 0);
const previousWindow = globalThis.window;
const target = new EventTarget();
Object.defineProperty(globalThis, "window", { value: target, configurable: true, writable: true });
try {
  let count: number | undefined;
  const listener = (event: Event) => { count = (event as CustomEvent).detail.count; };
  target.addEventListener(mediaReviewCountChangedEventName, listener);
  dispatchMediaReviewCountChanged(items);
  assert.equal(count, 9);
  items.splice(4, 1);
  dispatchMediaReviewCountChanged(items);
  assert.equal(count, 8);
  target.removeEventListener(mediaReviewCountChangedEventName, listener);
  dispatchMediaReviewCountChanged([]);
  assert.equal(count, 8);
} finally {
  if (previousWindow === undefined) Reflect.deleteProperty(globalThis, "window");
  else Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true, writable: true });
}
console.log("Media Review badge: count transitions and event subscription checks passed.");
